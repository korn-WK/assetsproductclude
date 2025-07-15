import React, { useState } from 'react';
import Head from 'next/head';
import Sidebar from '../../components/user/Sidebar/index';
import Navbar from '../../components/common/Navbar';
import { AssetProvider } from '../../contexts/AssetContext';
import AssetsTable from '../../components/user/AssetsTable';
import BarcodeScanner from '../../components/common/BarcodeScanner';
import AssetDetailPopup from '../../components/common/AssetDetailPopup';
import Layout from '../../components/common/Layout';
import { axiosInstance } from '../../lib/axios';
import UserRoute from '../../components/auth/UserRoute';

const AssetBrowserPage: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scannedAsset, setScannedAsset] = useState(null);
  const [showAssetPopup, setShowAssetPopup] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);

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
      console.log(`Barcode detected in user page: "${barcode}"`);
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
    <UserRoute>
      <Head>
        <title>Asset Browser - Mae Fah Luang University</title>
        <meta name="description" content="Browse and search assets" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Layout sidebar={<Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />}>
        <AssetProvider>
          <Navbar
            title="Asset Browser"
            onMenuClick={() => setSidebarOpen(true)}
          />
          <AssetsTable onScanBarcodeClick={handleOpenScanner} />
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
          isAdmin={false}
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
    </UserRoute>
  );
};

export default AssetBrowserPage; 