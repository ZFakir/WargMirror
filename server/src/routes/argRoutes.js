const express = require('express');
const router = express.Router();
const argController = require('../controllers/argController');

router.get('/', argController.getAllArgs);
router.get('/:id', argController.getArgById);
router.post('/', argController.createArg);
router.put('/:id', argController.updateArg);
router.post('/:id/vote', argController.voteArg);
router.post('/:id/flag', argController.flagArg);

module.exports = router;
