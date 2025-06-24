import Head from 'next/head';
import { useEffect } from 'react';
import Sidebar from '../../components/user/Sidebar/index';
import Navbar from '../../components/common/Navbar';
import DashboardContent from '../../components/common/DashboardContent';
import { DashboardProvider, useDashboard } from '../../contexts/DashboardContext';
import styles from '../../../styles/Home.module.css';

const DashboardContentWrapper: React.FC = () => {
  const { fetchStats } = useDashboard();

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return <DashboardContent />;
};

const UserDashboardPage: React.FC = () => {
  return (
    <div className={styles.container}>
      <Head>
        <title>Dashboard - Mae Fah Luang University</title>
        <meta name="description" content="User Dashboard" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Sidebar />

      <main className={styles.mainContent} style={{ marginLeft: '280px' }}>
        <Navbar title="Dashboard" />
        <DashboardProvider>
          <DashboardContentWrapper />
        </DashboardProvider>
      </main>
    </div>
  );
};

export default UserDashboardPage; 