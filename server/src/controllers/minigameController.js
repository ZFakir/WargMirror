const crypto = require('crypto');
const fs = require('fs');
const { Minigame, Waypoint, Arg, MinigameAttempt, WaypointProgress, WaypointEdge, GameSession } = require('../models');
const { evaluateConditions } = require('./gameController');
const badgeService = require('../services/badgeService');
const demoService = require('../services/demoService');
const {
  referenceImageCache,
  invalidateReferenceImage,
  invalidateArgs,
  invalidateArg,
  invalidateBadgeCooldown
} = require('../utils/cache');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';

function setHeaderSafe(res, key, value) {
  if (typeof res.set === 'function') {
    res.set(key, value);
  }
}

exports.uploadReference = async (req, res) => {
  try {
    const { gameId } = req.params;
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

    const minigame = await Minigame.findByPk(gameId, {
      include: [{
        model: Waypoint,
        attributes: ['waypoint_id', 'arg_id'],
        include: [{ model: Arg, attributes: ['arg_id', 'creator_id'] }]
      }]
    });
    if (!minigame) return res.status(404).json({ error: 'Minigame not found' });

    if (!minigame.Waypoint || !minigame.Waypoint.Arg || minigame.Waypoint.Arg.creator_id !== req.user.user_id) {
      return res.status(403).json({ error: 'Unauthorized to modify this ARG' });
    }

    // Update config JSON with the URL
    const config = minigame.config_json || {};
    config.reference_image_url = `/api/minigames/${gameId}/reference/image?ts=${Date.now()}`;

    // Convert buffer to base64 and store it
    config.reference_image_base64 = req.file.buffer.toString('base64');
    config.reference_image_mimetype = req.file.mimetype;

    minigame.config_json = config;
    minigame.changed('config_json', true);
    await minigame.save();

    invalidateReferenceImage(gameId);
    invalidateArgs();
    invalidateArg(minigame.Waypoint.arg_id);

    res.json({ message: 'Reference uploaded successfully', url: config.reference_image_url });
  } catch (err) {
    console.error('Error in uploadReference:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.deleteReference = async (req, res) => {
  try {
    const { gameId } = req.params;
    const minigame = await Minigame.findByPk(gameId);
    if (!minigame) return res.status(404).json({ error: 'Minigame not found' });

    const config = minigame.config_json || {};
    delete config.reference_image_url;
    delete config.reference_image_base64;
    delete config.reference_image_mimetype;

    minigame.config_json = config;
    minigame.changed('config_json', true);
    await minigame.save();

    invalidateReferenceImage(gameId);
    invalidateArgs();

    res.json({ message: 'Reference deleted successfully' });
  } catch (err) {
    console.error('Error in deleteReference:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getReferenceImage = async (req, res) => {
  try {
    const { gameId } = req.params;
    const cached = await referenceImageCache.getOrSet(String(gameId), 10 * 60 * 1000, async () => {
      const minigame = await Minigame.findByPk(gameId, {
        attributes: ['game_id', 'config_json', 'updated_at']
      });
      if (!minigame || !minigame.config_json || !minigame.config_json.reference_image_base64) {
        return null;
      }

      const buffer = Buffer.from(minigame.config_json.reference_image_base64, 'base64');
      const mimeType = minigame.config_json.reference_image_mimetype || 'image/jpeg';
      const etag = `"${crypto.createHash('sha1').update(buffer).digest('hex')}"`;
      return { buffer, mimeType, etag };
    });

    if (!cached || !cached.buffer) {
      return res.status(404).json({ error: 'Reference image not found' });
    }

    setHeaderSafe(res, 'ETag', cached.etag);
    setHeaderSafe(res, 'Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');

    if (req.headers && req.headers['if-none-match'] === cached.etag && typeof res.end === 'function') {
      return res.status(304).end();
    }

    res.set('Content-Type', cached.mimeType);
    res.send(cached.buffer);
  } catch (err) {
    console.error('Error in getReferenceImage:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.submitAttempt = async (req, res) => {
  try {
    const { gameId } = req.params;
    if (!req.file) return res.status(400).json({ error: 'No attempt image uploaded' });

    const minigame = await Minigame.findByPk(gameId, {
      include: [{ model: Waypoint }]
    });
    if (!minigame) return res.status(404).json({ error: 'Minigame not found' });

    const attemptImage = req.file; // From memoryStorage

    // Determine the AI endpoint based on game_type
    let aiEndpoint = null;
    let referenceKey = null;

    switch (minigame.game_type) {
      case 'shape_match':
        aiEndpoint = '/api/v1/sam-extract';
        referenceKey = 'target_mask';
        break;
      case 'colour_match':
        aiEndpoint = '/api/v1/hsv-match';
        referenceKey = 'reference_image';
        break;
      case 'texture_match':
        aiEndpoint = '/api/v1/texture-match';
        referenceKey = 'reference_image';
        break;
      case 'sift_match':
        aiEndpoint = '/api/v1/sift-match';
        referenceKey = 'archival_image';
        break;
      case 'symmetry_finder':
        aiEndpoint = '/api/v1/symmetry';
        referenceKey = null; // Doesn't need a reference image
        break;
      case 'plaque_scan':
        aiEndpoint = '/api/v1/ocr-match';
        referenceKey = 'reference_image';
        break;
      default:
        return res.status(400).json({ error: 'Game type does not support AI evaluation via this endpoint' });
    }

    const formData = new FormData();
    formData.append('image', new Blob([attemptImage.buffer], { type: attemptImage.mimetype }), attemptImage.originalname);

    if (referenceKey) {
      if (!minigame.config_json || !minigame.config_json.reference_image_base64) {
        return res.status(400).json({ error: 'Minigame does not have a reference image uploaded' });
      }

      const refBuffer = Buffer.from(minigame.config_json.reference_image_base64, 'base64');
      const mime = minigame.config_json.reference_image_mimetype || 'image/jpeg';
      const ext = mime === 'image/png' ? '.png' : '.jpg';

      formData.append(referenceKey, new Blob([refBuffer], { type: mime }), `reference${ext}`);
    }

    const fetchOptions = {
      method: 'POST',
      body: formData,
      headers: {
        'X-API-Key': process.env.AI_KEY || 'dev-secret-key'
      }
    };
    if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
      fetchOptions.signal = AbortSignal.timeout(25000);
    }

    const response = await fetch(`${AI_SERVICE_URL}${aiEndpoint}`, fetchOptions);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Service Error:', errorText);
      return res.status(response.status).json({ error: 'AI evaluation failed' });
    }

    const data = await response.json();

    // Process progression
    const waypoint_id = minigame.waypoint_id;
    const arg_id = minigame.Waypoint ? minigame.Waypoint.arg_id : null;

    let unlockedNodes = [];
    let session_completed = false;
    let can_retry = false;
    const outcome = data.passed ? 'pass' : 'fail';
    const finalStatus = outcome === 'pass' ? 'completed' : 'failed';

    if (req.isDemoGuest) {
      const config = minigame.config_json || {};
      can_retry = Boolean(outcome === 'fail' && config.allow_multiple_attempts);

      const demoData = arg_id ? demoService.getDemoSession(req, arg_id) : null;
      if (demoData) {
        const nowIso = new Date().toISOString();
        if (!demoData.attempts) demoData.attempts = {};
        demoData.attempts[String(gameId)] = {
          user_id: null,
          game_id: gameId,
          outcome,
          submission_json: `AI Score: ${data.confidence_score}`,
          score: data.passed ? 1.0 : 0.0,
          attempted_at: nowIso
        };

        if (waypoint_id) {
          const existingWp = demoData.progress[String(waypoint_id)] || {};
          demoData.progress[String(waypoint_id)] = {
            waypoint_id,
            status: finalStatus,
            unlocked_at: existingWp.unlocked_at || nowIso,
            completed_at: nowIso
          };

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
        }

        if (arg_id && Waypoint && typeof Waypoint.findAll === 'function') {
          const argWaypoints = await Waypoint.findAll({ where: { arg_id }, attributes: ['waypoint_id'] });
          const argWpIds = argWaypoints.map(w => w.waypoint_id);
          const sessionProgress = argWpIds.map(id => demoData.progress[String(id)]).filter(Boolean);
          const hasUnlocked = sessionProgress.some(p => p.status === 'unlocked');

          if (!hasUnlocked && sessionProgress.length > 0 && sessionProgress.length === argWpIds.length && sessionProgress.every(p => p.status === 'completed' || p.status === 'failed')) {
            if (!(outcome === 'fail' && can_retry && unlockedNodes.length === 0)) {
              session_completed = true;
              demoData.session.status = 'completed';
              demoData.session.completed_at = nowIso;
            }
          }
        }

        demoData.session.last_active_at = nowIso;
        await demoService.saveReqSession(req);
      }

      return res.json({
        ...data,
        outcome,
        can_retry,
        unlockedNodes,
        session_completed,
        nodeStatus: finalStatus
      });
    }

    const user_id = req.user.user_id;
    const transaction = await Minigame.sequelize.transaction();

    try {
      const progressionOps = [
        MinigameAttempt.upsert({
          user_id,
          game_id: gameId,
          outcome,
          submission_json: `AI Score: ${data.confidence_score}`,
          score: data.passed ? 1.0 : 0.0,
          attempted_at: new Date()
        }, { transaction })
      ];

      const config = minigame.config_json || {};
      can_retry = Boolean(outcome === 'fail' && config.allow_multiple_attempts);

      if (waypoint_id) {
        progressionOps.push(
          WaypointProgress.upsert({
            user_id,
            waypoint_id,
            status: finalStatus,
            completed_at: new Date()
          }, { transaction }),
          WaypointEdge.findAll({ where: { from_waypoint_id: waypoint_id }, transaction })
        );
      }

      const opResults = await Promise.all(progressionOps);
      const edges = waypoint_id ? (opResults[2] || []) : [];

      for (const edge of edges) {
        const canUnlock = await evaluateConditions(user_id, edge.conditions_json, transaction);
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

      // Check if session completed
      if (arg_id) {
        const [argWaypoints, activeProgress] = await Promise.all([
          Waypoint.findAll({ where: { arg_id }, attributes: ['waypoint_id'], transaction }),
          WaypointProgress.findAll({ where: { user_id }, transaction })
        ]);
        const argWpIds = argWaypoints.map(w => w.waypoint_id);
        const sessionProgress = activeProgress.filter(p => argWpIds.includes(p.waypoint_id));
        const hasUnlocked = sessionProgress.some(p => p.status === 'unlocked');

        if (!hasUnlocked && sessionProgress.length > 0 && sessionProgress.length === argWpIds.length && sessionProgress.every(p => p.status === 'completed' || p.status === 'failed')) {
          if (!(outcome === 'fail' && can_retry && unlockedNodes.length === 0)) {
            session_completed = true;
            await GameSession.update({ status: 'completed', completed_at: new Date() }, {
              where: { user_id, arg_id },
              transaction
            });
          }
        }
      }

      await transaction.commit();
      invalidateBadgeCooldown(user_id);
      badgeService.evaluateAndAwardBadges(user_id).catch(() => {});
    } catch (dbErr) {
      await transaction.rollback();
      console.error('Database error during progression:', dbErr);
    }

    return res.json({
      ...data,
      outcome,
      can_retry,
      unlockedNodes,
      session_completed,
      nodeStatus: finalStatus
    });
  } catch (err) {
    console.error('Error in submitAttempt:', err);
    const logLine = new Date().toISOString() + ' - ' + err.stack + '\n';
    if (fs && fs.promises && typeof fs.promises.appendFile === 'function') {
      fs.promises.appendFile('error.log', logLine).catch(() => {});
    } else if (fs && typeof fs.appendFileSync === 'function') {
      fs.appendFileSync('error.log', logLine);
    }
    res.status(500).json({ error: 'Server error during attempt processing' });
  }
};
