import Head from 'next/head';
import AdminSidebar from '../../components/admin/AdminSidebar';
import Navbar from '../../components/common/Navbar';
import React, { useState, useEffect } from 'react';
import Layout from '../../components/common/Layout';
import AssetVerificationTableSuperAdmin from '../../components/admin/AssetVerificationTable';
import UserEditWindowSetting from './UserEditWindowSetting';

const AssetVerificationAllPage: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showEditWindowModal, setShowEditWindowModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 600);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);



  return (
    <>
      <Head>
        <title>Asset Verification - SuperAdmin</title>
        <meta name="description" content="SuperAdmin asset verification log for all assets" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Layout sidebar={<AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />}>
        <Navbar title="Asset Verification" isAdmin={true} onMenuClick={() => setSidebarOpen(true)} onSearch={setSearchTerm} />
        <div>
          <AssetVerificationTableSuperAdmin
            searchTerm={searchTerm}
            onSearch={setSearchTerm}
            extraActionButton={
              <button
                style={{
                  background: 'linear-gradient(90deg, #4F8CFF 0%, #6BD6FF 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  fontWeight: 600,
                  fontSize: isMobile ? '0.9rem' : '1.08rem',
                  cursor: 'pointer',
                  marginLeft: 8,
                  maxWidth: 200,
                  height: 44,
                  lineHeight: 1.1,
                  boxShadow: 'var(--shadow-md)',
                  transition: 'background 0.2s',
                  padding: '0.7rem 1.1rem',
                }}
                onMouseOver={e => e.currentTarget.style.background = 'linear-gradient(90deg, #3576E6 0%, #4FC3F7 100%)'}
                onMouseOut={e => e.currentTarget.style.background = 'linear-gradient(90deg, #4F8CFF 0%, #6BD6FF 100%)'}
                onClick={() => setShowEditWindowModal(true)}
              >
                ตั้งช่วงเวลาตรวจนับ
              </button>
            }
          />
        </div>
        {showEditWindowModal && (
          <UserEditWindowSetting open={showEditWindowModal} onClose={() => setShowEditWindowModal(false)} />
        )}
      </Layout>
    </>
  );
};

export default AssetVerificationAllPage; 