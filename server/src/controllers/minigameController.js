const { Minigame, Waypoint, Arg, MinigameAttempt, WaypointProgress, WaypointEdge, GameSession } = require('../models');
const { evaluateConditions } = require('./gameController');
const path = require('path');
const fs = require('fs');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// Fail fast in production rather than silently authenticating with a known constant.
let AI_KEY = process.env.AI_KEY;
if (!AI_KEY) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('AI_KEY must be set in production; refusing to use the shared dev fallback key.');
  }
  AI_KEY = 'dev-secret-key';
}

exports.uploadReference = async (req, res) => {
  try {
    const { gameId } = req.params;
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

    const minigame = await Minigame.findByPk(gameId, {
      include: [{
        model: Waypoint,
        include: [{ model: Arg }]
      }]
    });
    if (!minigame) return res.status(404).json({ error: 'Minigame not found' });
    
    if (!minigame.Waypoint || !minigame.Waypoint.Arg || minigame.Waypoint.Arg.author_id !== req.user.user_id) {
      return res.status(403).json({ error: 'Unauthorized to modify this ARG' });
    }

    // Update config JSON with the URL
    const config = minigame.config_json || {};
    config.reference_image_url = `/api/minigames/${gameId}/reference/image`;
    
    // Convert buffer to base64 and store it
    config.reference_image_base64 = req.file.buffer.toString('base64');
    config.reference_image_mimetype = req.file.mimetype;

    minigame.config_json = config;
    minigame.changed('config_json', true);
    await minigame.save();

    res.json({ message: 'Reference uploaded successfully', url: config.reference_image_url });
  } catch (err) {
    console.error('Error in uploadReference:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getReferenceImage = async (req, res) => {
  try {
    const { gameId } = req.params;
    const minigame = await Minigame.findByPk(gameId);
    if (!minigame || !minigame.config_json || !minigame.config_json.reference_image_base64) {
      return res.status(404).json({ error: 'Reference image not found' });
    }

    const imgBuffer = Buffer.from(minigame.config_json.reference_image_base64, 'base64');
    const mimeType = minigame.config_json.reference_image_mimetype || 'image/jpeg';
    
    res.set('Content-Type', mimeType);
    res.send(imgBuffer);
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
      let ext = mime === 'image/png' ? '.png' : '.jpg';
      
      formData.append(referenceKey, new Blob([refBuffer], { type: mime }), `reference${ext}`);
    }

    const response = await fetch(`${AI_SERVICE_URL}${aiEndpoint}`, {
      method: 'POST',
      headers: { 'X-API-Key': AI_KEY },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Service Error:', errorText);
      return res.status(response.status).json({ error: 'AI evaluation failed' });
    }

    const data = await response.json();
    
    // Process progression
    const user_id = req.user.user_id;
    const waypoint_id = minigame.waypoint_id;
    const arg_id = minigame.Waypoint ? minigame.Waypoint.arg_id : null;
    
    const transaction = await Minigame.sequelize.transaction();
    try {
      const outcome = data.passed ? 'pass' : 'fail';
      
      await MinigameAttempt.upsert({
        user_id,
        game_id: gameId,
        outcome,
        submission_json: `AI Score: ${data.confidence_score}`,
        score: data.passed ? 1.0 : 0.0,
        attempted_at: new Date()
      }, { transaction });

      if (outcome === 'fail') {
        const config = minigame.config_json || {};
        if (config.allow_multiple_attempts) {
          await transaction.commit();
          return res.json({ ...data, can_retry: true });
        } else {
          await WaypointProgress.upsert({
            user_id,
            waypoint_id,
            status: 'failed',
            completed_at: new Date()
          }, { transaction });
        }
      } else {
        // If passed, unlock waypoint
        await WaypointProgress.upsert({
          user_id,
          waypoint_id,
          status: 'completed',
          completed_at: new Date()
        }, { transaction });
      }

      const edges = await WaypointEdge.findAll({ where: { from_waypoint_id: waypoint_id }, transaction });
      for (const edge of edges) {
        const canUnlock = await evaluateConditions(user_id, edge.conditions_json, transaction);
        if (canUnlock) {
          await WaypointProgress.upsert({
            user_id,
            waypoint_id: edge.to_waypoint_id,
            status: 'unlocked',
            unlocked_at: new Date()
          }, { transaction });
        }
      }

      // Check if session completed
      if (arg_id) {
        const activeProgress = await WaypointProgress.findAll({ where: { user_id }, transaction });
        const argWaypoints = await Waypoint.findAll({ where: { arg_id }, attributes: ['waypoint_id'], transaction });
        const argWpIds = argWaypoints.map(w => w.waypoint_id);
        const sessionProgress = activeProgress.filter(p => argWpIds.includes(p.waypoint_id));
        const hasUnlocked = sessionProgress.some(p => p.status === 'unlocked');
        
        if (!hasUnlocked && sessionProgress.some(p => p.status === 'completed' || p.status === 'failed')) {
          await GameSession.update({ status: 'completed', completed_at: new Date() }, {
            where: { user_id, arg_id },
            transaction
          });
        }
      }

      await transaction.commit();
    } catch (dbErr) {
      await transaction.rollback();
      console.error('Database error during progression:', dbErr);
    }

    return res.json(data);
  } catch (err) {
    console.error('Error in submitAttempt:', err);
    res.status(500).json({ error: 'Server error during attempt processing' });
  }
};
