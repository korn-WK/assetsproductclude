const pool = require("../lib/db.js");

exports.getUserEditWindow = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT start_date, end_date FROM system_settings WHERE key_name = 'user_edit_window'");
    if (rows && rows.length > 0) {
      res.json({ start_date: rows[0].start_date, end_date: rows[0].end_date });
    } else {
      // Return empty response instead of 404 when no settings found
      res.json({ start_date: null, end_date: null });
    }
  } catch (err) {
    console.error('Error in getUserEditWindow:', err);
    res.status(500).json({ error: 'Database error' });
  }
};

exports.setUserEditWindow = async (req, res) => {
  try {
    const { start_date, end_date } = req.body;
    
    // Check if record exists
    const [existing] = await pool.query("SELECT id FROM system_settings WHERE key_name = 'user_edit_window'");
    
    if (existing && existing.length > 0) {
      // Update existing record
      await pool.query(
        "UPDATE system_settings SET start_date = ?, end_date = ? WHERE key_name = 'user_edit_window'",
        [start_date, end_date]
      );
    } else {
      // Insert new record
      await pool.query(
        "INSERT INTO system_settings (key_name, start_date, end_date) VALUES ('user_edit_window', ?, ?)",
        [start_date, end_date]
      );
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error in setUserEditWindow:', err);
    res.status(500).json({ error: 'Database error' });
  }
}; 