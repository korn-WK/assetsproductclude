const express = require('express');
const router = express.Router();
const {
  getLocations,
  getLocation,
  createLocationHandler,
  updateLocationHandler,
  deleteLocationHandler
} = require('../controllers/locationController');

// Get all locations
router.get('/', getLocations);

// Get location by ID
router.get('/:id', getLocation);

// Create new location
router.post('/', createLocationHandler);

// Update location
router.put('/:id', updateLocationHandler);

// Delete location
router.delete('/:id', deleteLocationHandler);

module.exports = router; 