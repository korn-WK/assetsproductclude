const { verifyToken, getOriginalRole } = require('../controllers/authController');

// Middleware to protect admin routes
const requireAdmin = (req, res, next) => {
  verifyToken(req, res, (err) => {
    if (err) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const userRoleHash = req.user.role;
    const originalUserRole = getOriginalRole(userRoleHash);
    if (originalUserRole !== 'SuperAdmin') {
      return res.status(403).json({ 
        message: 'Access denied. SuperAdmin privileges required.',
        error: 'FORBIDDEN'
      });
    }
    next();
  });
};

// Middleware to protect user routes (prevent SuperAdmin access)
const requireUser = (req, res, next) => {
  verifyToken(req, res, (err) => {
    if (err) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const userRoleHash = req.user.role;
    const originalUserRole = getOriginalRole(userRoleHash);
    if (originalUserRole === 'SuperAdmin') {
      return res.status(403).json({ 
        message: 'Access denied. This route is for regular users and admins only.',
        error: 'FORBIDDEN'
      });
    }
    next();
  });
};

// Middleware to check if user is authenticated and redirect based on role
const checkUserRole = (req, res, next) => {
  verifyToken(req, res, (err) => {
    if (err) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Add user role info to response for frontend routing
    req.userRole = req.user.role;
    next();
  });
};

module.exports = {
  requireAdmin,
  requireUser,
  checkUserRole
}; 