import Head from 'next/head';
import AdminSidebar from '../../components/admin/AdminSidebar';
import Navbar from '../../components/common/Navbar';
import UserManagementTable from '../../components/admin/UserManagementTable';
import AdminRoute from '../../components/auth/AdminRoute';
import styles from '../../../styles/Home.module.css';

const UserManagementPage: React.FC = () => {
  return (
    <AdminRoute>
      <div className={styles.container}>
        <Head>
          <title>User Management - Asset Management System</title>
          <meta name="description" content="Manage users in the asset management system" />
          <link rel="icon" href="/favicon.ico" />
        </Head>

        <AdminSidebar />

        <main className={styles.mainContent} style={{ marginLeft: '280px' }}>
          <Navbar title="" isAdmin={true} />
          <div className={styles.content} style={{ padding: '2rem' }}>
            <div style={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
                User Management
              </h1>
              <p style={{ 
                fontSize: '1.1rem', 
                margin: '0', 
                opacity: '0.9',
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
              }}>
                Add, edit, and manage user accounts in the system
              </p>
            </div>

            <UserManagementTable />
          </div>
        </main>
      </div>
    </AdminRoute>
  );
};

export default UserManagementPage; 