// routes/authRoutes.js
const express = require('express');
const passport = require('passport');
const authController = require('../controllers/authController');

const router = express.Router();

router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })
);

router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.CLIENT_URL}/login?error=google_auth_failed`
  }),
  authController.googleAuthCallback
);

router.get('/protected', authController.verifyToken, (req, res) => {
  res.json({ message: `Welcome, ${req.user.username}! This is a protected route.`, user: req.user });
});

router.get('/admin-only', authController.verifyToken, authController.authorizeRoles('SuperAdmin'), (req, res) => {
  res.json({ message: `Hello SuperAdmin ${req.user.username}! You have super admin privileges.`, user: req.user });
});

// New: Logout route
router.post('/logout', authController.logout);

// Route to get current user's data if a valid token is present
router.get('/me', authController.verifyToken, authController.getMe);

// Route to update user's department_id
router.put('/department', authController.verifyToken, authController.updateUserDepartment);

module.exports = router;