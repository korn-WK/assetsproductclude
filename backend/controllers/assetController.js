const {
  findAssetByBarcode,
  updateAssetStatus,
  getAllAssets,
  getAssetsByUserDepartment,
  getAssetStats,
  getAssetSummary,
  getAssetReport,
  searchAssets,
  searchAssetsByUserDepartment,
  updateAsset,
  getAssetById,
  getDepartmentIdByName,
  getUserIdByName,
  getDepartmentNameById,
  getUserNameById,
  getAllDepartments,
  getAllLocations,
  getLocationIdByName,
  deleteAsset,
  createAsset,
  validateAssetStatus,
  VALID_STATUSES,
  createAssetTransfer,
  getValidStatuses,
} = require("../models/asset.js");

const { createAssetAudit, getAssetAudits } = require("../models/assetAudit.js");
const { getOriginalRole } = require("./authController.js");

const { pool } = require("../lib/db.js");

// Helper function to transform asset data consistently for the frontend
const transformAsset = (asset) => {
  let imageUrl = null;
  if (asset.image_url) {
    if (
      asset.image_url.startsWith("http://") ||
      asset.image_url.startsWith("https://")
    ) {
      imageUrl = asset.image_url;
    } else {
      imageUrl = `${process.env.SERVER_URL || "http://localhost:4000"}${asset.image_url}`;
    }
  }

  return {
    id: asset.id.toString(),
    asset_code: asset.asset_code,
    inventory_number: asset.inventory_number || null,
    serial_number: asset.serial_number || null,
    name: asset.name,
    description: asset.description,
    location_id: asset.location_id || null,
    location: asset.location_name || null,
    room: asset.room || null,
    department: asset.department_name || null,
    department_id: asset.department_id || null,
    owner: asset.owner_name || null,
    owner_id: asset.owner_id || null,
    status: asset.status,
    status_color: asset.status_color || null,
    image_url: imageUrl,
    acquired_date: asset.acquired_date,
    created_at: asset.created_at,
    updated_at: asset.updated_at,
  };
};

// Helper to format datetime string for DB insertion to avoid timezone conversion
const formatDateTimeForDB = (dateString) => {
  if (!dateString || typeof dateString !== "string") {
    return null;
  }
  // The input from the frontend is 'YYYY-MM-DDTHH:mm'.
  // We explicitly format it to 'YYYY-MM-DD HH:mm:ss' to ensure
  // the database driver interprets it as a literal datetime string.
  return dateString.replace("T", " ") + ":00";
};

async function getAssetByBarcode(req, res) {
  try {
    const { barcode } = req.params;
    if (!barcode || barcode.trim() === '') {
      return res.status(400).json({ error: "Barcode is required" });
    }
    
    const cleanBarcode = barcode.trim();
    console.log(`Searching for barcode: "${cleanBarcode}"`);
    
    const asset = await findAssetByBarcode(cleanBarcode);
    if (!asset) {
      console.log(`Asset not found for barcode: "${cleanBarcode}"`);
      return res.status(404).json({ error: "Asset not found" });
    }
    
    console.log(`Found asset: ${asset.name} (ID: ${asset.id}, Asset Code: ${asset.asset_code}, Inventory Number: ${asset.inventory_number})`);
    const transformedAsset = transformAsset(asset);
    res.json(transformedAsset);
  } catch (error) {
    console.error("Error fetching asset by barcode:", error);
    res.status(500).json({ error: "Failed to fetch asset" });
  }
}

async function patchAssetStatus(req, res) {
  try {
    const { barcode } = req.params;
    const { status, note } = req.body;
    const user = req.user;

    // Check if user can update status (SuperAdmin or user/admin with department)
    const userRoleHash = user.role;
    const originalUserRole = getOriginalRole(userRoleHash);
    if (originalUserRole !== 'SuperAdmin' && originalUserRole !== 'Admin' && user.department_id === null) {
      return res.status(403).json({ 
        error: "Access denied. Users without department assignment can only view assets. Please contact your administrator to assign a department." 
      });
    }

    if (!barcode || barcode.length !== 15) {
      return res.status(400).json({ error: "Barcode must be 15 digits" });
    }

    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    // Validate status
    if (!validateAssetStatus(status)) {
      return res.status(400).json({
        error: `Invalid status: ${status}. Valid statuses are: ${VALID_STATUSES.join(", ")}`,
      });
    }

    // Get asset by barcode to find asset id and department id
    const asset = await findAssetByBarcode(barcode);
    if (!asset) {
      return res.status(404).json({ error: "Asset not found" });
    }

    // ไม่อัปเดต status ใน assets ทันที ให้สร้าง audit log pending เท่านั้น
    await createAssetAudit({
      asset_id: asset.id,
      user_id: user.id,
      department_id: asset.department_id,
      status,
      note: note || null,
    });

    res.json({ message: "Request submitted and pending approval" });
  } catch (error) {
    console.error("Error updating asset status:", error);
    res.status(500).json({ error: "Failed to submit status change request" });
  }
}

async function getAssets(req, res) {
  try {
    // Get user's department_id and role from the JWT token
    const userDepartmentId = req.user.department_id;
    const userRoleHash = req.user.role;
    const originalUserRole = getOriginalRole(userRoleHash); // Convert hash back to original role
    const { acquired_date, department } = req.query;

    let assets;
    // ถ้ามี query department (ชื่อแผนก) ให้ filter ด้วย department นั้น
    if (department && department !== "All Departments") {
      // แปลงชื่อแผนกเป็น id
      const departmentId = await getDepartmentIdByName(department);
      if (!departmentId) {
        return res.status(400).json({ error: "Invalid department name" });
      }
      assets = await getAssetsByUserDepartment(departmentId);
    } else if (originalUserRole === "SuperAdmin") {
      // SuperAdmin เห็น asset ทั้งหมด
      assets = await getAllAssets();
    } else {
      assets = await getAssetsByUserDepartment(userDepartmentId);
    }

    // filter acquired_date ถ้ามี
    if (acquired_date) {
      assets = assets.filter(
        (asset) =>
          asset.acquired_date && asset.acquired_date.startsWith(acquired_date)
      );
    }

    // --- เพิ่ม logic เช็ค pending audit log ต่อ asset ---
    const { getAssetAudits } = require("../models/assetAudit.js");
    // ดึง audit log pending ทั้งหมด (confirmed = 0)
    const pendingAudits = await getAssetAudits({ confirmed: 0, limit: 1000, offset: 0 });
    // map asset_id ที่มี pending audit
    const pendingMap = {};
    for (const audit of pendingAudits) {
      pendingMap[audit.asset_id] = audit.status; // เก็บ status ที่ pending
    }

    const transformedAssets = assets.map(asset => {
      const transformed = transformAsset(asset);
      if (pendingMap[asset.id]) {
        // ถ้ามี pending audit log ให้เพิ่ม field
        transformed.pending_status = pendingMap[asset.id]; // เช่น 'broken', 'missing', ...
        transformed.has_pending_audit = true;
      } else {
        transformed.pending_status = null;
        transformed.has_pending_audit = false;
      }
      return transformed;
    });
    res.json(transformedAssets);
  } catch (error) {
    console.error("Error fetching assets:", error);
    res.status(500).json({ error: "Failed to fetch assets" });
  }
}

async function getStats(req, res) {
  try {
    // Get user's department_id and role from the JWT token
    const userDepartmentId = req.user.department_id;
    const userRoleHash = req.user.role;
    const originalUserRole = getOriginalRole(userRoleHash); // Convert hash back to original role
    const { year, department } = req.query;

    let assets;

    if (department && department !== 'All Departments') {
      // filter ตาม department ที่เลือก
      const departmentId = await getDepartmentIdByName(department);
      if (!departmentId) {
        return res.status(400).json({ error: "Invalid department name" });
      }
      assets = await getAssetsByUserDepartment(departmentId);
    } else if (originalUserRole === "SuperAdmin" || originalUserRole === "admin") {
      assets = await getAllAssets();
    } else {
      assets = await getAssetsByUserDepartment(userDepartmentId);
    }

    // Get all statuses from statuses table
    const { getAllStatuses } = require("../models/status.js");
    const allStatuses = await getAllStatuses();

    // Dynamic status count (ภาษาไทยหรืออะไรก็ได้)
    const statusCounts = {};
    assets.forEach(asset => {
      statusCounts[asset.status] = (statusCounts[asset.status] || 0) + 1;
    });

    // Create statuses array with all statuses from statuses table, including those with 0 count
    console.log('getStats: allStatuses:', allStatuses);
    console.log('getStats: statusCounts:', statusCounts);
    const statuses = allStatuses.map(status => ({
      status: status.label, // Use the label for display
      count: statusCounts[status.value] || 0 // Count from assets using value, default to 0
    })).sort((a, b) => a.status.localeCompare(b.status, 'th'));
    console.log('getStats: final statuses array:', statuses);

    // Calculate monthly data for chart (12 months of selected year)
    let targetYear = parseInt(year);
    if (isNaN(targetYear)) {
      targetYear = new Date().getFullYear();
    }
    const monthlyData = [];
    for (let m = 0; m < 12; m++) {
      const date = new Date(targetYear, m, 1);
      const monthName = date.toLocaleDateString("en-US", { month: "short" });
      // Count assets acquired in this month of the selected year
      const assetsInMonth = assets.filter((asset) => {
        const acquiredDate = new Date(asset.acquired_date);
        return (
          acquiredDate.getFullYear() === targetYear &&
          acquiredDate.getMonth() === m
        );
      }).length;
      monthlyData.push({
        month: monthName,
        count: assetsInMonth,
      });
    }

    const stats = {
      total: assets.length,
      statuses, // array of { status, count }
      monthlyData,
    };

    res.json(stats);
  } catch (error) {
    console.error("Error fetching asset stats:", error);
    res.status(500).json({ error: "Failed to fetch asset stats" });
  }
}

async function getSummary(req, res) {
  const summary = await getAssetSummary();
  res.json(summary);
}

async function getReport(req, res) {
  const report = await getAssetReport();
  res.json(report);
}

// Controller for searching assets
async function searchAssetsController(req, res) {
  try {
    const query = req.query.q || "";
    const userDepartmentId = req.user.department_id;
    const userRoleHash = req.user.role;
    const originalUserRole = getOriginalRole(userRoleHash); // Convert hash back to original role

    console.log("Search request received:");
    console.log("- Query:", query);
    console.log("- User department ID:", userDepartmentId);
    console.log("- User role:", originalUserRole);
    console.log("- User object:", req.user);

    if (!query) {
      console.log("Empty query, returning all assets for user department");
      // Return all assets filtered by user's department if search is empty
      let allAssets;
      if (originalUserRole === "SuperAdmin") {
        // SuperAdmin เห็น asset ทั้งหมด
        allAssets = await getAllAssets();
      } else {
        allAssets = await getAssetsByUserDepartment(userDepartmentId);
      }
      console.log("Found", allAssets.length, "assets for user department");
      return res.json(allAssets.map(transformAsset));
    }

    console.log("Searching assets with query:", query);
    let assets;
    if (originalUserRole === "SuperAdmin") {
      // SuperAdmin ค้นหาใน asset ทั้งหมด
      assets = await searchAssets(query);
    } else {
      assets = await searchAssetsByUserDepartment(query, userDepartmentId);
    }
    console.log("Search found", assets.length, "assets");
    res.json(assets.map(transformAsset));
  } catch (error) {
    console.error("Error searching assets:", error);
    res.status(500).json({ error: "Failed to search assets" });
  }
}

// Update asset by ID
async function updateAssetById(req, res) {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const user = req.user;

    // Check if user can edit (SuperAdmin or user with department)
    const userRoleHash = user.role;
    const originalUserRole = getOriginalRole(userRoleHash);
    if (originalUserRole !== 'SuperAdmin' && originalUserRole !== 'Admin' && user.department_id === null) {
      return res.status(403).json({ 
        error: "Access denied. Users without department assignment can only view assets. Please contact your administrator to assign a department." 
      });
    }

    // Explicitly format acquired_date to prevent driver timezone conversion
    if (updateData.acquired_date) {
      updateData.acquired_date = formatDateTimeForDB(updateData.acquired_date);
    }

    // Validate status using new validateAssetStatus
    if (updateData.status) {
      const { isValid, validStatuses } = await validateAssetStatus(updateData.status);
      if (!isValid) {
        throw new Error(
          `สถานะไม่ถูกต้อง: ${updateData.status}. สถานะที่อนุญาตคือ: ${validStatuses.join(", ")}`
        );
      }
    }

    // Remove fields that shouldn't be updated
    delete updateData.id;
    delete updateData.created_at;
    delete updateData.updated_at;

    // Map frontend fields to database fields
    const departmentId = updateData.department_id || await getDepartmentIdByName(updateData.department);
    const ownerId = req.user.id;
    const locationId = updateData.location_id || null;

    const mappedData = {
      ...updateData,
      department_id: departmentId,
      owner_id: ownerId,
      location_id: locationId,
    };

    // ตรวจสอบว่าเปลี่ยน department หรือ status หรือทั้งสอง
    const assetBefore = await getAssetById(id);
    const isDepartmentChanged = departmentId && departmentId !== assetBefore.department_id;
    const isStatusChanged = updateData.status && updateData.status !== assetBefore.status;
    if (isDepartmentChanged && isStatusChanged) {
      return res.status(400).json({ error: 'Cannot transfer department and verify status at the same time. Please do one action at a time.' });
    }
    // ตรวจนับ: สร้าง audit log เฉพาะเมื่อเปลี่ยน status (และ department ไม่เปลี่ยน)
    if (isStatusChanged && !isDepartmentChanged) {
      await createAssetAudit({
        asset_id: assetBefore.id,
        user_id: user.id,
        department_id: assetBefore.department_id,
        status: updateData.status,
        note: updateData.note || null,
      });
      delete mappedData.status;
    }
    // โอนย้าย: สร้าง transfer เฉพาะเมื่อเปลี่ยน department (และ status ไม่เปลี่ยน)
    if (isDepartmentChanged && !isStatusChanged) {
      await createAssetTransfer({
        asset_id: id,
        from_department_id: assetBefore.department_id,
        to_department_id: departmentId,
        requested_by: user.id,
        note: updateData.note || null,
      });
      delete mappedData.department_id;
    }

    const success = await updateAsset(id, mappedData);

    if (success) {
      // Get the updated asset
      const updatedAsset = await getAssetById(id);
      if (updatedAsset) {
        res.json(transformAsset(updatedAsset));
      } else {
        res.status(404).json({ error: "Asset not found after update" });
      }
    } else {
      res.status(404).json({ error: "Asset not found or update failed" });
    }
  } catch (error) {
    console.error("Error updating asset:", error, req.params, req.body);
    res.status(500).json({ error: "Failed to update asset" });
  }
}

// Delete asset by ID
async function deleteAssetById(req, res) {
  try {
    const { id } = req.params;
    const user = req.user;

    // Check if user can delete (SuperAdmin only)
    const userRoleHash = user.role;
    const originalUserRole = getOriginalRole(userRoleHash);
    if (originalUserRole !== 'SuperAdmin') {
      return res.status(403).json({ 
        error: "Access denied. Only SuperAdmins can delete assets." 
      });
    }

    console.log("Deleting asset:", id);

    const success = await deleteAsset(id);

    if (success) {
      res.json({ message: "Asset deleted successfully" });
    } else {
      res.status(404).json({ error: "Asset not found or delete failed" });
    }
  } catch (error) {
    console.error("Error deleting asset:", error);
    res.status(500).json({ error: "Failed to delete asset" });
  }
}

// Get all departments for dropdown
async function getDepartments(req, res) {
  try {
    const departments = await getAllDepartments();
    res.json(departments);
  } catch (error) {
    console.error("Error fetching departments:", error);
    res.status(500).json({ error: "Failed to fetch departments" });
  }
}

// Get all locations for dropdown
async function getLocations(req, res) {
  try {
    const locations = await getAllLocations();
    res.json(locations);
  } catch (error) {
    console.error("Error fetching locations:", error);
    res.status(500).json({ error: "Failed to fetch locations" });
  }
}

// Get all users for dropdown
async function getUsers(req, res) {
  try {
    pool.query(
      "SELECT id, name FROM users WHERE is_active = 1 ORDER BY name",
      (error, results) => {
        if (error) {
          console.error("Error fetching users from DB:", error);
          return res.status(500).json({ error: "Failed to fetch users" });
        }
        res.json(results);
      }
    );
  } catch (error) {
    console.error("Error in getUsers controller:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
}

// Create a new asset
async function createAssetController(req, res) {
  try {
    const assetData = req.body;
    const creatorId = req.user.id; // Get creator's ID from authenticated user token
    const user = req.user;

    // Check if user can create (SuperAdmin or user with department)
    const userRoleHash = user.role;
    const originalUserRole = getOriginalRole(userRoleHash);
    if (originalUserRole !== 'SuperAdmin' && originalUserRole !== 'Admin' && user.department_id === null) {
      return res.status(403).json({ 
        error: "Access denied. Users without department assignment cannot create assets. Please contact your administrator to assign a department." 
      });
    }

    // Explicitly format acquired_date to prevent driver timezone conversion
    if (assetData.acquired_date) {
      assetData.acquired_date = formatDateTimeForDB(assetData.acquired_date);
    }

    // Basic validation
    if (!assetData.name) {
      return res
        .status(400)
        .json({ error: "Asset name is required" });
    }

    // Validate status if provided
    if (assetData.status && !validateAssetStatus(assetData.status)) {
      return res.status(400).json({
        error: `Invalid status: ${
          assetData.status
        }. Valid statuses are: ${VALID_STATUSES.join(", ")}`,
      });
    }

    // Map names to IDs before insertion
    // Use department_id directly from frontend instead of mapping department name
    const departmentId = assetData.department_id || await getDepartmentIdByName(assetData.department);
    // Use location_id directly from frontend instead of mapping location name
    const locationId = assetData.location_id || null;

    const mappedData = {
      ...assetData,
      department_id: departmentId,
      owner_id: creatorId, // Use the creator's ID as the owner
      location_id: locationId,
    };

    // The owner name from the body is ignored for security
    delete mappedData.owner;

    const newAssetId = await createAsset(mappedData);
    const newAsset = await getAssetById(newAssetId);

    res.status(201).json(transformAsset(newAsset));
  } catch (error) {
    console.error("Error creating asset:", error);
    res.status(500).json({ error: "Failed to create asset" });
  }
}

// Dashboard Graphs API (Line, Bar, Donut)
async function getDashboardGraphs(req, res) {
  try {
    const assets = await getAllAssets();
    // Line Chart: Assets acquired per month
    const months = Array.from({ length: 12 }, (_, i) =>
      new Date(0, i).toLocaleString("en-US", { month: "short" })
    );
    const lineData = months.map(
      (_, m) =>
        assets.filter((a) => {
          if (!a.acquired_date) return false;
          const d = new Date(a.acquired_date);
          return d.getMonth() === m;
        }).length
    );
    // กำหนด status หลักที่ต้องการแสดงในกราฟ
    const mainStatuses = ['พร้อมใช้งาน', 'ชำรุด', 'รอโอนย้าย', 'สูญหาย'];
    // Dynamic statuses (ภาษาไทย)
    const allStatuses = Array.from(new Set(assets.map(a => a.status)))
      .filter(s => mainStatuses.includes(s))
      .sort((a, b) => a.localeCompare(b, 'th'));
    // Bar Chart: Status per month (เฉพาะ status หลัก)
    const barSeries = allStatuses.map((status) => ({
      name: status,
      data: months.map(
        (_, m) =>
          assets.filter((a) => {
            if (!a.acquired_date) return false;
            const d = new Date(a.acquired_date);
            return d.getMonth() === m && a.status === status;
          }).length
      ),
    }));
    // Donut Chart: Status distribution
    const donutData = allStatuses.map(
      (status) => assets.filter((a) => a.status === status).length
    );
    res.json({
      line: { labels: months, data: lineData },
      bar: { labels: months, series: barSeries },
      donut: {
        labels: allStatuses,
        data: donutData,
      },
    });
  } catch (error) {
    console.error("Error in getDashboardGraphs:", error);
    res.status(500).json({ error: "Failed to fetch dashboard graphs data" });
  }
}

// ดึง log ตรวจนับทั้งหมด (pending + approved)
async function getAssetAuditList(req, res) {
  try {
    const user = req.user;
    const userRoleHash = user.role;
    const originalUserRole = getOriginalRole(userRoleHash);
    const filter = {};
    if (originalUserRole !== 'SuperAdmin') {
      filter.department_id = user.department_id;
    }
    // ดึงทั้ง pending และ approved
    const audits = await getAssetAudits({ ...filter, confirmed: null });
    res.json(audits);
  } catch (error) {
    console.error('Error fetching audits:', error);
    res.status(500).json({ error: 'Failed to fetch audits' });
  }
}

// ยืนยันรายการตรวจนับแบบ batch (ids[])
async function confirmAssetAudits(req, res) {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No audit ids provided' });
    }
    // 1. อัปเดต confirmed = 1 ใน asset_audits
    const pool = require('../lib/db.js');
    await pool.query(
      `UPDATE asset_audits SET confirmed = 1 WHERE id IN (${ids.map(() => '?').join(',')})`,
      ids
    );
    // 2. อัปเดต status จริงใน assets table ตาม log ล่าสุดที่ถูก confirm
    // (อัปเดตเฉพาะ log ที่ถูก confirm)
    const [rows] = await pool.query(
      `SELECT asset_id, status FROM asset_audits WHERE id IN (${ids.map(() => '?').join(',')})`,
      ids
    );
    for (const row of rows) {
      await pool.query('UPDATE assets SET status = ? WHERE id = ?', [row.status, row.asset_id]);
    }
    res.json({ message: 'Confirmed successfully' });
  } catch (error) {
    console.error('Error confirming audits:', error);
    res.status(500).json({ error: 'Failed to confirm audits' });
  }
}

// ดูประวัติการตรวจนับย้อนหลังของแต่ละ asset
async function getAssetAuditHistory(req, res) {
  try {
    const { assetId } = req.params;
    const audits = await getAssetAudits({ asset_id: assetId });
    res.json(audits);
  } catch (error) {
    console.error('Error fetching audit history:', error);
    res.status(500).json({ error: 'Failed to fetch audit history' });
  }
}

// ดึง log ตรวจนับทั้งหมด (สำหรับ superadmin, รองรับ pagination)
async function getAllAssetAudits(req, res) {
  try {
    const userRoleHash = req.user?.role;
    const originalUserRole = getOriginalRole(userRoleHash);
    if (!req.user || originalUserRole !== 'SuperAdmin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const department_id = req.query.department_id ? parseInt(req.query.department_id) : null;
    // นับจำนวนทั้งหมด
    const pool = require('../lib/db.js');
    let countQuery = 'SELECT COUNT(*) as total FROM asset_audits';
    let countParams = [];
    if (department_id) {
      countQuery += ' WHERE department_id = ?';
      countParams.push(department_id);
    }
    const [countRows] = await pool.query(countQuery, countParams);
    const total = countRows[0].total;
    // ดึงข้อมูลตามหน้า
    const audits = await getAssetAudits({ limit, offset, department_id });
    res.json({ total, audits });
  } catch (error) {
    console.error('Error fetching all asset audits:', error);
    res.status(500).json({ error: 'Failed to fetch all asset audits' });
  }
}

async function getAssetTransferLogs(req, res) {
  const { id } = req.params;
  try {
    const logs = await require('../models/asset').getAssetTransferLogs(id);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch transfer logs' });
  }
}

// GET /api/assets/:id - ดึงข้อมูล asset รายตัวแบบละเอียด
async function getAssetDetailById(req, res) {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: 'Asset ID is required' });
    const asset = await getAssetById(id);
    if (!asset) return res.status(404).json({ error: 'Asset not found' });
    const transformed = transformAsset(asset);
    res.json(transformed);
  } catch (error) {
    console.error('Error fetching asset detail:', error);
    res.status(500).json({ error: 'Failed to fetch asset detail' });
  }
}

module.exports = {
  getAssetByBarcode,
  patchAssetStatus,
  getAssets,
  getStats,
  getAssetStats: getStats,
  getSummary,
  getAssetReport,
  searchAssetsController,
  updateAssetById,
  deleteAssetById,
  getDepartments,
  getLocations,
  getUsers,
  createAssetController,
  getDashboardGraphs,
  getAssetAuditList,
  confirmAssetAudits,
  getAssetAuditHistory,
  getAllAssetAudits,
  getAssetTransferLogs,
  getValidStatuses,
  getAssetDetailById,
};
