const { sequelize, Arg, Waypoint, WaypointEdge, Minigame, GameSession, WaypointProgress, MinigameAttempt, LocationEvent } = require('../models');

// Helper to evaluate branching conditions
const evaluateConditions = async (user_id, conditions) => {
  if (!conditions || conditions.length === 0) return true; // Unconditional edge
  
  for (const cond of conditions) {
    const attempt = await MinigameAttempt.findOne({
      where: { user_id, game_id: cond.game_id },
      order: [['attempted_at', 'DESC']]
    });
    if (!attempt || attempt.outcome !== cond.outcome) {
      return false; // Condition not met
    }
  }
  return true;
};

// Start or resume a game session
exports.startGameSession = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const user_id = req.user ? req.user.user_id : (req.body.user_id || 1);
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
    const user_id = req.user ? req.user.user_id : (req.query.user_id || 1);
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

    res.json({ session, waypoints, progress, attempts, edges });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch game state' });
  }
};

// Arrive at a waypoint (Geofence check)
exports.arriveAtWaypoint = async (req, res) => {
  try {
    const user_id = req.user ? req.user.user_id : (req.body.user_id || 1);
    const waypoint_id = req.params.waypointId;
    const { lat, lng, accuracy_m } = req.body;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ error: 'Missing coordinates' });
    }

    const waypoint = await Waypoint.findByPk(waypoint_id);
    if (!waypoint) return res.status(404).json({ error: 'Waypoint not found' });

    // Log location event
    await LocationEvent.create({
      user_id,
      location: sequelize.fn('ST_GeomFromText', `POINT(${lat} ${lng})`, 4326),
      accuracy_m: accuracy_m || null
    });

    // Run spatial query for distance
    const [result] = await sequelize.query(`
      SELECT ST_Distance_Sphere(location, ST_GeomFromText('POINT(${lat} ${lng})', 4326)) AS distance
      FROM waypoints WHERE waypoint_id = :waypoint_id
    `, {
      replacements: { waypoint_id },
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
  const transaction = await sequelize.transaction();
  try {
    const user_id = req.user ? req.user.user_id : (req.body.user_id || 1);
    const arg_id = req.params.argId;
    const waypoint_id = req.params.waypointId;
    const { game_id, submission } = req.body;

    const game = await Minigame.findByPk(game_id, { transaction });
    if (!game) {
       await transaction.rollback();
       return res.status(404).json({ error: 'Minigame not found' });
    }

    // Validate submission based on game type
    let outcome = 'fail';
    let config = game.config_json || {};

    if (game.game_type === 'gps_proximity') {
      outcome = 'pass'; // the /arrive endpoint already confirmed proximity if they were allowed to submit
    } else if (game.game_type === 'text_answer') {
      if (config.is_mcq) {
        const submittedIndex = parseInt(submission, 10);
        if (!isNaN(submittedIndex) && submittedIndex === config.correct_index) {
          outcome = 'pass';
        }
      } else {
        const correctAns = (config.answer || '').toLowerCase().trim();
        const userAns = (submission || '').toLowerCase().trim();
        // Simple exact match
        if (correctAns && userAns === correctAns) outcome = 'pass';
      }
    } else if (game.game_type === 'qr_barcode') {
      const correctCode = config.barcode_value || '';
      if (correctCode && submission === correctCode) outcome = 'pass';
    } else {
      // Fallback stub for advanced types
      outcome = 'pass';
    }

    // Upsert MinigameAttempt
    const [attempt] = await MinigameAttempt.upsert({
      user_id,
      game_id,
      outcome,
      submission_json: submission,
      score: outcome === 'pass' ? 1.0 : 0.0,
      attempted_at: new Date()
    }, { transaction });

    let unlockedNodes = [];

    // Always update waypoint progress regardless of pass or fail
    await WaypointProgress.upsert({
      user_id,
      waypoint_id,
      status: 'completed',
      completed_at: new Date()
    }, { transaction });

    // Evaluate successors. Branching logic handles whether pass or fail triggers specific edges.
    const edges = await WaypointEdge.findAll({ where: { from_waypoint_id: waypoint_id }, transaction });
    
    for (const edge of edges) {
      const canUnlock = await evaluateConditions(user_id, edge.conditions_json);
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
    
    if (!hasUnlocked && sessionProgress.some(p => p.status === 'completed')) {
      await GameSession.update({ status: 'completed', completed_at: new Date() }, {
        where: { user_id, arg_id },
        transaction
      });
    }

    await transaction.commit();
    res.json({ outcome, unlockedNodes });
  } catch (error) {
    await transaction.rollback();
    console.error(error);
    res.status(500).json({ error: 'Failed to submit minigame' });
  }
};

// Abandon Session
exports.abandonSession = async (req, res) => {
  try {
    const user_id = req.user ? req.user.user_id : (req.body.user_id || 1);
    const arg_id = req.params.argId;

    await GameSession.update({ status: 'abandoned' }, {
      where: { user_id, arg_id }
    });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to abandon session' });
  }
};
