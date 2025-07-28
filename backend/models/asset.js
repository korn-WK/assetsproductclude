const pool = require("../lib/db.js");

// Valid status values for assets (อัปเดตตามคำขอผู้ใช้)
const VALID_STATUSES = [
  "พร้อมใช้งาน",
  "รอใช้งาน",
  "รอตัดจำหน่าย",
  "ชำรุด",
  "รอซ่อม",
  "ระหว่างการปรับปรุง",
  "ไม่มีความจำเป็นต้องใช้",
  "สูญหาย",
  "รอแลกเปลี่ยน",
  "แลกเปลี่ยน",
  "มีกรรมสิทธิ์ภายใต้สัญญาเช่า",
  "รอโอนย้าย",
  "รอโอนกรรมสิทธิ์",
  "ชั่วคราว",
  "ขาย",
  "แปรสภาพ",
  "ทำลาย",
  "สอบข้อเท็จจริง",
  "เงินชดเชยที่ดินและอาสิน",
  "ระหว่างทาง"
];

// Validate asset status (dynamic from DB)
async function getValidStatuses() {
  const [rows] = await pool.query('SELECT value FROM statuses');
  console.log('getValidStatuses:', rows.map(r => r.value));
  return rows.map(r => r.value);
}

async function validateAssetStatus(status) {
  const validStatuses = await getValidStatuses();
  return {
    isValid: validStatuses.includes(status),
    validStatuses
  };
}

// Get all assets with department and location information
async function getAllAssets() {
  const query = `
    SELECT 
      a.id,
      a.asset_code,
      a.inventory_number,
      a.name,
      a.image_url,
      a.room,
      a.status,
      a.department_id,
      d.name_th as department_name,
      a.location_id,
      l.name as location_name,
      a.description,
      a.owner_id,
      a.acquired_date,
      a.created_at,
      a.updated_at,
      s.color as status_color
    FROM assets a
    LEFT JOIN departments d ON a.department_id = d.id
    LEFT JOIN asset_locations l ON a.location_id = l.id
    LEFT JOIN statuses s ON a.status = s.value
    ORDER BY a.id ASC
  `;
  const [rows] = await pool.query(query);
  return rows;
}

// Get assets filtered by user's department_id
async function getAssetsByUserDepartment(userDepartmentId) {
  let query = `
    SELECT 
      a.*,
      d.name_th as department_name,
      u.name as owner_name,
      al.name as location_name,
      s.color as status_color
    FROM assets a
    LEFT JOIN departments d ON a.department_id = d.id
    LEFT JOIN users u ON a.owner_id = u.id
    LEFT JOIN asset_locations al ON a.location_id = al.id
    LEFT JOIN statuses s ON a.status = s.value
  `;

  const params = [];

  // User must have a department_id to see assets
  if (userDepartmentId !== null && userDepartmentId !== undefined) {
    query += ` WHERE a.department_id = ?`;
    params.push(userDepartmentId);
  } else {
    // If user has no department, return empty result
    return [];
  }

  query += ` ORDER BY a.id ASC`;

  try {
    const [rows] = await pool.query(query, params);
    return rows;
  } catch (error) {
    console.error('Error in getAssetsByUserDepartment:', error);
    // If the statuses table doesn't exist, try without it
    if (error.code === 'ER_NO_SUCH_TABLE' || error.message.includes('statuses')) {
      console.log('Statuses table not found, falling back to query without status_color');
      const fallbackQuery = query.replace(', s.color as status_color', '').replace('LEFT JOIN statuses s ON a.status = s.value', '');
      const [rows] = await pool.query(fallbackQuery, params);
      return rows;
    }
    throw error;
  }
}

// Get asset by ID with full details
async function getAssetById(id) {
  const query = `
    SELECT 
      a.*, 
      d.name_th as department_name, 
      u.name as owner_name, 
      al.name as location_name,
      s.color as status_color
    FROM assets a
    LEFT JOIN departments d ON a.department_id = d.id
    LEFT JOIN users u ON a.owner_id = u.id
    LEFT JOIN asset_locations al ON a.location_id = al.id
    LEFT JOIN statuses s ON a.status = s.value
    WHERE a.id = ?
  `;
  const [rows] = await pool.query(query, [id]);
  return rows[0];
}

// Get asset by asset code
async function getAssetByCode(assetCode) {
  const query = `
    SELECT 
      a.*,
      d.name_th as department_name,
      u.name as owner_name,
      al.name as location_name,
      s.color as status_color
    FROM assets a
    LEFT JOIN departments d ON a.department_id = d.id
    LEFT JOIN users u ON a.owner_id = u.id
    LEFT JOIN asset_locations al ON a.location_id = al.id
    LEFT JOIN statuses s ON a.status = s.value
    WHERE a.asset_code = ?
  `;
  const [rows] = await pool.query(query, [assetCode]);
  return rows[0];
}

// Find asset by barcode (inventory_number or asset_code)
async function findAssetByBarcode(barcode) {
  const query = `
    SELECT 
      a.*,
      d.name_th as department_name,
      u.name as owner_name,
      al.name as location_name,
      s.color as status_color
    FROM assets a
    LEFT JOIN departments d ON a.department_id = d.id
    LEFT JOIN users u ON a.owner_id = u.id
    LEFT JOIN asset_locations al ON a.location_id = al.id
    LEFT JOIN statuses s ON a.status = s.value
    WHERE a.inventory_number = ? OR a.asset_code = ?
  `;
  const [rows] = await pool.query(query, [barcode, barcode]);
  return rows[0];
}

// Search assets by a single query string across multiple fields
async function searchAssets(query) {
  const searchQuery = `%${query}%`;
  const sql = `
    SELECT 
      a.*,
      d.name_th as department_name,
      u.name as owner_name,
      al.name as location_name,
      s.color as status_color
    FROM assets a
    LEFT JOIN departments d ON a.department_id = d.id
    LEFT JOIN users u ON a.owner_id = u.id
    LEFT JOIN asset_locations al ON a.location_id = al.id
    LEFT JOIN statuses s ON a.status = s.value
    WHERE a.asset_code LIKE ? 
       OR a.inventory_number LIKE ?
       OR a.name LIKE ? 
       OR a.description LIKE ?
       OR d.name_th LIKE ?
       OR al.name LIKE ?
       OR u.name LIKE ?
       OR a.room LIKE ?
    ORDER BY 
      CASE 
        WHEN a.asset_code LIKE ? THEN 1
        WHEN a.inventory_number LIKE ? THEN 2
        WHEN a.name LIKE ? THEN 3
        ELSE 4
      END,
      a.id ASC
  `;
  const params = [
    searchQuery,
    searchQuery,
    searchQuery,
    searchQuery,
    searchQuery,
    searchQuery,
    searchQuery,
    searchQuery,
    searchQuery,
    searchQuery,
    searchQuery,
  ];

  const [rows] = await pool.query(sql, params);
  return rows;
}

// Search assets filtered by user's department_id
async function searchAssetsByUserDepartment(query, userDepartmentId) {
  // User must have a department_id to search assets
  if (userDepartmentId === null || userDepartmentId === undefined) {
    return [];
  }

  const searchQuery = `%${query}%`;
  let sql = `
    SELECT 
      a.*,
      d.name_th as department_name,
      u.name as owner_name,
      al.name as location_name,
      s.color as status_color
    FROM assets a
    LEFT JOIN departments d ON a.department_id = d.id
    LEFT JOIN users u ON a.owner_id = u.id
    LEFT JOIN asset_locations al ON a.location_id = al.id
    LEFT JOIN statuses s ON a.status = s.value
    WHERE (a.asset_code LIKE ? 
       OR a.inventory_number LIKE ?
       OR a.name LIKE ? 
       OR a.description LIKE ?
       OR d.name_th LIKE ?
       OR al.name LIKE ?
       OR u.name LIKE ?
       OR a.room LIKE ?)
       AND a.department_id = ?
  `;

  const params = [
    searchQuery,
    searchQuery,
    searchQuery,
    searchQuery,
    searchQuery,
    searchQuery,
    searchQuery,
    searchQuery,
    userDepartmentId,
  ];

  sql += ` ORDER BY 
    CASE 
      WHEN a.asset_code LIKE ? THEN 1
      WHEN a.inventory_number LIKE ? THEN 2
      WHEN a.name LIKE ? THEN 3
      ELSE 4
    END,
    a.id ASC`;

  params.push(searchQuery, searchQuery, searchQuery);

  const [rows] = await pool.query(sql, params);
  return rows;
}

// Get assets by department
async function getAssetsByDepartment(departmentId) {
  const query = `
    SELECT 
      a.*,
      d.name_th as department_name,
      u.name as owner_name,
      al.name as location_name,
      s.color as status_color
    FROM assets a
    LEFT JOIN departments d ON a.department_id = d.id
    LEFT JOIN users u ON a.owner_id = u.id
    LEFT JOIN asset_locations al ON a.location_id = al.id
    LEFT JOIN statuses s ON a.status = s.value
    WHERE a.department_id = ?
    ORDER BY a.id ASC
  `;
  const [rows] = await pool.query(query, [departmentId]);
  return rows;
}

// Get asset statistics
async function getAssetStats() {
  const [rows] = await pool.query(
    "SELECT status, COUNT(*) as count FROM assets GROUP BY status"
  );
  return rows;
}

// Get asset summary
async function getAssetSummary() {
  const [[total]] = await pool.query("SELECT COUNT(*) as total FROM assets");
  const [statusRows] = await pool.query(
    "SELECT status, COUNT(*) as count FROM assets GROUP BY status"
  );
  const [departmentRows] = await pool.query(`
    SELECT d.name_th, COUNT(a.id) as count 
    FROM departments d 
    LEFT JOIN assets a ON d.id = a.department_id 
    GROUP BY d.id, d.name_th
  `);

  return {
    total: total.total,
    statuses: statusRows.reduce(
      (acc, s) => ({ ...acc, [s.status]: s.count }),
      {}
    ),
    departments: departmentRows,
  };
}

// Get all departments
async function getAllDepartments() {
  const [rows] = await pool.query("SELECT * FROM departments ORDER BY name_th");
  return rows;
}

// Get all locations
async function getAllLocations() {
  const [rows] = await pool.query(
    "SELECT * FROM asset_locations ORDER BY name"
  );
  return rows;
}

// Get transfer logs for an asset (use asset_transfers instead of transfer_logs)
async function getAssetTransferLogs(assetId) {
  const query = `
    SELECT 
      t.*,
      a.asset_code,
      a.name as asset_name,
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
    WHERE t.asset_id = ?
    ORDER BY t.requested_at DESC
  `;
  const [rows] = await pool.query(query, [assetId]);
  return rows;
}

// Get monthly transfer report
async function getMonthlyTransferReport(year, month) {
  const query = `
    SELECT 
      tl.*,
      a.asset_code,
      a.name as asset_name,
      fd.name_th as from_department,
      td.name_th as to_department,
      u1.name as transferred_by_name,
      u2.name as approved_by_name
    FROM transfer_logs tl
    JOIN assets a ON tl.asset_id = a.id
    LEFT JOIN departments fd ON tl.from_department_id = fd.id
    LEFT JOIN departments td ON tl.to_department_id = td.id
    LEFT JOIN users u1 ON tl.transferred_by = u1.id
    LEFT JOIN users u2 ON tl.approved_by = u2.id
    WHERE YEAR(tl.transfer_date) = ? AND MONTH(tl.transfer_date) = ?
    ORDER BY tl.transfer_date DESC
  `;
  const [rows] = await pool.query(query, [year, month]);
  return rows;
}

// Get department assets report
async function getDepartmentAssetsReport(departmentId = null) {
  let query = `
    SELECT 
      a.*,
      d.name_th as department_name,
      u.name as owner_name,
      al.name as location_name
    FROM assets a
    LEFT JOIN departments d ON a.department_id = d.id
    LEFT JOIN users u ON a.owner_id = u.id
    LEFT JOIN asset_locations al ON a.location_id = al.id
  `;

  const params = [];
  if (departmentId) {
    query += ` WHERE a.department_id = ?`;
    params.push(departmentId);
  }

  query += ` ORDER BY d.name_th, a.asset_code`;

  const [rows] = await pool.query(query, params);
  return rows;
}

// Update asset status
async function updateAssetStatus(assetId, status) {
  // Validate status
  const { isValid, validStatuses } = await validateAssetStatus(status);
  if (!isValid) {
    throw new Error(
      `Invalid status: ${status}. Valid statuses are: ${validStatuses.join(", ")}`
    );
  }

  const [result] = await pool.query(
    "UPDATE assets SET status = ?, updated_at = NOW() WHERE id = ?",
    [status, assetId]
  );
  return result.affectedRows > 0;
}

// Create new asset
async function createAsset(assetData) {
  // Validate status if provided
  if (assetData.status) {
    const { isValid, validStatuses } = await validateAssetStatus(assetData.status);
    if (!isValid) {
      throw new Error(
        `Invalid status: ${assetData.status}. Valid statuses are: ${validStatuses.join(", ")}`
      );
    }
  }

  const query = `
    INSERT INTO assets (
      asset_code, inventory_number, serial_number, name, description, location_id, room,
      status, department_id, owner_id, image_url, acquired_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    assetData.asset_code,
    assetData.inventory_number || null,
    assetData.serial_number || null,
    assetData.name,
    assetData.description,
    assetData.location_id,
    assetData.room || null,
    assetData.status || "active",
    assetData.department_id,
    assetData.owner_id,
    assetData.image_url,
    assetData.acquired_date,
  ];

  const [result] = await pool.query(query, params);
  return result.insertId;
}

// Update asset
async function updateAsset(assetId, assetData) {
  // Validate status if provided
  if (assetData.status) {
    const { isValid, validStatuses } = await validateAssetStatus(assetData.status);
    if (!isValid) {
      throw new Error(
        `Invalid status: ${assetData.status}. Valid statuses are: ${validStatuses.join(", ")}`
      );
    }
  }

  // Build the query dynamically based on provided fields
  const fields = [];
  const params = [];

  const addField = (key, value) => {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      params.push(value);
    }
  };

  addField("asset_code", assetData.asset_code);
  addField("inventory_number", assetData.inventory_number);
  addField("serial_number", assetData.serial_number);
  addField("name", assetData.name);
  addField("description", assetData.description);
  addField("location_id", assetData.location_id);
  addField("room", assetData.room);
  addField("status", assetData.status);
  addField("department_id", assetData.department_id);
  addField("owner_id", assetData.owner_id);
  addField("acquired_date", assetData.acquired_date);

  if (assetData.image_url !== undefined) {
    fields.push("image_url = ?");
    params.push(assetData.image_url);
  }

  if (fields.length === 0) {
    return false; // No fields to update
  }

  fields.push("updated_at = NOW()");

  const query = `UPDATE assets SET ${fields.join(", ")} WHERE id = ?`;
  params.push(assetId);

  const [result] = await pool.query(query, params);
  return result.affectedRows > 0;
}

// Delete asset by ID
async function deleteAsset(assetId) {
  try {
    const [result] = await pool.query("DELETE FROM assets WHERE id = ?", [
      assetId,
    ]);
    return result.affectedRows > 0;
  } catch (error) {
    console.error("Error deleting asset:", error);
    return false;
  }
}

// Create asset transfer request
async function createAssetTransfer({ asset_id, from_department_id, to_department_id, requested_by, note = null }) {
  const query = `
    INSERT INTO asset_transfers (
      asset_id, from_department_id, to_department_id, requested_by, status, note, requested_at
    ) VALUES (?, ?, ?, ?, 'pending', ?, NOW())
  `;
  const params = [asset_id, from_department_id, to_department_id, requested_by, note];
  const [result] = await pool.query(query, params);
  return result.insertId;
}

// Get department ID by name
async function getDepartmentIdByName(departmentName) {
  if (!departmentName) return null;

  try {
    // Try to find by Thai name first
    let [rows] = await pool.query(
      "SELECT id FROM departments WHERE name_th = ?",
      [departmentName]
    );

    // If not found, try English name
    if (rows.length === 0) {
      [rows] = await pool.query(
        "SELECT id FROM departments WHERE name_en = ?",
        [departmentName]
      );
    }

    return rows.length > 0 ? rows[0].id : null;
  } catch (error) {
    console.error("Error getting department ID by name:", error);
    return null;
  }
}

// Get user ID by name
async function getUserIdByName(userName) {
  if (!userName) return null;

  try {
    const [rows] = await pool.query("SELECT id FROM users WHERE name = ?", [
      userName,
    ]);
    return rows.length > 0 ? rows[0].id : null;
  } catch (error) {
    console.error("Error getting user ID by name:", error);
    return null;
  }
}

// Get department name by ID
async function getDepartmentNameById(departmentId) {
  if (!departmentId) return null;

  try {
    const [rows] = await pool.query(
      "SELECT name_th FROM departments WHERE id = ?",
      [departmentId]
    );
    return rows.length > 0 ? rows[0].name_th : null;
  } catch (error) {
    console.error("Error getting department name by ID:", error);
    return null;
  }
}

// Get user name by ID
async function getUserNameById(userId) {
  if (!userId) return null;

  try {
    const [rows] = await pool.query("SELECT name FROM users WHERE id = ?", [
      userId,
    ]);
    return rows.length > 0 ? rows[0].name : null;
  } catch (error) {
    console.error("Error getting user name by ID:", error);
    return null;
  }
}

// Get location ID by name
async function getLocationIdByName(locationName) {
  if (!locationName) return null;

  try {
    const [rows] = await pool.query(
      "SELECT id FROM asset_locations WHERE name = ?",
      [locationName]
    );
    return rows.length > 0 ? rows[0].id : null;
  } catch (error) {
    console.error("Error getting location ID by name:", error);
    return null;
  }
}

// Get location name by ID
async function getLocationNameById(locationId) {
  if (!locationId) return null;
  const [rows] = await pool.query(
    "SELECT name FROM asset_locations WHERE id = ?",
    [locationId]
  );
  return rows[0]?.name || null;
}

module.exports = {
  getAllAssets,
  getAssetsByUserDepartment,
  getAssetById,
  getAssetByCode,
  findAssetByBarcode,
  searchAssets,
  searchAssetsByUserDepartment,
  getAssetsByDepartment,
  getAssetStats,
  getAssetSummary,
  getAllDepartments,
  getAllLocations,
  getAssetTransferLogs,
  getMonthlyTransferReport,
  getDepartmentAssetsReport,
  updateAssetStatus,
  createAsset,
  updateAsset,
  deleteAsset,
  createAssetTransfer,
  getDepartmentIdByName,
  getUserIdByName,
  getDepartmentNameById,
  getUserNameById,
  getLocationIdByName,
  getLocationNameById,
  getValidStatuses,
  validateAssetStatus,
};
