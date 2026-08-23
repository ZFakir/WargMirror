const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

const evaluateShape = async (req, res) => {
  try {
    if (!req.files || !req.files.image || !req.files.target_mask) {
      return res.status(400).json({ error: 'Missing required files: image and target_mask' });
    }

    const imageFile = req.files.image[0];
    const targetMaskFile = req.files.target_mask[0];

    const formData = new FormData();
    formData.append('image', new Blob([imageFile.buffer], { type: imageFile.mimetype }), imageFile.originalname);
    formData.append('target_mask', new Blob([targetMaskFile.buffer], { type: targetMaskFile.mimetype }), targetMaskFile.originalname);

    const response = await fetch(`${AI_SERVICE_URL}/api/v1/sam-extract`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI service responded with status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return res.json(data);
  } catch (error) {
    console.error('Error in evaluateShape:', error);
    return res.status(500).json({ error: 'Failed to process shape evaluation' });
  }
};

const evaluateColour = async (req, res) => {
  try {
    if (!req.files || !req.files.image) {
      return res.status(400).json({ error: 'Missing required file: image' });
    }
    if (!req.body.target_colour) {
      return res.status(400).json({ error: 'Missing required field: target_colour' });
    }

    const imageFile = req.files.image[0];
    const targetColour = req.body.target_colour;

    const formData = new FormData();
    formData.append('image', new Blob([imageFile.buffer], { type: imageFile.mimetype }), imageFile.originalname);
    formData.append('target_colour', targetColour);

    const response = await fetch(`${AI_SERVICE_URL}/api/v1/hsv-match`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI service responded with status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return res.json(data);
  } catch (error) {
    console.error('Error in evaluateColour:', error);
    return res.status(500).json({ error: 'Failed to process colour evaluation' });
  }
};

const evaluateTexture = async (req, res) => {
  try {
    if (!req.files || !req.files.image || !req.files.reference_image) {
      return res.status(400).json({ error: 'Missing required files: image and reference_image' });
    }

    const imageFile = req.files.image[0];
    const referenceImageFile = req.files.reference_image[0];

    const formData = new FormData();
    formData.append('image', new Blob([imageFile.buffer], { type: imageFile.mimetype }), imageFile.originalname);
    formData.append('reference_image', new Blob([referenceImageFile.buffer], { type: referenceImageFile.mimetype }), referenceImageFile.originalname);

    const response = await fetch(`${AI_SERVICE_URL}/api/v1/texture-match`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI service responded with status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return res.json(data);
  } catch (error) {
    console.error('Error in evaluateTexture:', error);
    return res.status(500).json({ error: 'Failed to process texture evaluation' });
  }
};

module.exports = {
  evaluateShape,
  evaluateColour,
  evaluateTexture
};
