import Head from 'next/head';
import AdminSidebar from '../../components/admin/AdminSidebar';
import Navbar from '../../components/common/Navbar';
import { AssetProvider } from '../../contexts/AssetContext';
import AdminAssetsTable from '../../components/admin/AdminAssetsTable';
import AdminRoute from '../../components/auth/AdminRoute';
import styles from '../../../styles/Home.module.css';

const AssetManagementPage: React.FC = () => {
  return (
    <AdminRoute>
      <div className={styles.container}>
        <Head>
          <title>Asset Management - Admin Dashboard</title>
          <meta name="description" content="Comprehensive asset management for administrators" />
          <link rel="icon" href="/favicon.ico" />
        </Head>

        <AdminSidebar />

        <main 
          className={styles.mainContent}
          style={{ marginLeft: '280px' }}
        >
          <AssetProvider>
            <Navbar title="" isAdmin={true} />
            <div className={styles.content} style={{ padding: '2rem' }}>
              <div style={{ 
                background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                borderRadius: '20px',
                padding: '2rem',
                marginBottom: '2rem',
                color: 'white',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
              }}>
                <h1 style={{ 
                  fontSize: '2rem', 
                  fontWeight: '700', 
                  margin: '0 0 0.5rem 0',
                  textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                }}>
                  Asset Management
                </h1>
                <p style={{ 
                  fontSize: '1.1rem', 
                  margin: '0', 
                  opacity: '0.9',
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
                }}>
                  Comprehensive asset management system for administrators
                </p>
              </div>

              <AdminAssetsTable />
            </div>
          </AssetProvider>
        </main>
      </div>
    </AdminRoute>
  );
};

export default AssetManagementPage; 