import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Sidebar from '../../components/user/Sidebar';
import Navbar from '../../components/common/Navbar';
import { AssetProvider } from '../../contexts/AssetContext';
import AssetsTable from '../../components/user/AssetsTable';
import UserRoute from '../../components/auth/UserRoute';
import BarcodeScanner from '../../components/common/BarcodeScanner';
import AssetDetailPopup from '../../components/common/AssetDetailPopup';
import Layout from '../../components/common/Layout';
import { axiosInstance } from '../../lib/axios';

const AssetBrowserPage: React.FC = () => {
  const router = useRouter();
  const { status: statusFilter } = router.query;
  
  console.log('AssetBrowserPage: statusFilter from URL:', statusFilter);
  console.log('AssetBrowserPage: Passing initialStatusFilter to AssetsTable:', statusFilter as string);
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scannedAsset, setScannedAsset] = useState(null);
  const [showAssetPopup, setShowAssetPopup] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');

  const handleOpenScanner = () => {
    setShowScanner(true);
  };

  const handleCloseScanner = () => {
    setShowScanner(false);
  };

  const handleBarcodeDetected = async (barcode: string) => {
    try {
      console.log(`Barcode detected in user page: "${barcode}"`);
      setShowScanner(false);
      const response = await axiosInstance.get(`/api/assets/barcode/${encodeURIComponent(barcode)}`);
      console.log('Asset found:', response.data);
      setScannedAsset(response.data);
      setShowAssetPopup(true);
    } catch (err: unknown) {
      console.error('Error finding asset:', err instanceof Error ? err.message : 'Unknown error');
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
      <>
        <Head>
          <title>Asset Browser - User Dashboard</title>
          <meta name="description" content="Browse and search assets" />
          <link rel="icon" href="/favicon.ico" />
        </Head>

        <Layout sidebar={<Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />}>
          <AssetProvider>
            <Navbar
              title="Asset Browser"
              isAdmin={false}
              onMenuClick={() => setSidebarOpen(true)}
              onSearch={setSearchTerm}
            />
            <div>
              <AssetsTable 
                onScanBarcodeClick={handleOpenScanner} 
                searchTerm={searchTerm} 
                onSearch={setSearchTerm}
                initialStatusFilter={statusFilter as string}
              />
            </div>
          </AssetProvider>
        </Layout>

        {/* Barcode Scanner Modal */}
        {showScanner && (
          <BarcodeScanner
            onBarcodeDetected={handleBarcodeDetected}
            onClose={handleCloseScanner}
          />
        )}
        {/* Asset Detail Popup */}
        {showAssetPopup && scannedAsset && (
          <AssetDetailPopup
            asset={scannedAsset}
            isOpen={showAssetPopup}
            onClose={handleCloseAssetPopup}
            isCreating={false}
          />
        )}
      </>
    </UserRoute>
  );
};

export default AssetBrowserPage; 