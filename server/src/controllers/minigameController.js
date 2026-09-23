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
    
    // Also save the local file path so we can read it easily during /attempt
    config.reference_image_path = req.file.path;

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
    if (!minigame || !minigame.config_json || !minigame.config_json.reference_image_path) {
      return res.status(404).json({ error: 'Reference image not found' });
    }

    const filePath = minigame.config_json.reference_image_path;
    if (fs.existsSync(filePath)) {
      res.sendFile(path.resolve(filePath));
    } else {
      res.status(404).json({ error: 'File on disk not found' });
    }
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
      if (!minigame.config_json || !minigame.config_json.reference_image_path || !fs.existsSync(minigame.config_json.reference_image_path)) {
        return res.status(400).json({ error: 'Minigame does not have a reference image uploaded' });
      }
      
      const refPath = minigame.config_json.reference_image_path;
      const refBuffer = fs.readFileSync(refPath);
      // Determine mimetype from extension
      let ext = path.extname(refPath).toLowerCase();
      let mime = 'image/jpeg';
      if (ext === '.png') mime = 'image/png';
      
      formData.append(referenceKey, new Blob([refBuffer], { type: mime }), path.basename(refPath));
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
