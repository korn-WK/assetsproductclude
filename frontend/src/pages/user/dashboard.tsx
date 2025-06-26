import React, { useState } from 'react';
import Head from 'next/head';
import Sidebar from '../../components/user/Sidebar/index';
import Navbar from '../../components/common/Navbar';
import DashboardContent from '../../components/common/DashboardContent';
import { DashboardProvider, useDashboard } from '../../contexts/DashboardContext';
import styles from '../../../styles/Home.module.css';

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
    <div className={styles.container}>
      <Head>
        <title>Dashboard - Mae Fah Luang University</title>
        <meta name="description" content="User Dashboard" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className={styles.mainContent} style={{ marginLeft: sidebarOpen ? '280px' : undefined }}>
        <Navbar title="Dashboard" onMenuClick={() => setSidebarOpen(true)} />
        <DashboardProvider>
          <DashboardContentWrapper />
        </DashboardProvider>
      </main>
    </div>
  );
};

export default UserDashboardPage; 