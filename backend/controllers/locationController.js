const {
  getAllLocations,
  getLocationById,
  createLocation,
  updateLocation,
  deleteLocation
} = require('../models/location');

// Get all locations
async function getLocations(req, res) {
  try {
    const locations = await getAllLocations();
    res.json(locations);
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
}

// Get location by ID
async function getLocation(req, res) {
  try {
    const { id } = req.params;
    const location = await getLocationById(id);
    
    if (!location) {
      return res.status(404).json({ error: 'Location not found' });
    }
    
    res.json(location);
  } catch (error) {
    console.error('Error fetching location:', error);
    res.status(500).json({ error: 'Failed to fetch location' });
  }
}

// Create new location
async function createLocationHandler(req, res) {
  try {
    const { name, description, address } = req.body;
    
    // Validation
    if (!name) {
      return res.status(400).json({ error: 'Location name is required' });
    }
    
    const locationId = await createLocation({ name, description, address });
    const newLocation = await getLocationById(locationId);
    
    res.status(201).json({
      message: 'Location created successfully',
      location: newLocation
    });
  } catch (error) {
    console.error('Error creating location:', error);
    res.status(500).json({ error: 'Failed to create location' });
  }
}

// Update location
async function updateLocationHandler(req, res) {
  try {
    const { id } = req.params;
    const { name, description, address } = req.body;
    
    // Validation
    if (!name) {
      return res.status(400).json({ error: 'Location name is required' });
    }
    
    const success = await updateLocation(id, { name, description, address });
    
    if (!success) {
      return res.status(404).json({ error: 'Location not found' });
    }
    
    const updatedLocation = await getLocationById(id);
    
    res.json({
      message: 'Location updated successfully',
      location: updatedLocation
    });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
}

// Delete location
async function deleteLocationHandler(req, res) {
  try {
    const { id } = req.params;
    
    await deleteLocation(id);
    
    res.json({ message: 'Location deleted successfully' });
  } catch (error) {
    console.error('Error deleting location:', error);
    
    if (error.message.includes('Cannot delete location')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to delete location' });
  }
}

module.exports = {
  getLocations,
  getLocation,
  createLocationHandler,
  updateLocationHandler,
  deleteLocationHandler
}; 