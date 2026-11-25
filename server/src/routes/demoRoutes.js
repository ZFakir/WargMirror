const express = require('express');
const router = express.Router();
const demoService = require('../services/demoService');

// Public endpoint returning the currently configured demo ARG (or null).
router.get('/', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const arg = await demoService.getDemoArg();
    res.json({
      demo: arg ? (typeof arg.toJSON === 'function' ? arg.toJSON() : arg) : null
    });
  } catch (error) {
    console.error('Error fetching demo game:', error);
    res.status(500).json({ error: 'Failed to fetch demo game' });
  }
});

module.exports = router;
