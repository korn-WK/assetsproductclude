import Head from 'next/head';
import AdminSidebar from '../../components/admin/AdminSidebar';
import Navbar from '../../components/common/Navbar';
import UserManagementTable from '../../components/admin/UserManagementTable';
import AdminRoute from '../../components/auth/AdminRoute';
import Layout from '../../components/common/Layout';
import React, { useState } from 'react';

const UserManagementPage: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(''); // เพิ่ม state สำหรับ search

  return (
    <AdminRoute>
      <>
        <Head>
          <title>User Management - Asset Management System</title>
          <meta name="description" content="Manage users in the asset management system" />
          <link rel="icon" href="/favicon.ico" />
        </Head>

        <Layout sidebar={<AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />}>
          <Navbar title="User Management" isAdmin={true} onMenuClick={() => setSidebarOpen(true)} onSearch={setSearchTerm} />
          <div>
            <UserManagementTable searchTerm={searchTerm} />
          </div>
        </Layout>
      </>
    </AdminRoute>
  );
};

export default UserManagementPage; 