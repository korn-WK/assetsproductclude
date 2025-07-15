import React, { useState } from 'react';
import Head from 'next/head';
import Sidebar from '../../components/user/Sidebar/index';
import Navbar from '../../components/common/Navbar';
import DashboardContent from '../../components/common/DashboardContent';
import Layout from '../../components/common/Layout';
import { DashboardProvider, useDashboard } from '../../contexts/DashboardContext';
import UserRoute from '../../components/auth/UserRoute';

const DashboardContentWrapper: React.FC = () => {
  const { fetchStats } = useDashboard();

  React.useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return <DashboardContent />;
};

const UserDashboardPage: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <UserRoute>
      <>
        <Head>
          <title>Dashboard - Mae Fah Luang University</title>
          <meta name="description" content="User Dashboard" />
          <link rel="icon" href="/favicon.ico" />
        </Head>

        <Layout sidebar={<Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />}>
          <Navbar title="Dashboard" onMenuClick={() => setSidebarOpen(true)} />
          <DashboardProvider>
            <DashboardContentWrapper />
          </DashboardProvider>
        </Layout>
      </>
    </UserRoute>
  );
};

export default UserDashboardPage; 