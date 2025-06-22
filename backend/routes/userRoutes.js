const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, authorizeRoles } = require('../controllers/authController.js');

// GET all users (admin only)
router.get('/users', verifyToken, authorizeRoles('admin'), userController.getAllUsers);

// PUT update user by ID (admin only)
router.put('/users/:id', verifyToken, authorizeRoles('admin'), userController.updateUser);

// DELETE user by ID (admin only)
router.delete('/users/:id', verifyToken, authorizeRoles('admin'), userController.deleteUser);

module.exports = router; 