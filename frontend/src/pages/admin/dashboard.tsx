import React, { useState } from 'react';
import AdminSidebar from '../../components/admin/AdminSidebar';
import Navbar from '../../components/common/Navbar';
import AdminRoute from '../../components/auth/AdminRoute';
import Layout from '../../components/common/Layout';
import DashboardContent from '../../components/common/DashboardContent';
import { DashboardProvider } from '../../contexts/DashboardContext';

const AdminDashboardPage: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AdminRoute>
      <Layout sidebar={<AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />}>
        <Navbar title="Admin Dashboard" isAdmin={true} onMenuClick={() => setSidebarOpen(true)} />
        <DashboardProvider>
          <DashboardContent />
        </DashboardProvider>
      </Layout>
    </AdminRoute>
  );
};

export default AdminDashboardPage; 