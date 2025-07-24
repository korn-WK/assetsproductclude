const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, authorizeRoles } = require('../controllers/authController.js');

// GET all users (SuperAdmin only)
router.get('/users', verifyToken, authorizeRoles('SuperAdmin'), userController.getAllUsers);

// PUT update user by ID (SuperAdmin only)
router.put('/users/:id', verifyToken, authorizeRoles('SuperAdmin'), userController.updateUser);

// DELETE user by ID (SuperAdmin only)
router.delete('/users/:id', verifyToken, authorizeRoles('SuperAdmin'), userController.deleteUser);

// POST create user (SuperAdmin only)
router.post('/users', verifyToken, authorizeRoles('SuperAdmin'), userController.createUser);

module.exports = router; 