const Minigame = require('../models/Minigame');
const path = require('path');
const fs = require('fs');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

exports.uploadReference = async (req, res) => {
  try {
    const { gameId } = req.params;
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

    const minigame = await Minigame.findByPk(gameId);
    if (!minigame) return res.status(404).json({ error: 'Minigame not found' });

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

    const minigame = await Minigame.findByPk(gameId);
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
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Service Error:', errorText);
      return res.status(response.status).json({ error: 'AI evaluation failed' });
    }

    const data = await response.json();
    return res.json(data);
  } catch (err) {
    console.error('Error in submitAttempt:', err);
    res.status(500).json({ error: 'Server error during attempt processing' });
  }
};
