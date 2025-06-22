import Head from 'next/head';
import Sidebar from '../../components/user/Sidebar/index';
import Navbar from '../../components/common/Navbar';
import DashboardContent from '../../components/common/DashboardContent';
import styles from '../../../styles/Home.module.css';

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
        <DashboardContent />
      </main>
    </div>
  );
};

export default UserDashboardPage; 