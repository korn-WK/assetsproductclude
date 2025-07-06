import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import AdminSidebar from '../../components/admin/AdminSidebar';
import Navbar from '../../components/common/Navbar';
import AdminRoute from '../../components/auth/AdminRoute';
import DashboardContent from '../../components/common/DashboardContent';
import Layout from '../../components/common/Layout';
import { DashboardProvider, useDashboard } from '../../contexts/DashboardContext';

const DashboardContentWrapper: React.FC = () => {
  const { fetchStats } = useDashboard();

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return <DashboardContent />;
};

const AdminDashboardPage: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AdminRoute>
      <>
        <Head>
          <title>Admin Dashboard - Mae Fah Luang University</title>
          <meta name="description" content="Admin Dashboard" />
          <link rel="icon" href="/favicon.ico" />
        </Head>

        <Layout sidebar={<AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />}>
          <Navbar title="Admin Dashboard" isAdmin={true} onMenuClick={() => setSidebarOpen(true)} />
          <DashboardProvider>
            <DashboardContentWrapper />
          </DashboardProvider>
        </Layout>
      </>
    </AdminRoute>
  );
};

export default AdminDashboardPage; 