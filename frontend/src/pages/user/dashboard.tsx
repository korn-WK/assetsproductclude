import React, { useState } from 'react';
import Sidebar from '../../components/user/Sidebar';
import Navbar from '../../components/common/Navbar';
import UserRoute from '../../components/auth/UserRoute';
import Layout from '../../components/common/Layout';
import DashboardContent from '../../components/common/DashboardContent';
import { DashboardProvider } from '../../contexts/DashboardContext';

const UserDashboardPage: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <UserRoute>
      <Layout sidebar={<Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />}>
        <Navbar title="Dashboard" isAdmin={false} onMenuClick={() => setSidebarOpen(true)} />
        <DashboardProvider>
          <DashboardContent />
        </DashboardProvider>
      </Layout>
    </UserRoute>
  );
};

export default UserDashboardPage; 