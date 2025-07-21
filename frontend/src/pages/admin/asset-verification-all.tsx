import Head from 'next/head';
import AdminSidebar from '../../components/admin/AdminSidebar';
import Navbar from '../../components/common/Navbar';
import React, { useState } from 'react';
import Layout from '../../components/common/Layout';
import AssetVerificationTableSuperAdmin from '../../components/admin/AssetVerificationTable';
import styles from '../../user/AssetsTable/AssetsTable.module.css';

const AssetVerificationAllPage: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <>
      <Head>
        <title>Asset Verification (All) - SuperAdmin</title>
        <meta name="description" content="SuperAdmin asset verification log for all assets" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Layout sidebar={<AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />}>
        <Navbar title="Asset Verification (All)" isAdmin={true} onMenuClick={() => setSidebarOpen(true)} onSearch={setSearchTerm} />
        <div>
          <AssetVerificationTableSuperAdmin searchTerm={searchTerm} />
        </div>
      </Layout>
    </>
  );
};

export default AssetVerificationAllPage; 