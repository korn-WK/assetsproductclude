const pool = require('../lib/db');

// Get all locations
async function getAllLocations() {
  const [rows] = await pool.query('SELECT * FROM asset_locations ORDER BY name');
  return rows;
}

// Get location by ID
async function getLocationById(id) {
  const [rows] = await pool.query('SELECT * FROM asset_locations WHERE id = ?', [id]);
  return rows[0];
}

// Create new location
async function createLocation(locationData) {
  const { name, description, address } = locationData;
  const [result] = await pool.query(
    'INSERT INTO asset_locations (name, description, address) VALUES (?, ?, ?)',
    [name, description, address]
  );
  return result.insertId;
}

// Update location
async function updateLocation(id, locationData) {
  const { name, description, address } = locationData;
  const [result] = await pool.query(
    'UPDATE asset_locations SET name = ?, description = ?, address = ? WHERE id = ?',
    [name, description, address, id]
  );
  return result.affectedRows > 0;
}

// Delete location
async function deleteLocation(id) {
  // Check if location is being used by any assets
  const [assetRows] = await pool.query('SELECT COUNT(*) as count FROM assets WHERE location_id = ?', [id]);
  if (assetRows[0].count > 0) {
    throw new Error('Cannot delete location: It is being used by assets');
  }

  const [result] = await pool.query('DELETE FROM asset_locations WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = {
  getAllLocations,
  getLocationById,
  createLocation,
  updateLocation,
  deleteLocation
}; 