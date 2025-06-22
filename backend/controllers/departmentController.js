const {
  getAllDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment
} = require('../models/department');

// Get all departments
async function getDepartments(req, res) {
  try {
    const departments = await getAllDepartments();
    res.json(departments);
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
}

// Get department by ID
async function getDepartment(req, res) {
  try {
    const { id } = req.params;
    const department = await getDepartmentById(id);
    
    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }
    
    res.json(department);
  } catch (error) {
    console.error('Error fetching department:', error);
    res.status(500).json({ error: 'Failed to fetch department' });
  }
}

// Create new department
async function createDepartmentHandler(req, res) {
  try {
    const { name_th, name_en, description } = req.body;
    
    // Validation
    if (!name_th) {
      return res.status(400).json({ error: 'Department name in Thai is required' });
    }
    
    const departmentId = await createDepartment({ name_th, name_en, description });
    const newDepartment = await getDepartmentById(departmentId);
    
    res.status(201).json({
      message: 'Department created successfully',
      department: newDepartment
    });
  } catch (error) {
    console.error('Error creating department:', error);
    res.status(500).json({ error: 'Failed to create department' });
  }
}

// Update department
async function updateDepartmentHandler(req, res) {
  try {
    const { id } = req.params;
    const { name_th, name_en, description } = req.body;
    
    // Validation
    if (!name_th) {
      return res.status(400).json({ error: 'Department name in Thai is required' });
    }
    
    const success = await updateDepartment(id, { name_th, name_en, description });
    
    if (!success) {
      return res.status(404).json({ error: 'Department not found' });
    }
    
    const updatedDepartment = await getDepartmentById(id);
    
    res.json({
      message: 'Department updated successfully',
      department: updatedDepartment
    });
  } catch (error) {
    console.error('Error updating department:', error);
    res.status(500).json({ error: 'Failed to update department' });
  }
}

// Delete department
async function deleteDepartmentHandler(req, res) {
  try {
    const { id } = req.params;
    
    await deleteDepartment(id);
    
    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    console.error('Error deleting department:', error);
    
    if (error.message.includes('Cannot delete department')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to delete department' });
  }
}

module.exports = {
  getDepartments,
  getDepartment,
  createDepartmentHandler,
  updateDepartmentHandler,
  deleteDepartmentHandler
}; 