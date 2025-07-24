const pool = require("../lib/db.js");

exports.getUserEditWindow = async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT start_date, end_date FROM system_settings WHERE key_name = 'user_edit_window'");
    if (rows && rows.length > 0) {
      res.json({ start_date: rows[0].start_date, end_date: rows[0].end_date });
    } else {
      res.status(404).json({ error: 'Not found' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
};

exports.setUserEditWindow = async (req, res) => {
  try {
    const { start_date, end_date } = req.body;
    await pool.query(
      "UPDATE system_settings SET start_date = ?, end_date = ? WHERE key_name = 'user_edit_window'",
      [start_date, end_date]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
}; 