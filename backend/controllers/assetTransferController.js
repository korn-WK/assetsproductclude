const pool = require('../lib/db.js');

// GET /api/asset-transfers?status=pending
exports.getAssetTransfers = async (req, res) => {
  const { status, forVerification } = req.query;
  const user = req.user;
  let where = '';
  let params = [];

  if (forVerification === '1') {
    // Transfer In: เฉพาะปลายทาง
    where = 'WHERE t.to_department_id = ?';
    params = [user.department_id];
  } else if (forVerification === 'history') {
    // Transfer Out: เฉพาะต้นทาง
    where = 'WHERE t.from_department_id = ?';
    params = [user.department_id];
  } else {
    // สำหรับ asset table: ทุก role เห็น transfer pending ทั้งหมด
    where = '';
    params = [];
  }

  if (status && status !== 'all') {
    where += (where ? ' AND ' : 'WHERE ') + 't.status = ?';
    params.push(status);
  }

  const [rows] = await pool.query(`
    SELECT t.*, 
      a.name as asset_name, 
      a.image_url as image_url,
      fd.name_th as from_department_name, 
      td.name_th as to_department_name, 
      u1.name as requested_by_name, 
      u2.name as approved_by_name
    FROM asset_transfers t
    JOIN assets a ON t.asset_id = a.id
    LEFT JOIN departments fd ON t.from_department_id = fd.id
    LEFT JOIN departments td ON t.to_department_id = td.id
    LEFT JOIN users u1 ON t.requested_by = u1.id
    LEFT JOIN users u2 ON t.approved_by = u2.id
    ${where}
    ORDER BY t.requested_at DESC
  `, params);
  res.json(rows);
};

// PATCH /api/asset-transfers/:id/approve
exports.approveAssetTransfer = async (req, res) => {
  const { id } = req.params;
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  // 1. ดึงข้อมูล transfer
  const [[transfer]] = await pool.query('SELECT * FROM asset_transfers WHERE id = ?', [id]);
  if (!transfer || transfer.status !== 'pending') return res.status(404).json({ error: 'Not found' });
  // 2. อัปเดต asset
  await pool.query('UPDATE assets SET department_id = ? WHERE id = ?', [transfer.to_department_id, transfer.asset_id]);
  // 3. อัปเดต transfer
  const [result] = await pool.query('UPDATE asset_transfers SET status = "approved", approved_by = ?, approved_at = NOW() WHERE id = ?', [req.user.id, id]);
  if (result.affectedRows === 0) {
    console.error('Failed to update asset_transfers status to approved for id', id);
    return res.status(500).json({ error: 'Failed to update transfer status' });
  }
  res.json({ success: true });
};

// PATCH /api/asset-transfers/:id/reject
exports.rejectAssetTransfer = async (req, res) => {
  const { id } = req.params;
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const [result] = await pool.query('UPDATE asset_transfers SET status = "rejected", approved_by = ?, approved_at = NOW() WHERE id = ?', [req.user.id, id]);
  if (result.affectedRows === 0) {
    console.error('Failed to update asset_transfers status to rejected for id', id);
    return res.status(500).json({ error: 'Failed to update transfer status' });
  }
  res.json({ success: true });
};

// GET /api/asset-transfers/history/:assetId
exports.getAssetTransferHistory = async (req, res) => {
  const { assetId } = req.params;
  
  try {
    const [rows] = await pool.query(`
      SELECT t.*, 
        fd.name_th as from_department_name, 
        td.name_th as to_department_name, 
        u1.name as requested_by_name, 
        u2.name as approved_by_name
      FROM asset_transfers t
      LEFT JOIN departments fd ON t.from_department_id = fd.id
      LEFT JOIN departments td ON t.to_department_id = td.id
      LEFT JOIN users u1 ON t.requested_by = u1.id
      LEFT JOIN users u2 ON t.approved_by = u2.id
      WHERE t.asset_id = ?
      ORDER BY t.requested_at DESC
    `, [assetId]);
    
    res.json(rows);
  } catch (error) {
    console.error('Error fetching asset transfer history:', error);
    res.status(500).json({ error: 'Failed to fetch transfer history' });
  }
}; 