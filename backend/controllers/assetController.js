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
} = require("../models/asset.js");

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
    owner: asset.owner_name || null,
    owner_id: asset.owner_id || null,
    status: asset.status,
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
    const { status } = req.body;
    const user = req.user;

    // Check if user can update status (admin or user with department)
    if (user.role !== 'admin' && user.department_id === null) {
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
        error: `Invalid status: ${status}. Valid statuses are: ${VALID_STATUSES.join(
          ", "
        )}`,
      });
    }

    const success = await updateAssetStatus(barcode, status);
    if (!success) {
      return res
        .status(404)
        .json({ error: "Asset not found or status not updated" });
    }

    res.json({ message: "Status updated successfully" });
  } catch (error) {
    console.error("Error updating asset status:", error);
    res.status(500).json({ error: "Failed to update asset status" });
  }
}

async function getAssets(req, res) {
  try {
    // Get user's department_id from the JWT token
    const userDepartmentId = req.user.department_id;
    const { acquired_date, department } = req.query;

    let assets;
    // ถ้ามี query department (ชื่อแผนก) ให้ filter ด้วย department นั้น
    if (department && department !== "All") {
      // แปลงชื่อแผนกเป็น id
      const departmentId = await getDepartmentIdByName(department);
      if (!departmentId) {
        return res.status(400).json({ error: "Invalid department name" });
      }
      assets = await getAssetsByUserDepartment(departmentId);
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

    const transformedAssets = assets.map(transformAsset);
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
    const userRole = req.user.role;
    const { year } = req.query;

    let assets;

    // If user is admin, get all assets; otherwise filter by department
    if (userRole === "admin") {
      assets = await getAllAssets();
    } else {
      assets = await getAssetsByUserDepartment(userDepartmentId);
    }

    // Calculate stats
    const totalAssets = assets.length;
    const activeAssets = assets.filter(
      (asset) => asset.status === "active"
    ).length;
    const brokenAssets = assets.filter(
      (asset) => asset.status === "broken"
    ).length;
    const missingAssets = assets.filter(
      (asset) => asset.status === "missing"
    ).length;
    const transferringAssets = assets.filter(
      (asset) => asset.status === "transferring"
    ).length;
    const auditedAssets = assets.filter(
      (asset) => asset.status === "audited"
    ).length;
    const disposedAssets = assets.filter(
      (asset) => asset.status === "disposed"
    ).length;

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
      totalAssets,
      activeAssets,
      brokenAssets,
      missingAssets,
      transferringAssets,
      auditedAssets,
      disposedAssets,
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

    console.log("Search request received:");
    console.log("- Query:", query);
    console.log("- User department ID:", userDepartmentId);
    console.log("- User object:", req.user);

    if (!query) {
      console.log("Empty query, returning all assets for user department");
      // Return all assets filtered by user's department if search is empty
      const allAssets = await getAssetsByUserDepartment(userDepartmentId);
      console.log("Found", allAssets.length, "assets for user department");
      return res.json(allAssets.map(transformAsset));
    }

    console.log("Searching assets with query:", query);
    const assets = await searchAssetsByUserDepartment(query, userDepartmentId);
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

    // Check if user can edit (admin or user with department)
    if (user.role !== 'admin' && user.department_id === null) {
      return res.status(403).json({ 
        error: "Access denied. Users without department assignment can only view assets. Please contact your administrator to assign a department." 
      });
    }

    // Explicitly format acquired_date to prevent driver timezone conversion
    if (updateData.acquired_date) {
      updateData.acquired_date = formatDateTimeForDB(updateData.acquired_date);
    }

    console.log("Updating asset:", id, "with data:", updateData);

    // Remove fields that shouldn't be updated
    delete updateData.id;
    delete updateData.created_at;
    delete updateData.updated_at;

    // Map frontend fields to database fields
    console.log("Mapping department:", updateData.department);
    // Use department_id directly from frontend instead of mapping department name
    const departmentId = updateData.department_id || await getDepartmentIdByName(updateData.department);
    console.log("Using department ID:", departmentId);

    console.log("Mapping owner:", updateData.owner);
    // Use the current user's ID as owner_id instead of mapping owner name
    const ownerId = req.user.id;
    console.log("Using current user ID as owner:", ownerId);

    // Use location_id directly from frontend instead of mapping location name
    const locationId = updateData.location_id || null;
    console.log("Using location ID directly:", locationId);

    const mappedData = {
      ...updateData,
      department_id: departmentId,
      owner_id: ownerId,
      location_id: locationId,
    };

    console.log("Mapped data for update:", mappedData);

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
    console.error("Error updating asset:", error);
    res.status(500).json({ error: "Failed to update asset" });
  }
}

// Delete asset by ID
async function deleteAssetById(req, res) {
  try {
    const { id } = req.params;
    const user = req.user;

    // Check if user can delete (admin only)
    if (user.role !== 'admin') {
      return res.status(403).json({ 
        error: "Access denied. Only administrators can delete assets." 
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

    // Check if user can create (admin or user with department)
    if (user.role !== 'admin' && user.department_id === null) {
      return res.status(403).json({ 
        error: "Access denied. Users without department assignment cannot create assets. Please contact your administrator to assign a department." 
      });
    }

    // Explicitly format acquired_date to prevent driver timezone conversion
    if (assetData.acquired_date) {
      assetData.acquired_date = formatDateTimeForDB(assetData.acquired_date);
    }

    // Basic validation
    if (!assetData.name || !assetData.asset_code) {
      return res
        .status(400)
        .json({ error: "Asset name and code are required" });
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
    // Bar Chart: Status per month
    const statuses = [
      "active",
      "broken",
      "transferring",
      "audited",
      "missing",
      "disposed",
    ];
    const barSeries = statuses.map((status) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
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
    const donutData = statuses.map(
      (status) => assets.filter((a) => a.status === status).length
    );
    res.json({
      line: { labels: months, data: lineData },
      bar: { labels: months, series: barSeries },
      donut: {
        labels: statuses.map((s) => s.charAt(0).toUpperCase() + s.slice(1)),
        data: donutData,
      },
    });
  } catch (error) {
    console.error("Error in getDashboardGraphs:", error);
    res.status(500).json({ error: "Failed to fetch dashboard graphs data" });
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
};
