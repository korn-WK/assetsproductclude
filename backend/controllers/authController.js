// controllers/authController.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
require('dotenv').config();

// Function to hash role
const hashRole = (role) => {
  return crypto.createHash('sha256').update(role).digest('hex');
};

// Function to verify if a role matches a hash
const verifyRoleHash = (role, hash) => {
  return hashRole(role) === hash;
};

// Function to get original role from common hashes (for known roles)
const getOriginalRole = (hashedRole) => {
  const roleHashes = {
    'SuperAdmin': hashRole('SuperAdmin'),
    'Admin': hashRole('Admin'),
    'User': hashRole('User'),
    'user': hashRole('user'),
    'admin': hashRole('admin')
  };
  
  for (const [role, hash] of Object.entries(roleHashes)) {
    if (hash === hashedRole) {
      return role;
    }
  }
  return null; // Return null if hash doesn't match any known role
};

const generateToken = (user, expiresIn = '15m') => {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username, 
      email: user.email, 
      role: hashRole(user.role), // Hash the role
      name: user.name, 
      picture: user.picture,
      department_id: user.department_id // Add department_id to token
    },
    process.env.JWT_SECRET,
    { expiresIn }
  );
};

const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '1d' }
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
    const token = generateToken(userPayload, '15m');
    const refreshToken = generateRefreshToken(userPayload);
    // Set the JWT as an HttpOnly cookie
    res.cookie('jwt_token', token, {
      httpOnly: true, // IMPORTANT: Accessible only by the web server
      secure: process.env.NODE_ENV === 'production', // Use HTTPS in production
      maxAge: 15 * 60 * 1000, // Cookie expires in 24 hours (match token expiry or session expiry)
      sameSite: 'Lax' // Helps prevent CSRF, adjust if needed for cross-site requests
    });
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true, // IMPORTANT: Accessible only by the web server
      secure: process.env.NODE_ENV === 'production', // Use HTTPS in production
      maxAge: 7 * 24 * 60 * 60 * 1000, // Cookie expires in 24 hours (match token expiry or session expiry)
      sameSite: 'Lax' // Helps prevent CSRF, adjust if needed for cross-site requests
    });

    // Check if user is admin and redirect accordingly
    const userRoleHash = req.user.role;
    const originalUserRole = getOriginalRole(userRoleHash);
    const isSuperAdmin = originalUserRole === 'SuperAdmin' || req.user.email === 'admin@mfu.ac.th' || req.user.email?.toLowerCase().includes('superadmin');
    const isAdmin = originalUserRole === 'Admin' || originalUserRole === 'admin';
    let redirectUrl;
    if (isSuperAdmin) {
      redirectUrl = `${process.env.CLIENT_URL}/admin/asset-management`;
    } else if (isAdmin || originalUserRole === 'User' || originalUserRole === 'user') {
      redirectUrl = `${process.env.CLIENT_URL}/user/asset-browser`;
    } else {
      redirectUrl = `${process.env.CLIENT_URL}/user/asset-browser`;
    }
    // Redirect to appropriate page based on role
    res.redirect(redirectUrl);
  } else {
    res.redirect(`${process.env.CLIENT_URL}/login?error=google_auth_failed`);
  }
};

const verifyAndRefreshToken = (req, res, next) => {
  const token = req.cookies.jwt_token;
  if (!token) {
    return tryRefreshToken(req, res, next);
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (error) {
    // ถ้า access token หมดอายุ ให้ลอง refresh
    if (error.name === 'TokenExpiredError') {
      return tryRefreshToken(req, res, next);
    }
    res.clearCookie('jwt_token');
    res.clearCookie('refresh_token');
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

function tryRefreshToken(req, res, next) {
  const refreshToken = req.cookies.refresh_token;
  if (!refreshToken) {
    res.clearCookie('jwt_token');
    res.clearCookie('refresh_token');
    return res.status(401).json({ message: 'Authentication required (no refresh token)' });
  }
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    // สร้าง access token ใหม่
    // (ควร query user จาก DB เพื่อความปลอดภัย แต่ demo นี้ใช้ id จาก refresh token)
    const user = { id: decoded.id };
    // คุณอาจต้อง query user จาก DB เพื่อเติมข้อมูล user ให้ครบ
    // ...
    // ตัวอย่างนี้จะใช้ข้อมูล minimal
    const newAccessToken = generateToken(user, '15m');
    res.cookie('jwt_token', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 15 * 60 * 1000,
      sameSite: 'Lax'
    });
    req.user = user;
    return next();
  } catch (error) {
    res.clearCookie('jwt_token');
    res.clearCookie('refresh_token');
    return res.status(401).json({ message: 'Session expired, please login again.' });
  }
}

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to access this resource.' });
    }
    
    // Check if user's role (which is now hashed) matches any of the allowed roles
    const userRoleHash = req.user.role;
    const hasAllowedRole = roles.some(role => hashRole(role) === userRoleHash);
    
    if (!hasAllowedRole) {
      return res.status(403).json({ message: 'Forbidden: You do not have permission to access this resource.' });
    }
    next();
  };
};

// New controller to get user data from a valid token
const getMe = (req, res) => {
  // The verifyToken middleware has already attached the user to the request
  const userData = { ...req.user };
  
  // Convert hashed role back to original role for frontend
  if (userData.role) {
    userData.originalRole = getOriginalRole(userData.role);
  }
  
  res.status(200).json(userData);
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
        res.clearCookie('refresh_token', {
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
  verifyToken: verifyAndRefreshToken,
  authorizeRoles,
  generateToken,
  logout,
  getMe,
  updateUserDepartment,
  generateRefreshToken, // เผื่อใช้ในอนาคต
  // Utility functions for role hashing
  hashRole,
  verifyRoleHash,
  getOriginalRole,
};