import React, { useState } from 'react';
import Head from 'next/head';
import AdminSidebar from '../../components/admin/AdminSidebar';
import Navbar from '../../components/common/Navbar';
import { AssetProvider } from '../../contexts/AssetContext';
import AdminAssetsTable from '../../components/admin/AdminAssetsTable';
import AdminRoute from '../../components/auth/AdminRoute';
import BarcodeScanner from '../../components/common/BarcodeScanner';
import AssetDetailPopup from '../../components/common/AssetDetailPopup';
import Layout from '../../components/common/Layout';
import { axiosInstance } from '../../lib/axios';

const AssetManagementPage: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scannedAsset, setScannedAsset] = useState(null);
  const [showAssetPopup, setShowAssetPopup] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(''); // เพิ่ม state สำหรับ search

  const handleOpenScanner = () => {
    setShowScanner(true);
    setScannerError(null);
  };

  const handleCloseScanner = () => {
    setShowScanner(false);
    setScannerError(null);
  };

  const handleBarcodeDetected = async (barcode: string) => {
    try {
      console.log(`Barcode detected in admin page: "${barcode}"`);
      setShowScanner(false);
      setScannerError(null);
      const response = await axiosInstance.get(`/api/assets/barcode/${encodeURIComponent(barcode)}`);
      console.log('Asset found:', response.data);
      setScannedAsset(response.data);
      setShowAssetPopup(true);
    } catch (err: any) {
      console.error('Error finding asset:', err.response?.data || err.message);
      setScannerError(err.response?.data?.error || 'ไม่พบคุรุภัณฑ์ในระบบ');
      setShowScanner(false);
      setShowAssetPopup(false);
    }
  };

  const handleCloseAssetPopup = () => {
    setShowAssetPopup(false);
    setScannedAsset(null);
  };

  return (
    <AdminRoute>
      <>
        <Head>
          <title>Asset Management - Admin Dashboard</title>
          <meta name="description" content="Comprehensive asset management for administrators" />
          <link rel="icon" href="/favicon.ico" />
        </Head>

        <Layout sidebar={<AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />}>
          <AssetProvider>
            <Navbar
              title="Asset Management"
              isAdmin={true}
              onMenuClick={() => setSidebarOpen(true)}
              onSearch={setSearchTerm} // ส่งฟังก์ชันนี้ให้ Navbar
            />
            <div> 
              <AdminAssetsTable onScanBarcodeClick={handleOpenScanner} searchTerm={searchTerm} onSearch={setSearchTerm} />
            </div>
          </AssetProvider>
        </Layout>

        {/* Barcode Scanner Modal */}
        {showScanner && (
          <BarcodeScanner
            onBarcodeDetected={handleBarcodeDetected}
            onClose={handleCloseScanner}
            onError={setScannerError}
          />
        )}
        {/* Asset Detail Popup */}
        {showAssetPopup && scannedAsset && (
          <AssetDetailPopup
            asset={scannedAsset}
            isOpen={showAssetPopup}
            onClose={handleCloseAssetPopup}
            isAdmin={true}
          />
        )}
        {/* Error Popup */}
        {scannerError && !showScanner && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: 'white',
              padding: '2rem',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <p>{scannerError}</p>
              <button onClick={handleOpenScanner}>ลองใหม่</button>
              <button onClick={handleCloseScanner}>ปิด</button>
            </div>
          </div>
        )}
      </>
    </AdminRoute>
  );
};

export default AssetManagementPage; 