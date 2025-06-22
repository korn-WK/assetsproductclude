const express = require('express');
const router = express.Router();
const {
  getDepartments,
  getDepartment,
  createDepartmentHandler,
  updateDepartmentHandler,
  deleteDepartmentHandler
} = require('../controllers/departmentController');

// Get all departments
router.get('/', getDepartments);

// Get department by ID
router.get('/:id', getDepartment);

// Create new department
router.post('/', createDepartmentHandler);

// Update department
router.put('/:id', updateDepartmentHandler);

// Delete department
router.delete('/:id', deleteDepartmentHandler);

module.exports = router; 