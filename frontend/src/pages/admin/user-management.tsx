import Head from 'next/head';
import AdminSidebar from '../../components/admin/AdminSidebar';
import Navbar from '../../components/common/Navbar';
import UserManagementTable from '../../components/admin/UserManagementTable';
import AdminRoute from '../../components/auth/AdminRoute';
import styles from '../../../styles/Home.module.css';
import React, { useState } from 'react';

const UserManagementPage: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AdminRoute>
      <div className={styles.container}>
        <Head>
          <title>User Management - Asset Management System</title>
          <meta name="description" content="Manage users in the asset management system" />
          <link rel="icon" href="/favicon.ico" />
        </Head>

        <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className={styles.mainContent} style={{ marginLeft: '280px' }}>
          <Navbar title="User Management" isAdmin={true} onMenuClick={() => setSidebarOpen(true)} />
          <div className={styles.content} style={{ padding: '2rem' }}>
            

            <UserManagementTable />
          </div>
        </main>
      </div>
    </AdminRoute>
  );
};

export default UserManagementPage; 