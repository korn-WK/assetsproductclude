const pool = require('../lib/db');

// Get all departments
async function getAllDepartments() {
  const [rows] = await pool.query('SELECT * FROM departments ORDER BY name_th');
  return rows;
}

// Get department by ID
async function getDepartmentById(id) {
  const [rows] = await pool.query('SELECT * FROM departments WHERE id = ?', [id]);
  return rows[0];
}

// Create new department
async function createDepartment(departmentData) {
  const { name_th, name_en, description } = departmentData;
  const [result] = await pool.query(
    'INSERT INTO departments (name_th, name_en, description) VALUES (?, ?, ?)',
    [name_th, name_en, description]
  );
  return result.insertId;
}

// Update department
async function updateDepartment(id, departmentData) {
  const { name_th, name_en, description } = departmentData;
  const [result] = await pool.query(
    'UPDATE departments SET name_th = ?, name_en = ?, description = ? WHERE id = ?',
    [name_th, name_en, description, id]
  );
  return result.affectedRows > 0;
}

// Delete department
async function deleteDepartment(id) {
  // Check if department is being used by any assets
  const [assetRows] = await pool.query('SELECT COUNT(*) as count FROM assets WHERE department_id = ?', [id]);
  const assetCount = assetRows[0].count;
  
  // Check if department is being used by any users
  const [userRows] = await pool.query('SELECT COUNT(*) as count FROM users WHERE department_id = ?', [id]);
  const userCount = userRows[0].count;

  // If department is being used, throw detailed error
  if (assetCount > 0 || userCount > 0) {
    let errorMessage = 'Cannot delete department: ';
    const reasons = [];
    
    if (assetCount > 0) {
      reasons.push(`${assetCount} asset(s)`);
    }
    if (userCount > 0) {
      reasons.push(`${userCount} user(s)`);
    }
    
    errorMessage += `It is being used by ${reasons.join(' and ')}`;
    throw new Error(errorMessage);
  }

  const [result] = await pool.query('DELETE FROM departments WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = {
  getAllDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment
}; 