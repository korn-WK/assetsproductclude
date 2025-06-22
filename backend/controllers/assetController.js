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
} = require('../models/asset.js');

const { pool } = require('../lib/db.js');

// Helper function to transform asset data consistently for the frontend
const transformAsset = (asset) => {
  // Handle image_url properly
  let imageUrl = null;
  if (asset.image_url) {
    // Check if the URL already has a protocol (http:// or https://)
    if (asset.image_url.startsWith('http://') || asset.image_url.startsWith('https://')) {
      imageUrl = asset.image_url;
    } else {
      // If it's just a path, add the base URL
      imageUrl = `${process.env.SERVER_URL || 'http://localhost:4000'}${asset.image_url}`;
    }
  }

  return {
    id: asset.id.toString(),
    asset_code: asset.asset_code,
    name: asset.name,
    description: asset.description,
    location: asset.location_name || asset.location || 'N/A',
    department: asset.department_name || 'N/A',
    owner: asset.owner_name || 'N/A',
    status: asset.status,
    image_url: imageUrl,
    acquired_date: asset.acquired_date,
    created_at: asset.created_at,
    updated_at: asset.updated_at,
  };
};

// Helper to format datetime string for DB insertion to avoid timezone conversion
const formatDateTimeForDB = (dateString) => {
  if (!dateString || typeof dateString !== 'string') {
    return null;
  }
  // The input from the frontend is 'YYYY-MM-DDTHH:mm'.
  // We explicitly format it to 'YYYY-MM-DD HH:mm:ss' to ensure
  // the database driver interprets it as a literal datetime string.
  return dateString.replace('T', ' ') + ':00';
};

async function getAssetByBarcode(req, res) {
  const { barcode } = req.params;
  if (!barcode || barcode.length !== 15) {
    return res.status(400).json({ error: 'Barcode must be 15 digits' });
  }
  const asset = await findAssetByBarcode(barcode);
  if (!asset) {
    return res.status(404).json({ error: 'Asset not found' });
  }
  res.json(asset);
}

async function patchAssetStatus(req, res) {
  try {
    const { barcode } = req.params;
    const { status } = req.body;
    
    if (!barcode || barcode.length !== 15) {
      return res.status(400).json({ error: 'Barcode must be 15 digits' });
    }
    
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    
    // Validate status
    if (!validateAssetStatus(status)) {
      return res.status(400).json({ 
        error: `Invalid status: ${status}. Valid statuses are: ${VALID_STATUSES.join(', ')}` 
      });
    }
    
    const success = await updateAssetStatus(barcode, status);
    if (!success) {
      return res.status(404).json({ error: 'Asset not found or status not updated' });
    }
    
    res.json({ message: 'Status updated successfully' });
  } catch (error) {
    console.error('Error updating asset status:', error);
    res.status(500).json({ error: 'Failed to update asset status' });
  }
}

async function getAssets(req, res) {
  try {
    // Get user's department_id from the JWT token
    const userDepartmentId = req.user.department_id;
    
    // Use the new function that filters by user's department
    const assets = await getAssetsByUserDepartment(userDepartmentId);
    const transformedAssets = assets.map(transformAsset);
    res.json(transformedAssets);
  } catch (error) {
    console.error('Error fetching assets:', error);
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
}

async function getStats(req, res) {
  const stats = await getAssetStats();
  res.json(stats);
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
    const query = req.query.q || '';
    const userDepartmentId = req.user.department_id;
    
    console.log('Search request received:');
    console.log('- Query:', query);
    console.log('- User department ID:', userDepartmentId);
    console.log('- User object:', req.user);
    
    if (!query) {
      console.log('Empty query, returning all assets for user department');
      // Return all assets filtered by user's department if search is empty
      const allAssets = await getAssetsByUserDepartment(userDepartmentId);
      console.log('Found', allAssets.length, 'assets for user department');
      return res.json(allAssets.map(transformAsset));
    }
    
    console.log('Searching assets with query:', query);
    const assets = await searchAssetsByUserDepartment(query, userDepartmentId);
    console.log('Search found', assets.length, 'assets');
    res.json(assets.map(transformAsset));
  } catch (error) {
    console.error('Error searching assets:', error);
    res.status(500).json({ error: 'Failed to search assets' });
  }
}

// Update asset by ID
async function updateAssetById(req, res) {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    // Explicitly format acquired_date to prevent driver timezone conversion
    if (updateData.acquired_date) {
      updateData.acquired_date = formatDateTimeForDB(updateData.acquired_date);
    }
    
    console.log('Updating asset:', id, 'with data:', updateData);
    
    // Remove fields that shouldn't be updated
    delete updateData.id;
    delete updateData.created_at;
    delete updateData.updated_at;
    
    // Map frontend fields to database fields
    console.log('Mapping department:', updateData.department);
    const departmentId = await getDepartmentIdByName(updateData.department);
    console.log('Mapped department ID:', departmentId);
    
    console.log('Mapping owner:', updateData.owner);
    const ownerId = await getUserIdByName(updateData.owner);
    console.log('Mapped owner ID:', ownerId);
    
    console.log('Mapping location:', updateData.location);
    const locationId = await getLocationIdByName(updateData.location);
    console.log('Mapped location ID:', locationId);

    const mappedData = {
      ...updateData,
      department_id: departmentId,
      owner_id: ownerId,
      location_id: locationId,
    };
    
    console.log('Mapped data for update:', mappedData);
    
    const success = await updateAsset(id, mappedData);
    
    if (success) {
      // Get the updated asset
      const updatedAsset = await getAssetById(id);
      if (updatedAsset) {
        res.json(transformAsset(updatedAsset));
      } else {
        res.status(404).json({ error: 'Asset not found after update' });
      }
    } else {
      res.status(404).json({ error: 'Asset not found or update failed' });
    }
  } catch (error) {
    console.error('Error updating asset:', error);
    res.status(500).json({ error: 'Failed to update asset' });
  }
}

// Delete asset by ID
async function deleteAssetById(req, res) {
  try {
    const { id } = req.params;
    
    console.log('Deleting asset:', id);
    
    const success = await deleteAsset(id);
    
    if (success) {
      res.json({ message: 'Asset deleted successfully' });
    } else {
      res.status(404).json({ error: 'Asset not found or delete failed' });
    }
  } catch (error) {
    console.error('Error deleting asset:', error);
    res.status(500).json({ error: 'Failed to delete asset' });
  }
}

// Get all departments for dropdown
async function getDepartments(req, res) {
  try {
    const departments = await getAllDepartments();
    res.json(departments);
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
}

// Get all locations for dropdown
async function getLocations(req, res) {
  try {
    const locations = await getAllLocations();
    res.json(locations);
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
}

// Get all users for dropdown
async function getUsers(req, res) {
  try {
    pool.query('SELECT id, name FROM users WHERE is_active = 1 ORDER BY name', (error, results) => {
      if (error) {
        console.error('Error fetching users from DB:', error);
        return res.status(500).json({ error: 'Failed to fetch users' });
      }
      res.json(results);
    });
  } catch (error) {
    console.error('Error in getUsers controller:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
}

// Create a new asset
async function createAssetController(req, res) {
  try {
    const assetData = req.body;
    const creatorId = req.user.id; // Get creator's ID from authenticated user token

    // Explicitly format acquired_date to prevent driver timezone conversion
    if (assetData.acquired_date) {
      assetData.acquired_date = formatDateTimeForDB(assetData.acquired_date);
    }

    // Basic validation
    if (!assetData.name || !assetData.asset_code) {
      return res.status(400).json({ error: 'Asset name and code are required' });
    }

    // Validate status if provided
    if (assetData.status && !validateAssetStatus(assetData.status)) {
      return res.status(400).json({ 
        error: `Invalid status: ${assetData.status}. Valid statuses are: ${VALID_STATUSES.join(', ')}` 
      });
    }

    // Map names to IDs before insertion
    const departmentId = await getDepartmentIdByName(assetData.department);
    const locationId = await getLocationIdByName(assetData.location);

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
    console.error('Error creating asset:', error);
    res.status(500).json({ error: 'Failed to create asset' });
  }
}

module.exports = {
  getAssetByBarcode,
  patchAssetStatus,
  getAssets,
  getStats,
  getSummary,
  getAssetReport,
  searchAssetsController,
  updateAssetById,
  deleteAssetById,
  getDepartments,
  getLocations,
  getUsers,
  createAssetController,
}; 