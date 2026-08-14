const express = require('express');
const router = express.Router();
const argController = require('../controllers/argController');

router.get('/', argController.getAllArgs);
router.get('/:id', argController.getArgById);
router.post('/', argController.createArg);

module.exports = router;
