import React, { useState, useEffect } from 'react';
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
import { toast } from 'react-toastify';
import { AiOutlineInfoCircle, AiOutlineClose } from 'react-icons/ai';
import styles from '../../components/user/AssetsTable/AssetsTable.module.css';
import { useAuth } from '../../contexts/AuthContext';

const AssetBrowserPage: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scannedAsset, setScannedAsset] = useState(null);
  const [showAssetPopup, setShowAssetPopup] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [auditWindow, setAuditWindow] = useState<{ start_date?: string; end_date?: string } | null>(null);
  const [showAuditWindowNotice, setShowAuditWindowNotice] = useState(true);
  const { user } = useAuth();
  const [showViewOnlyNotice, setShowViewOnlyNotice] = useState(true);

  useEffect(() => {
    fetch('/api/settings/user-edit-window')
      .then(res => res.json())
      .then(data => setAuditWindow(data));
  }, []);

  useEffect(() => {
    if (auditWindow?.start_date && auditWindow?.end_date && showAuditWindowNotice) {
      const timer = setTimeout(() => setShowAuditWindowNotice(false), 6000);
      return () => clearTimeout(timer);
    }
  }, [auditWindow, showAuditWindowNotice]);

  useEffect(() => {
    if (user && user.department_id === null && showViewOnlyNotice) {
      const timer = setTimeout(() => setShowViewOnlyNotice(false), 6000);
      return () => clearTimeout(timer);
    }
  }, [user, showViewOnlyNotice]);

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
            onSearch={setSearchTerm}
          />
          {/* Stackable notification banners */}
          <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 350 }}>
            {auditWindow?.start_date && auditWindow?.end_date && showAuditWindowNotice && (
              <div className={styles.viewOnlyNotice} style={{ position: 'static', marginTop: 0, maxWidth: 350 }}>
                <div className={styles.viewOnlyNoticeContent}>
                  <button className={styles.noticeCloseBtn} onClick={() => setShowAuditWindowNotice(false)} title="Close notice">
                    <AiOutlineClose />
                  </button>
                  <p>
                    <strong>ช่วงเวลาตรวจนับคุรุภัณฑ์:</strong><br />
                    <span style={{ color: '#b45309' }}>{new Date(auditWindow.start_date).toLocaleString()} - {new Date(auditWindow.end_date).toLocaleString()}</span>
                  </p>
                </div>
              </div>
            )}
            {user && user.department_id === null && showViewOnlyNotice && (
              <div className={styles.viewOnlyNotice} style={{ position: 'static', marginTop: 0, maxWidth: 350 }}>
                <div className={styles.viewOnlyNoticeContent}>
                  <button className={styles.noticeCloseBtn} onClick={() => setShowViewOnlyNotice(false)} title="Close notice">
                    <AiOutlineClose />
                  </button>
                  <p>
                    <strong>View Only Mode:</strong> You can only view assets.<br />Contact your administrator to assign a department for editing permissions.
                  </p>
                </div>
              </div>
            )}
          </div>
          {/* ลบ banner แจ้งเตือนออก */}
          <AssetsTable onScanBarcodeClick={handleOpenScanner} searchTerm={searchTerm} />
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