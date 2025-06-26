import React, { useState } from 'react';
import Head from 'next/head';
import AdminSidebar from '../../components/admin/AdminSidebar';
import Navbar from '../../components/common/Navbar';
import { AssetProvider } from '../../contexts/AssetContext';
import AdminAssetsTable from '../../components/admin/AdminAssetsTable';
import AdminRoute from '../../components/auth/AdminRoute';
import styles from '../../../styles/Home.module.css';

const AssetManagementPage: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AdminRoute>
      <div className={styles.container}>
        <Head>
          <title>Asset Management - Admin Dashboard</title>
          <meta name="description" content="Comprehensive asset management for administrators" />
          <link rel="icon" href="/favicon.ico" />
        </Head>

        <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main 
          className={styles.mainContent}
          style={{ marginLeft: '280px' }}
        >
          <AssetProvider>
            <Navbar title="Asset Management" isAdmin={true} onMenuClick={() => setSidebarOpen(true)} />
            <div className={styles.content}> 
              <AdminAssetsTable />
            </div>
          </AssetProvider>
        </main>
      </div>
    </AdminRoute>
  );
};

export default AssetManagementPage; 