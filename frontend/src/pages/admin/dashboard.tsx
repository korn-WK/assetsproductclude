import Head from 'next/head';
import Link from 'next/link';
import { useEffect } from 'react';
import AdminSidebar from '../../components/admin/AdminSidebar';
import Navbar from '../../components/common/Navbar';
import AdminRoute from '../../components/auth/AdminRoute';
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

const AdminDashboardPage: React.FC = () => {
  return (
    <AdminRoute>
      <div className={styles.container}>
        <Head>
          <title>Admin Dashboard - Mae Fah Luang University</title>
          <meta name="description" content="Admin Dashboard" />
          <link rel="icon" href="/favicon.ico" />
        </Head>

        <AdminSidebar />

        <main 
          className={styles.mainContent}
          style={{ marginLeft: '280px' }}
        >
          <Navbar title="Admin Dashboard" isAdmin={true} />
          <DashboardProvider>
            <DashboardContentWrapper />
          </DashboardProvider>
        </main>
      </div>
    </AdminRoute>
  );
};

export default AdminDashboardPage; 