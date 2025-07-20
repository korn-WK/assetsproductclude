const express = require('express');
const router = express.Router();
const { 
  getAssetTransfers, 
  approveAssetTransfer, 
  rejectAssetTransfer 
} = require('../controllers/assetTransferController');
const { verifyToken } = require('../controllers/authController');

router.get('/', verifyToken, getAssetTransfers);
router.patch('/:id/approve', verifyToken, approveAssetTransfer);
router.patch('/:id/reject', verifyToken, rejectAssetTransfer);

module.exports = router; 