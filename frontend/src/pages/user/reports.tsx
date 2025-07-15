import React, { useState } from 'react';
import Head from 'next/head';
import Sidebar from '../../components/user/Sidebar/index';
import Navbar from '../../components/common/Navbar';
import Layout from '../../components/common/Layout';
import UserRoute from '../../components/auth/UserRoute';

const ReportsPage: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <UserRoute>
      <Head>
        <title>Reports - Mae Fah Luang University</title>
        <meta name="description" content="Asset Management Reports" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Layout sidebar={<Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />}>
        <Navbar title="Reports" onMenuClick={() => setSidebarOpen(true)} />
        <div style={{
          padding: '2rem',
          backgroundColor: 'var(--card-bg)',
          borderRadius: '15px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <h1>Reports</h1>
          <p>Asset management reports and analytics will be displayed here.</p>
        </div>
      </Layout>
    </UserRoute>
  );
};

export default ReportsPage; 