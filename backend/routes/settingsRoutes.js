const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');

router.get('/user-edit-window', settingsController.getUserEditWindow);
router.post('/user-edit-window', settingsController.setUserEditWindow);

module.exports = router; 