const db = require('../lib/db');

exports.getAllUsers = async (req, res) => {
  const query = `
    SELECT 
      u.id, 
      u.username, 
      u.name,
      u.email, 
      u.role, 
      u.department_id, 
      d.name_th as department_name, 
      u.is_active,
      u.picture,
      u.created_at
    FROM users u
    LEFT JOIN departments d ON u.department_id = d.id
    ORDER BY u.id ASC
  `;

  try {
    const [results] = await db.query(query);
    res.json(results);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Database error' });
  }
};

exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, email, role, department_id } = req.body;

  // Basic validation
  if (!name || !email || !role) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const query = `
    UPDATE users 
    SET name = ?, email = ?, role = ?, department_id = ?
    WHERE id = ?
  `;
  
  // Convert empty string or undefined department_id to null
  const finalDepartmentId = (department_id === '' || department_id === undefined) ? null : department_id;

  try {
    await db.query(query, [name, email, role, finalDepartmentId, id]);
    // Fetch the updated user data to send back, ensuring we get the correct department name
    const [updatedUserRows] = await db.query(
      `SELECT u.id, u.username, u.name, u.email, u.role, u.department_id, d.name_th as department_name, u.picture, u.created_at
       FROM users u 
       LEFT JOIN departments d ON u.department_id = d.id 
       WHERE u.id = ?`, [id]
    );

    if (updatedUserRows.length === 0) {
      return res.status(404).json({ error: 'User not found after update' });
    }

    res.json(updatedUserRows[0]);
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ error: 'Database error' });
  }
};

exports.deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await db.query('DELETE FROM users WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Error deleting user:', err);
    // Handle foreign key constraint error specifically
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({ error: 'Cannot delete user. They are linked to existing assets.' });
    }
    res.status(500).json({ error: 'Database error' });
  }
}; 

// Create a new user (manual add, for SuperAdmin)
exports.createUser = async (req, res) => {
  const { username, name, email, role, department_id } = req.body;

  // Basic validation
  if (!username || !name || !email || !role) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Normalize role (robust)
  let normalizedRole = '';
  if (role) {
    let roleRaw = role.toString().trim().toLowerCase().replace(/\s|_/g, '');
    // Map common variants
    if (roleRaw === 'user') normalizedRole = 'User';
    else if (roleRaw === 'admin') normalizedRole = 'Admin';
    else if (roleRaw === 'superadmin' || roleRaw === 'superadministrator' || roleRaw === 'superadminuser') normalizedRole = 'SuperAdmin';
    else normalizedRole = role.toString().trim();
  }
  console.log('role received:', role, 'normalized:', normalizedRole);
  const allowedRoles = ['SuperAdmin', 'Admin', 'User'];
  if (!allowedRoles.includes(normalizedRole)) {
    return res.status(400).json({ error: 'Invalid role', received: normalizedRole });
  }

  // Check for duplicate username or email
  try {
    const [existing] = await db.query('SELECT id FROM users WHERE username = ? OR email = ?', [username, email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Database error' });
  }

  // Insert user (no password, as login is via Google OAuth)
  try {
    const [result] = await db.query(
      'INSERT INTO users (username, name, email, role, department_id, is_active, password_hash) VALUES (?, ?, ?, ?, ?, 1, "")',
      [username, name, email, normalizedRole, department_id || null]
    );
    // Fetch the created user with department name
    const [rows] = await db.query(
      `SELECT u.id, u.username, u.name, u.email, u.role, u.department_id, d.name_th as department_name, u.picture, u.created_at
       FROM users u LEFT JOIN departments d ON u.department_id = d.id WHERE u.id = ?`,
      [result.insertId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ error: 'Database error' });
  }
}; 