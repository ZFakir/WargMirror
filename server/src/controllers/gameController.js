const { sequelize, Waypoint, WaypointEdge, Minigame, GameSession, WaypointProgress, MinigameAttempt, LocationEvent, User } = require('../models');
const badgeService = require('../services/badgeService');
const demoService = require('../services/demoService');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

/**
 * Shared answer evaluation for text_answer (plain + MCQ) and qr_barcode.
 */
function evaluateSyncMinigameSubmission(game, submission) {
  const config = game.config_json || {};
  if (game.game_type === 'text_answer') {
    if (config.is_mcq) {
      const submittedIndex = parseInt(submission, 10);
      const correctText = Array.isArray(config.options)
        ? String(config.options[config.correct_index] ?? '').toLowerCase().trim()
        : null;
      const submittedText = String(submission ?? '').toLowerCase().trim();
      if ((!isNaN(submittedIndex) && submittedIndex === config.correct_index) ||
          (correctText && submittedText === correctText)) {
        return 'pass';
      }
      return 'fail';
    }
    const correctAns = (config.answer || '').toLowerCase().trim();
    const userAns = (submission || '').toLowerCase().trim();
    return (correctAns && userAns === correctAns) ? 'pass' : 'fail';
  }
  if (game.game_type === 'qr_barcode') {
    const correctCode = config.barcode_value || '';
    return (correctCode && submission === correctCode) ? 'pass' : 'fail';
  }
  return 'fail';
}

// Helper to evaluate branching conditions
exports.evaluateConditions = async (user_id, rawConditions, transaction = null) => {
  let conditions = rawConditions;
  if (typeof conditions === 'string') {
    try { conditions = JSON.parse(conditions); } catch { /* ignore parse error */ }
  }

  if (!conditions || !Array.isArray(conditions) || conditions.length === 0) {
    return true; // Unconditional edge
  }
  
  // Group outcomes by game_id to treat multiple outcomes for the same game as OR
  const groupedConditions = {};
  for (const cond of conditions) {
    if (!groupedConditions[cond.game_id]) {
      groupedConditions[cond.game_id] = [];
    }
    groupedConditions[cond.game_id].push(cond.outcome);
  }

  for (const [game_id, allowedOutcomes] of Object.entries(groupedConditions)) {
    const findOpts = {
      where: { user_id, game_id },
      order: [['attempted_at', 'DESC']]
    };
    if (transaction) findOpts.transaction = transaction;
    const attempt = await MinigameAttempt.findOne(findOpts);
    
    if (!attempt || !allowedOutcomes.includes(attempt.outcome)) {
      return false; // Condition not met
    }
  }
  return true;
};

// Start or resume a game session
exports.startGameSession = async (req, res) => {
  if (req.isDemoGuest) {
    try {
      const arg_id = req.params.argId;
      let demoData = demoService.getDemoSession(req, arg_id);
      const nowIso = new Date().toISOString();

      if (!demoData) {
        const edges = await WaypointEdge.findAll({ where: { arg_id } });
        const toNodes = new Set(edges.map(e => e.to_waypoint_id));
        const allWaypoints = await Waypoint.findAll({ where: { arg_id } });
        const rootNodes = allWaypoints.filter(w => !toNodes.has(w.waypoint_id));
        const roots = rootNodes.length > 0 ? rootNodes : allWaypoints;

        const progress = {};
        allWaypoints.forEach(w => {
          const isRoot = roots.some(r => r.waypoint_id === w.waypoint_id);
          progress[String(w.waypoint_id)] = {
            waypoint_id: w.waypoint_id,
            status: isRoot ? 'unlocked' : 'locked',
            unlocked_at: isRoot ? nowIso : null,
            completed_at: null
          };
        });

        demoData = {
          session: {
            user_id: null,
            arg_id: Number(arg_id),
            status: 'active',
            started_at: nowIso,
            completed_at: null,
            last_active_at: nowIso,
            total_points_earned: 0,
            distance_m: 0,
            is_demo: true
          },
          progress,
          attempts: {},
          lastLocation: null
        };
        demoService.setDemoSession(req, arg_id, demoData);
      } else if (demoData.session && demoData.session.status === 'abandoned') {
        demoData.session.status = 'active';
        demoData.session.last_active_at = nowIso;
      }

      await demoService.saveReqSession(req);
      return res.json(demoData.session);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to start demo session' });
    }
  }

  const transaction = await sequelize.transaction();
  try {
    const user_id = req.user.user_id;
    const arg_id = req.params.argId;

    let session = await GameSession.findOne({ where: { user_id, arg_id }, transaction });
    
    if (!session) {
      // Create new session
      session = await GameSession.create({ user_id, arg_id, status: 'active' }, { transaction });
      
      // Initialize WaypointProgress
      const edges = await WaypointEdge.findAll({ where: { arg_id }, transaction });
      const toNodes = new Set(edges.map(e => e.to_waypoint_id));
      
      const allWaypoints = await Waypoint.findAll({ where: { arg_id }, transaction });
      const rootNodes = allWaypoints.filter(w => !toNodes.has(w.waypoint_id));
      // If there are no edges, all waypoints are roots
      const roots = rootNodes.length > 0 ? rootNodes : allWaypoints;
      
      const progressPromises = allWaypoints.map(w => {
        const isRoot = roots.some(r => r.waypoint_id === w.waypoint_id);
        return WaypointProgress.create({
          user_id,
          waypoint_id: w.waypoint_id,
          status: isRoot ? 'unlocked' : 'locked',
          unlocked_at: isRoot ? new Date() : null
        }, { transaction });
      });
      await Promise.all(progressPromises);
    } else if (session.status === 'abandoned') {
      await session.update({ status: 'active' }, { transaction });
    }
    
    await transaction.commit();
    res.json(session);
  } catch (error) {
    await transaction.rollback();
    console.error(error);
    res.status(500).json({ error: 'Failed to start game session' });
  }
};

// Get the full game state for a player
exports.getGameState = async (req, res) => {
  try {
    if (req.isDemoGuest) {
      const arg_id = req.params.argId;
      const demoData = demoService.getDemoSession(req, arg_id);
      if (!demoData) return res.status(404).json({ error: 'Session not found' });

      const waypoints = await Waypoint.findAll({
        where: { arg_id },
        include: [{ model: Minigame }]
      });
      const edges = await WaypointEdge.findAll({ where: { arg_id } });

      let mutated = false;
      if (demoData.session.status === 'active' && waypoints.length > 0) {
        let hasUnlocked = waypoints.some(w => {
          const prog = demoData.progress[String(w.waypoint_id)];
          return prog && prog.status === 'unlocked';
        });

        if (!hasUnlocked) {
          const toNodes = new Set(edges.map(e => e.to_waypoint_id));
          const rootNodes = waypoints.filter(w => !toNodes.has(w.waypoint_id));
          const roots = rootNodes.length > 0 ? rootNodes : waypoints;
          const nowIso = new Date().toISOString();

          for (const w of roots) {
            const key = String(w.waypoint_id);
            const existing = demoData.progress[key];
            if (existing && (existing.status === 'completed' || existing.status === 'failed')) {
              continue;
            }
            demoData.progress[key] = {
              waypoint_id: w.waypoint_id,
              status: 'unlocked',
              unlocked_at: nowIso,
              completed_at: null
            };
            hasUnlocked = true;
            mutated = true;
          }

          const hasFinishedNode = waypoints.some(w => {
            const prog = demoData.progress[String(w.waypoint_id)];
            return prog && (prog.status === 'completed' || prog.status === 'failed');
          });
          if (!hasUnlocked && hasFinishedNode) {
            demoData.session.status = 'completed';
            demoData.session.completed_at = nowIso;
            mutated = true;
          }
        }
      }

      if (mutated) {
        await demoService.saveReqSession(req);
      }

      return res.json({
        session: demoData.session,
        waypoints,
        progress: Object.values(demoData.progress),
        attempts: Object.values(demoData.attempts || {}),
        edges,
        is_demo: true
      });
    }

    const user_id = req.user.user_id;
    const arg_id = req.params.argId;

    const session = await GameSession.findOne({ where: { user_id, arg_id } });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    // We need Waypoints to join progress
    const waypoints = await Waypoint.findAll({ 
      where: { arg_id },
      include: [
        { model: Minigame }
      ]
    });
    
    const waypointIds = waypoints.map(w => w.waypoint_id);

    const progress = await WaypointProgress.findAll({
      where: { user_id, waypoint_id: waypointIds }
    });
    
    const attempts = await MinigameAttempt.findAll({
      where: { user_id }
    });

    const edges = await WaypointEdge.findAll({ where: { arg_id } });

    // Dynamic Start Node Allocation / Lockout Prevention
    if (session.status === 'active' && waypoints.length > 0) {
      let hasUnlocked = progress.some(p => p.status === 'unlocked');
      
      if (!hasUnlocked) {
        const toNodes = new Set(edges.map(e => e.to_waypoint_id));
        const rootNodes = waypoints.filter(w => !toNodes.has(w.waypoint_id));
        const roots = rootNodes.length > 0 ? rootNodes : waypoints;
        
        const newProgressPromises = roots.map(async w => {
          const existing = progress.find(p => p.waypoint_id === w.waypoint_id);
          if (existing && (existing.status === 'completed' || existing.status === 'failed')) {
            return;
          }
          
          if (existing) {
            existing.status = 'unlocked';
            existing.unlocked_at = new Date();
            await existing.save();
            hasUnlocked = true;
          } else {
            const newProg = await WaypointProgress.create({
              user_id,
              waypoint_id: w.waypoint_id,
              status: 'unlocked',
              unlocked_at: new Date()
            });
            progress.push(newProg);
            hasUnlocked = true;
          }
        });
        await Promise.all(newProgressPromises);

        // If STILL no unlocked nodes and they have completed nodes, the game is actually over!
        if (!hasUnlocked && progress.some(p => p.status === 'completed' || p.status === 'failed')) {
          session.status = 'completed';
          session.completed_at = new Date();
          await session.save();
        }
      }
    }

    res.json({ session, waypoints, progress, attempts, edges });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch game state' });
  }
};

// Arrive at a waypoint (Geofence check)
exports.arriveAtWaypoint = async (req, res) => {
  try {
    const waypoint_id = req.params.waypointId;
    const { lat, lng, accuracy_m } = req.body;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ error: 'Missing coordinates' });
    }

    // Coordinates are used to build WKT for SQL — only accept finite numbers
    // within valid geographic ranges so the value can never break out of the literal.
    if (!Number.isFinite(lat) || !Number.isFinite(lng) ||
        Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    const pointWkt = `POINT(${lat} ${lng})`;

    const waypoint = await Waypoint.findByPk(waypoint_id);
    if (!waypoint) return res.status(404).json({ error: 'Waypoint not found' });

    if (req.isDemoGuest) {
      const [result] = await sequelize.query(`
        SELECT ST_Distance_Sphere(location, ST_GeomFromText(:point_wkt, 4326)) AS distance
        FROM waypoints WHERE waypoint_id = :waypoint_id
      `, {
        replacements: { waypoint_id, point_wkt: pointWkt },
        type: sequelize.QueryTypes.SELECT
      });

      const distance = result ? result.distance : Infinity;
      const within_radius = distance <= waypoint.validation_radius_m;

      const targetArgId = req.params.argId || waypoint.arg_id;
      const demoData = targetArgId ? demoService.getDemoSession(req, targetArgId) : null;
      if (demoData) {
        demoData.lastLocation = {
          lat,
          lng,
          accuracy_m: accuracy_m || null,
          recorded_at: new Date().toISOString()
        };
        await demoService.saveReqSession(req);
      }

      return res.json({ within_radius, distance, radius: waypoint.validation_radius_m });
    }

    const user_id = req.user.user_id;

    // Log location event
    await LocationEvent.create({
      user_id,
      location: sequelize.fn('ST_GeomFromText', pointWkt, 4326),
      accuracy_m: accuracy_m || null
    });

    // Run spatial query for distance
    const [result] = await sequelize.query(`
      SELECT ST_Distance_Sphere(location, ST_GeomFromText(:point_wkt, 4326)) AS distance
      FROM waypoints WHERE waypoint_id = :waypoint_id
    `, {
      replacements: { waypoint_id, point_wkt: pointWkt },
      type: sequelize.QueryTypes.SELECT
    });

    const distance = result ? result.distance : Infinity;
    const within_radius = distance <= waypoint.validation_radius_m;

    res.json({ within_radius, distance, radius: waypoint.validation_radius_m });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to process arrival' });
  }
};

// Submit a minigame
exports.submitMinigame = async (req, res) => {
  if (req.isDemoGuest) {
    try {
      const { game_id, submission } = req.body;
      const game = await Minigame.findByPk(game_id, {
        include: [{ model: Waypoint }]
      });
      if (!game) {
        return res.status(404).json({ error: 'Minigame not found' });
      }

      const waypoint_id = game.waypoint_id;
      const arg_id = game.Waypoint ? game.Waypoint.arg_id : req.params.argId;

      const demoData = demoService.getDemoSession(req, arg_id);
      if (!demoData || !demoData.session || demoData.session.status !== 'active') {
        return res.status(403).json({ error: 'No active session for this WARG. Start the game before submitting.' });
      }

      const wpProg = demoData.progress[String(waypoint_id)];
      if (!wpProg || wpProg.status === 'locked') {
        return res.status(403).json({ error: 'Waypoint is locked. Complete the previous waypoints first.' });
      }

      let outcome = 'fail';
      const config = game.config_json || {};

      if (game.game_type === 'gps_proximity') {
        if (demoData.lastLocation && Number.isFinite(demoData.lastLocation.lat) && Number.isFinite(demoData.lastLocation.lng)) {
          const pointWkt = `POINT(${demoData.lastLocation.lat} ${demoData.lastLocation.lng})`;
          const [distResult] = await sequelize.query(`
            SELECT ST_Distance_Sphere(location, ST_GeomFromText(:point_wkt, 4326)) AS distance
            FROM waypoints WHERE waypoint_id = :waypoint_id
          `, {
            replacements: { waypoint_id, point_wkt: pointWkt },
            type: sequelize.QueryTypes.SELECT
          });
          const distance = distResult ? distResult.distance : null;
          const radius = game.Waypoint ? game.Waypoint.validation_radius_m : null;
          if (distance !== null && radius !== null && distance <= radius) {
            outcome = 'pass';
          }
        }
      } else {
        outcome = evaluateSyncMinigameSubmission(game, submission);
      }

      const nowIso = new Date().toISOString();
      if (!demoData.attempts) demoData.attempts = {};
      demoData.attempts[String(game_id)] = {
        user_id: null,
        game_id,
        outcome,
        submission_json: submission,
        score: outcome === 'pass' ? 1.0 : 0.0,
        attempted_at: nowIso
      };

      const can_retry = Boolean(outcome === 'fail' && config.allow_multiple_attempts);
      const finalStatus = outcome === 'pass' ? 'completed' : 'failed';

      demoData.progress[String(waypoint_id)] = {
        waypoint_id,
        status: finalStatus,
        unlocked_at: wpProg.unlocked_at || nowIso,
        completed_at: nowIso
      };

      const unlockedNodes = [];
      const edges = await WaypointEdge.findAll({ where: { from_waypoint_id: waypoint_id } });
      for (const edge of edges) {
        if (demoService.evaluateDemoConditions(demoData, edge.conditions_json)) {
          const existingSucc = demoData.progress[String(edge.to_waypoint_id)] || {};
          demoData.progress[String(edge.to_waypoint_id)] = {
            waypoint_id: edge.to_waypoint_id,
            status: 'unlocked',
            unlocked_at: nowIso,
            completed_at: existingSucc.completed_at || null
          };
          unlockedNodes.push(edge.to_waypoint_id);
        }
      }

      const argWaypoints = await Waypoint.findAll({ where: { arg_id }, attributes: ['waypoint_id'] });
      const argWpIds = argWaypoints.map(w => w.waypoint_id);
      const sessionProgress = argWpIds.map(id => demoData.progress[String(id)]).filter(Boolean);
      const hasUnlocked = sessionProgress.some(p => p.status === 'unlocked');
      let session_completed = false;

      if (!hasUnlocked && sessionProgress.length > 0 && sessionProgress.length === argWpIds.length && sessionProgress.every(p => p.status === 'completed' || p.status === 'failed')) {
        if (!(outcome === 'fail' && can_retry && unlockedNodes.length === 0)) {
          session_completed = true;
          demoData.session.status = 'completed';
          demoData.session.completed_at = nowIso;
        }
      }

      demoData.session.last_active_at = nowIso;
      await demoService.saveReqSession(req);

      return res.json({ outcome, can_retry, unlockedNodes, session_completed, nodeStatus: finalStatus });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Failed to submit minigame' });
    }
  }

  const transaction = await sequelize.transaction();
  try {
    const user_id = req.user.user_id;
    const { game_id, submission, geofence_override } = req.body;

    const game = await Minigame.findByPk(game_id, { 
      include: [{ model: Waypoint }],
      transaction 
    });
    if (!game) {
       await transaction.rollback();
       return res.status(404).json({ error: 'Minigame not found' });
    }

    const waypoint_id = game.waypoint_id;
    const arg_id = game.Waypoint ? game.Waypoint.arg_id : null;

    // ── Security: submissions require an active session for this WARG ──
    // Without this a raw API call could complete waypoints without ever playing.
    const activeSession = await GameSession.findOne({
      where: { user_id, arg_id, status: 'active' },
      transaction
    });
    if (!activeSession) {
      await transaction.rollback();
      return res.status(403).json({ error: 'No active session for this WARG. Start the game before submitting.' });
    }

    // ── Security: the waypoint must have been unlocked through progression ──
    // (Root waypoints are unlocked by startGameSession; successors by passing edges.)
    const waypointProgress = await WaypointProgress.findOne({
      where: { user_id, waypoint_id },
      transaction
    });
    if (!waypointProgress || waypointProgress.status === 'locked') {
      await transaction.rollback();
      return res.status(403).json({ error: 'Waypoint is locked. Complete the previous waypoints first.' });
    }

    // Validate submission based on game type
    let outcome = 'fail';
    let config = game.config_json || {};

    if (game.game_type === 'gps_proximity') {
      // Defense-in-depth: confirm the player's last trusted location is inside the
      // waypoint's geofence. The geofence_override flag is honoured ONLY for
      // authenticated admin users (a testing convenience) — never for players —
      // and every use is logged so it stays auditable.
      const isAdminOverride = geofence_override === true && req.user && req.user.role === 'admin';
      if (isAdminOverride) {
        console.warn(`[DEV OVERRIDE] Admin user ${user_id} bypassed the geofence for minigame ${game_id}`);
        outcome = 'pass';
      } else {
        const lastTrustedEvent = await LocationEvent.findOne({
          where: { user_id, is_suspicious: false },
          order: [['recorded_at', 'DESC']],
          transaction
        });
        if (lastTrustedEvent) {
          // Compare the stored geometries directly — same convention /arrive uses.
          const [distResult] = await sequelize.query(`
            SELECT ST_Distance_Sphere(w.location, le.location) AS distance
            FROM waypoints w
            JOIN location_events le ON le.event_id = :event_id
            WHERE w.waypoint_id = :waypoint_id
          `, {
            replacements: { waypoint_id, event_id: lastTrustedEvent.event_id },
            type: sequelize.QueryTypes.SELECT,
            transaction
          });
          const distance = distResult ? distResult.distance : null;
          const radius = game.Waypoint ? game.Waypoint.validation_radius_m : null;
          if (distance !== null && radius !== null && distance <= radius) {
            outcome = 'pass';
          }
        }
      }
    } else {
      outcome = evaluateSyncMinigameSubmission(game, submission);
    }

    // Upsert MinigameAttempt
    await MinigameAttempt.upsert({
      user_id,
      game_id,
      outcome,
      submission_json: submission,
      score: outcome === 'pass' ? 1.0 : 0.0,
      attempted_at: new Date()
    }, { transaction });

    const can_retry = Boolean(outcome === 'fail' && config.allow_multiple_attempts);
    let unlockedNodes = [];

    const finalStatus = outcome === 'pass' ? 'completed' : 'failed';

    // Always update waypoint progress regardless of pass or fail
    await WaypointProgress.upsert({
      user_id,
      waypoint_id,
      status: finalStatus,
      completed_at: new Date()
    }, { transaction });

    // Evaluate successors. Branching logic handles whether pass or fail triggers specific edges.
    const edges = await WaypointEdge.findAll({ where: { from_waypoint_id: waypoint_id }, transaction });
    
    for (const edge of edges) {
      const canUnlock = await exports.evaluateConditions(user_id, edge.conditions_json, transaction);
      if (canUnlock) {
        await WaypointProgress.upsert({
          user_id,
          waypoint_id: edge.to_waypoint_id,
          status: 'unlocked',
          unlocked_at: new Date()
        }, { transaction });
        unlockedNodes.push(edge.to_waypoint_id);
      }
    }

    // Check if session is completed
    // Find all waypoints that are 'unlocked' but not 'completed'
    const activeProgress = await WaypointProgress.findAll({
      where: { user_id },
      transaction
    });
    
    // Filter active progress to just this ARG's waypoints
    const argWaypoints = await Waypoint.findAll({ where: { arg_id }, attributes: ['waypoint_id'], transaction });
    const argWpIds = argWaypoints.map(w => w.waypoint_id);
    
    const sessionProgress = activeProgress.filter(p => argWpIds.includes(p.waypoint_id));
    const hasUnlocked = sessionProgress.some(p => p.status === 'unlocked');
    let session_completed = false;
    
    if (!hasUnlocked && sessionProgress.length > 0 && sessionProgress.length === argWpIds.length && sessionProgress.every(p => p.status === 'completed' || p.status === 'failed')) {
      if (!(outcome === 'fail' && can_retry && unlockedNodes.length === 0)) {
        session_completed = true;
        await GameSession.update({ status: 'completed', completed_at: new Date() }, {
          where: { user_id, arg_id },
          transaction
        });
      }
    }

    // NOTE: no points are awarded here on purpose — the points economy is
    // planned around PvP games, which are not implemented yet, so the
    // total_points / total_points_earned columns stay untouched.
    await transaction.commit();
    badgeService.evaluateAndAwardBadges(user_id).catch(() => {});

    res.json({ outcome, can_retry, unlockedNodes, session_completed, nodeStatus: finalStatus });
  } catch (error) {
    await transaction.rollback();
    console.error(error);
    res.status(500).json({ error: 'Failed to submit minigame' });
  }
};

// Abandon Session
exports.abandonSession = async (req, res) => {
  try {
    const arg_id = req.params.argId;

    if (req.isDemoGuest) {
      const demoData = demoService.getDemoSession(req, arg_id);
      if (demoData && demoData.session) {
        demoData.session.status = 'abandoned';
        demoData.session.last_active_at = new Date().toISOString();
        await demoService.saveReqSession(req);
      }
      return res.json({ success: true });
    }

    const user_id = req.user.user_id;

    await GameSession.update({ status: 'abandoned' }, {
      where: { user_id, arg_id }
    });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to abandon session' });
  }
};

// Reset Session (Replay ARG)
exports.resetSession = async (req, res) => {
  if (req.isDemoGuest) {
    try {
      const arg_id = req.params.argId;
      const demoData = demoService.getDemoSession(req, arg_id);
      if (!demoData) {
        return res.status(404).json({ error: 'Session not found' });
      }
      const nowIso = new Date().toISOString();
      demoData.progress = {};
      demoData.attempts = {};
      demoData.lastLocation = null;
      demoData.session.status = 'active';
      demoData.session.started_at = nowIso;
      demoData.session.completed_at = null;
      demoData.session.total_points_earned = 0;
      demoData.session.distance_m = 0;
      demoData.session.last_active_at = nowIso;
      await demoService.saveReqSession(req);
      return res.json({ success: true });
    } catch (error) {
      console.error('Reset Demo Session Error:', error);
      return res.status(500).json({ error: 'Failed to reset session' });
    }
  }

  const transaction = await sequelize.transaction();
  try {
    const user_id = req.user.user_id;
    const arg_id = req.params.argId;

    const session = await GameSession.findOne({
      where: { user_id, arg_id },
      transaction
    });

    if (!session) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Session not found' });
    }

    // 1. Fetch waypoints and minigames to know what to delete
    const waypoints = await Waypoint.findAll({
      where: { arg_id },
      attributes: ['waypoint_id'],
      transaction
    });
    
    const waypointIds = waypoints.map(w => w.waypoint_id);

    if (waypointIds.length > 0) {
      const minigames = await Minigame.findAll({
        where: { waypoint_id: waypointIds },
        attributes: ['game_id'],
        transaction
      });
      const minigameIds = minigames.map(m => m.game_id);

      // 2. Delete Minigame Attempts
      if (minigameIds.length > 0) {
        await MinigameAttempt.destroy({
          where: { user_id, game_id: minigameIds },
          transaction
        });
      }

      // 3. Delete Waypoint Progress
      await WaypointProgress.destroy({
        where: { user_id, waypoint_id: waypointIds },
        transaction
      });
    }

    // 4. Reset Game Session
    await session.update({
      status: 'active',
      started_at: new Date(),
      completed_at: null,
      total_points_earned: 0,
      distance_m: 0,
      last_active_at: new Date()
    }, { transaction });

    await transaction.commit();
    res.json({ success: true });
  } catch (error) {
    await transaction.rollback();
    console.error('Reset Session Error:', error);
    res.status(500).json({ error: 'Failed to reset session' });
  }
};

// Point Domination: Handle location ping
exports.dominationPing = async (req, res) => {
  if (req.isDemoGuest) {
    try {
      const waypoint_id = req.params.waypointId;
      const { lat, lng, game_id } = req.body;

      if (lat === undefined || lng === undefined || !game_id) {
        return res.status(400).json({ error: 'Missing parameters' });
      }
      if (!Number.isFinite(lat) || !Number.isFinite(lng) ||
          Math.abs(lat) > 90 || Math.abs(lng) > 180) {
        return res.status(400).json({ error: 'Invalid coordinates' });
      }

      const pointWkt = `POINT(${lat} ${lng})`;
      const waypoint = await Waypoint.findByPk(waypoint_id);
      const minigame = await Minigame.findByPk(game_id);
      if (!waypoint || !minigame || minigame.game_type !== 'point_domination') {
        return res.status(400).json({ error: 'Invalid waypoint or minigame' });
      }

      const [result] = await sequelize.query(`
        SELECT ST_Distance_Sphere(location, ST_GeomFromText(:point_wkt, 4326)) AS distance
        FROM waypoints WHERE waypoint_id = :waypoint_id
      `, {
        replacements: { waypoint_id, point_wkt: pointWkt },
        type: sequelize.QueryTypes.SELECT
      });

      const distance = result ? result.distance : Infinity;
      const within_radius = distance <= waypoint.validation_radius_m;

      const arg_id = req.params.argId || waypoint.arg_id;
      const demoData = demoService.getDemoSession(req, arg_id);
      const existingAttempt = demoData && demoData.attempts ? demoData.attempts[String(game_id)] : null;
      const submissionData = existingAttempt && existingAttempt.submission_json
        ? { ...existingAttempt.submission_json }
        : { cumulative_time_hours: 0, top_score_time_hours: 0, last_ping_at: null };

      const now = new Date();
      if (within_radius) {
        if (submissionData.last_ping_at) {
          const timeDiffMs = now.getTime() - new Date(submissionData.last_ping_at).getTime();
          if (timeDiffMs > 0 && timeDiffMs < 1000 * 60 * 5) {
            submissionData.cumulative_time_hours += timeDiffMs / (1000 * 60 * 60);
          }
        }
        submissionData.last_ping_at = now.toISOString();
      } else {
        submissionData.last_ping_at = null;
      }

      if (demoData) {
        if (!demoData.attempts) demoData.attempts = {};
        demoData.attempts[String(game_id)] = {
          user_id: null,
          game_id,
          outcome: 'pass',
          submission_json: submissionData,
          score: 1.0,
          attempted_at: now.toISOString()
        };
        await demoService.saveReqSession(req);
      }

      return res.json({ success: true, within_radius, submissionData });
    } catch (error) {
      console.error('Demo Ping Error:', error);
      return res.status(500).json({ error: 'Failed to process domination ping' });
    }
  }

  const transaction = await sequelize.transaction();
  try {
    const user_id = req.user.user_id;
    const waypoint_id = req.params.waypointId;
    const { lat, lng, accuracy_m, game_id } = req.body;

    if (lat === undefined || lng === undefined || !game_id) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Missing parameters' });
    }

    // Coordinates are used to build WKT for SQL — only accept finite numbers
    // within valid geographic ranges so the value can never break out of the literal.
    if (!Number.isFinite(lat) || !Number.isFinite(lng) ||
        Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    const pointWkt = `POINT(${lat} ${lng})`;

    const waypoint = await Waypoint.findByPk(waypoint_id, { transaction });
    const minigame = await Minigame.findByPk(game_id, { transaction });

    if (!waypoint || !minigame || minigame.game_type !== 'point_domination') {
      await transaction.rollback();
      return res.status(400).json({ error: 'Invalid waypoint or minigame' });
    }

    // Log location event (optional)
    await LocationEvent.create({
      user_id,
      location: sequelize.fn('ST_GeomFromText', pointWkt, 4326),
      accuracy_m: accuracy_m || null
    }, { transaction });

    // Distance check — pointWkt is built only from validated numbers and bound
    // as a replacement, so the raw coordinate strings never reach SQL text.
    const [result] = await sequelize.query(`
      SELECT ST_Distance_Sphere(location, ST_GeomFromText(:point_wkt, 4326)) AS distance
      FROM waypoints WHERE waypoint_id = :waypoint_id
    `, {
      replacements: { waypoint_id, point_wkt: pointWkt },
      type: sequelize.QueryTypes.SELECT,
      transaction
    });

    const distance = result ? result.distance : Infinity;
    const within_radius = distance <= waypoint.validation_radius_m;

    let attempt = await MinigameAttempt.findOne({ where: { user_id, game_id }, transaction });
    let submissionData = attempt && attempt.submission_json ? attempt.submission_json : {
      cumulative_time_hours: 0,
      top_score_time_hours: 0,
      last_ping_at: null
    };

    // Check for Wipe based on reset_interval_hours
    const resetIntervalHours = minigame.config_json?.reset_interval_hours || 0;
    const now = new Date();
    
    if (resetIntervalHours > 0 && attempt && attempt.attempted_at) {
      const createdTime = new Date(minigame.created_at).getTime();
      const intervalMs = resetIntervalHours * 60 * 60 * 1000;
      
      const currentWipeStart = createdTime + Math.floor((now.getTime() - createdTime) / intervalMs) * intervalMs;
      const attemptTime = new Date(attempt.attempted_at).getTime();
      
      if (attemptTime < currentWipeStart) {
        // Wipe occurred
        submissionData.cumulative_time_hours = 0;
        submissionData.top_score_time_hours = 0;
      }
    }

    let hoursDelta = 0;
    if (within_radius) {
      if (submissionData.last_ping_at) {
        const lastPing = new Date(submissionData.last_ping_at);
        const timeDiffMs = now.getTime() - lastPing.getTime();
        if (timeDiffMs > 0 && timeDiffMs < 1000 * 60 * 5) { // max 5 min delta
          hoursDelta = timeDiffMs / (1000 * 60 * 60);
          submissionData.cumulative_time_hours += hoursDelta;
        }
      }
      submissionData.last_ping_at = now.toISOString();
    } else {
      submissionData.last_ping_at = null; // Reset chain
    }

    // Determine Top Scorer
    const allAttempts = await MinigameAttempt.findAll({ where: { game_id }, transaction });
    let topScorerId = null;
    let maxScore = -1;

    for (const att of allAttempts) {
      const pData = att.submission_json || {};
      const score = pData.cumulative_time_hours || 0;
      if (score > maxScore) {
        maxScore = score;
        topScorerId = att.user_id;
      }
    }

    if (user_id === topScorerId || submissionData.cumulative_time_hours > maxScore) {
      submissionData.top_score_time_hours += hoursDelta;
    }

    if (attempt) {
      attempt.submission_json = submissionData;
      attempt.attempted_at = now;
      attempt.outcome = 'pass';
      await attempt.save({ transaction });
    } else {
      await MinigameAttempt.create({
        user_id,
        game_id,
        outcome: 'pass',
        submission_json: submissionData,
        score: 1.0,
        attempted_at: now,
        points_awarded: 0
      }, { transaction });
    }

    await transaction.commit();
    res.json({ success: true, within_radius, submissionData });
  } catch (error) {
    await transaction.rollback();
    console.error('Ping Error:', error);
    res.status(500).json({ error: 'Failed to process domination ping' });
  }
};

// Point Domination: Get Leaderboard
exports.getDominationScores = async (req, res) => {
  try {
    const user_id = req.user ? req.user.user_id : (req.query.user_id || null);
    const game_id = req.query.game_id;

    if (!game_id) return res.status(400).json({ error: 'game_id required' });

    const minigame = await Minigame.findByPk(game_id);
    if (!minigame) return res.status(404).json({ error: 'Game not found' });

    const attempts = await MinigameAttempt.findAll({
      where: { game_id },
      include: [{ model: User, attributes: ['username'] }]
    });

    const resetIntervalHours = minigame.config_json?.reset_interval_hours || 0;
    const now = new Date();
    
    let nextWipeInHours = null;
    let currentWipeStartMs = 0;
    
    if (resetIntervalHours > 0) {
      const createdTime = new Date(minigame.created_at).getTime();
      const intervalMs = resetIntervalHours * 60 * 60 * 1000;
      currentWipeStartMs = createdTime + Math.floor((now.getTime() - createdTime) / intervalMs) * intervalMs;
      const nextWipeMs = currentWipeStartMs + intervalMs;
      nextWipeInHours = (nextWipeMs - now.getTime()) / (1000 * 60 * 60);
    }

    const activeScores = attempts
      .map(att => {
        let submissionData = att.submission_json || { cumulative_time_hours: 0 };
        if (resetIntervalHours > 0) {
          const attemptTimeMs = new Date(att.attempted_at).getTime();
          if (attemptTimeMs < currentWipeStartMs) {
            submissionData.cumulative_time_hours = 0;
          }
        }
        return {
          user_id: att.user_id,
          username: att.User ? att.User.username : 'Unknown',
          score: submissionData.cumulative_time_hours || 0
        };
      })
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score);

    const top3 = activeScores.slice(0, 3);
    
    let currentUserScore = null;
    if (user_id) {
      const userRank = activeScores.findIndex(s => s.user_id === parseInt(user_id, 10));
      if (userRank !== -1) {
        currentUserScore = {
          rank: userRank + 1,
          ...activeScores[userRank]
        };
      }
    }

    res.json({ top3, nextWipeInHours, currentUserScore });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch scores' });
  }
};
