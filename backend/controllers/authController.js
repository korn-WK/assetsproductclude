// controllers/authController.js
const jwt = require('jsonwebtoken');
require('dotenv').config();

const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username, 
      email: user.email, 
      role: user.role, 
      name: user.name, 
      picture: user.picture,
      department_id: user.department_id // Add department_id to token
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

const googleAuthCallback = (req, res) => {
  if (req.user) {
    const userPayload = {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      role: req.user.role,
      name: req.user.name,
      picture: req.user.picture || null, // Assuming 'picture' might not always be there
      department_id: req.user.department_id || null // Add department_id to payload
    };
    const token = generateToken(userPayload);
    // Set the JWT as an HttpOnly cookie
    res.cookie('jwt_token', token, {
      httpOnly: true, // IMPORTANT: Accessible only by the web server
      secure: process.env.NODE_ENV === 'production', // Use HTTPS in production
      maxAge: 24 * 60 * 60 * 1000, // Cookie expires in 24 hours (match token expiry or session expiry)
      sameSite: 'Lax' // Helps prevent CSRF, adjust if needed for cross-site requests
    });

    // Check if user is admin and redirect accordingly
    const isAdmin = req.user.role === 'admin' || req.user.email === 'admin@mfu.ac.th' || req.user.email?.includes('admin');
    const redirectUrl = isAdmin ? `${process.env.CLIENT_URL}/admin/dashboard` : `${process.env.CLIENT_URL}/user/asset-browser`;
    
    // Redirect to appropriate page based on role
    res.redirect(redirectUrl);
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

// New controller to get user data from a valid token
const getMe = (req, res) => {
  // The verifyToken middleware has already attached the user to the request
  res.status(200).json(req.user);
};

// New: Logout endpoint to clear the cookie
const logout = (req, res) => {
    try {
        // Clear the JWT cookie
        res.clearCookie('jwt_token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Lax'
        });
        
        res.status(200).json({ message: 'Logged out successfully.' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ message: 'Could not log out, please try again.' });
    }
};

// Update user's department_id
const updateUserDepartment = async (req, res) => {
  try {
    const { department_id } = req.body;
    const userId = req.user.id;
    
    // Validate department_id (can be null or a valid integer)
    if (department_id !== null && department_id !== undefined) {
      if (!Number.isInteger(Number(department_id)) || Number(department_id) < 1) {
        return res.status(400).json({ message: 'Invalid department_id' });
      }
    }
    
    const pool = require('../lib/db.js');
    const [result] = await pool.query(
      'UPDATE users SET department_id = ? WHERE id = ?',
      [department_id, userId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update the user object in the request with new department_id
    req.user.department_id = department_id;
    
    // Generate new token with updated department_id
    const newToken = generateToken(req.user);
    
    // Update the cookie with new token
    res.cookie('jwt_token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: 'Lax'
    });
    
    res.json({ 
      message: 'Department updated successfully',
      department_id: department_id
    });
  } catch (error) {
    console.error('Error updating user department:', error);
    res.status(500).json({ message: 'Failed to update department' });
  }
};

module.exports = {
  googleAuthCallback,
  verifyToken,
  authorizeRoles,
  generateToken,
  logout,
  getMe,
  updateUserDepartment,
};