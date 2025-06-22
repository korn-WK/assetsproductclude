import Head from 'next/head';
import Link from 'next/link';
import AdminSidebar from '../../components/admin/AdminSidebar';
import Navbar from '../../components/common/Navbar';
import AdminRoute from '../../components/auth/AdminRoute';
import styles from '../../../styles/Home.module.css';

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
          <div style={{
            padding: '2rem',
            backgroundColor: 'var(--card-bg)',
            borderRadius: '15px',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <h1>Welcome to Admin Dashboard</h1>
            <p>You have successfully logged in as an administrator.</p>
            <div style={{ marginTop: '2rem' }}>
              <h2>Quick Actions:</h2>
              <ul>
                <li><Link href="/admin/asset-management">Manage Assets</Link></li>
                <li><Link href="/admin/user-management">Manage Users</Link></li>
                <li><Link href="/admin/department-management">Manage Departments</Link></li>
                <li><Link href="/admin/location-management">Manage Locations</Link></li>
              </ul>
            </div>
          </div>
        </main>
      </div>
    </AdminRoute>
  );
};

export default AdminDashboardPage; 