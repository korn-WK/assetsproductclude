// controllers/authController.js
const jwt = require('jsonwebtoken');
require('dotenv').config();

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, username: user.username, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

const googleAuthCallback = (req, res) => {
  if (req.user) {
    const token = generateToken(req.user);
    // Set the JWT as an HttpOnly cookie
    res.cookie('jwt_token', token, {
      httpOnly: true, // IMPORTANT: Accessible only by the web server
      secure: process.env.NODE_ENV === 'production', // Use HTTPS in production
      maxAge: 24 * 60 * 60 * 1000, // Cookie expires in 24 hours (match token expiry or session expiry)
      sameSite: 'Lax' // Helps prevent CSRF, adjust if needed for cross-site requests
    });

    // Redirect to frontend dashboard (no token in URL)
    res.redirect(`${process.env.CLIENT_URL}/assets`);
  } else {
    res.redirect(`${process.env.CLIENT_URL}/login?error=google_auth_failed`);
  }
};

const verifyToken = (req, res, next) => {
  // Get token from HttpOnly cookie instead of Authorization header
  const token = req.cookies.jwt_token;

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    // Clear expired/invalid cookie
    res.clearCookie('jwt_token');
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to access this resource.' });
    }
    next();
  };
};

// New: Logout endpoint to clear the cookie
const logout = (req, res) => {
    res.clearCookie('jwt_token'); // Clear the HttpOnly cookie
    req.logout((err) => { // Passport.js logout (if session is used)
        if (err) { return next(err); }
        res.status(200).json({ message: 'Logged out successfully.' });
    });
};


module.exports = {
  googleAuthCallback,
  verifyToken,
  authorizeRoles,
  generateToken,
  logout // Export the new logout function
};