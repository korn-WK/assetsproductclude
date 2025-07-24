const pool = require('../lib/db.js');

async function getAllStatuses() {
  const [rows] = await pool.query('SELECT * FROM statuses ORDER BY id ASC');
  return rows;
}

async function getStatusById(id) {
  const [rows] = await pool.query('SELECT * FROM statuses WHERE id = ?', [id]);
  return rows[0];
}

async function createStatus({ value, label, color }) {
  const [result] = await pool.query('INSERT INTO statuses (value, label, color) VALUES (?, ?, ?)', [value, label, color || '#adb5bd']);
  return { id: result.insertId, value, label, color: color || '#adb5bd' };
}

async function updateStatus(id, { value, label, color }) {
  await pool.query('UPDATE statuses SET value = ?, label = ?, color = ? WHERE id = ?', [value, label, color || '#adb5bd', id]);
  return { id, value, label, color: color || '#adb5bd' };
}

async function deleteStatus(id) {
  await pool.query('DELETE FROM statuses WHERE id = ?', [id]);
  return true;
}

module.exports = {
  getAllStatuses,
  getStatusById,
  createStatus,
  updateStatus,
  deleteStatus,
}; 