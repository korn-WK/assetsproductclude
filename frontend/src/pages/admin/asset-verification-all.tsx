import Head from 'next/head';
import AdminSidebar from '../../components/admin/AdminSidebar';
import Navbar from '../../components/common/Navbar';
import React, { useState, useEffect } from 'react';
import Layout from '../../components/common/Layout';
import AssetVerificationTableSuperAdmin from '../../components/admin/AssetVerificationTable';
import styles from '../../user/AssetsTable/AssetsTable.module.css';
import DateRangeFilterButton from '../../components/common/DateRangeFilterButton';
import { DateRange } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import UserEditWindowSetting from './UserEditWindowSetting';

const AssetVerificationAllPage: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [verificationPeriod, setVerificationPeriod] = useState<{ startDate?: Date; endDate?: Date }>({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempPeriod, setTempPeriod] = useState<{ startDate?: Date; endDate?: Date }>({});
  const [showUserEdit, setShowUserEdit] = useState(true);
  const [showEditWindowModal, setShowEditWindowModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 600);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleOpenModal = () => {
    setTempPeriod(verificationPeriod);
    setShowDatePicker(true);
  };
  const handleCancel = () => {
    setShowDatePicker(false);
  };
  const handleOk = () => {
    setVerificationPeriod(tempPeriod);
    setShowDatePicker(false);
  };

  return (
    <>
      <Head>
        <title>Asset Verification (All) - SuperAdmin</title>
        <meta name="description" content="SuperAdmin asset verification log for all assets" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Layout sidebar={<AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />}>
        <Navbar title="Asset Verification" isAdmin={true} onMenuClick={() => setSidebarOpen(true)} onSearch={setSearchTerm} />
        <div>
          <AssetVerificationTableSuperAdmin
            searchTerm={searchTerm}
            verificationPeriod={verificationPeriod}
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