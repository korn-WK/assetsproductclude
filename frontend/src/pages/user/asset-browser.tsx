import React, { useState } from 'react';
import Head from 'next/head';
import Sidebar from '../../components/user/Sidebar/index';
import Navbar from '../../components/common/Navbar';
import { AssetProvider } from '../../contexts/AssetContext';
import AssetsTable from '../../components/user/AssetsTable';
import styles from '../../../styles/Home.module.css';

const AssetBrowserPage: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={styles.container}>
      <Head>
        <title>Asset Browser - Mae Fah Luang University</title>
        <meta name="description" content="Browse and search assets" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className={styles.mainContent} style={{ marginLeft: sidebarOpen ? '280px' : undefined }}>
        <AssetProvider>
          <Navbar title="Asset Browser" onMenuClick={() => setSidebarOpen(true)} />
          <AssetsTable />
        </AssetProvider>
      </main>
    </div>
  );
};

export default AssetBrowserPage; 