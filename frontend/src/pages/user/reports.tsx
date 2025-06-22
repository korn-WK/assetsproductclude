import Head from 'next/head';
import Sidebar from '../../components/user/Sidebar/index';
import Navbar from '../../components/common/Navbar';
import styles from '../../../styles/Home.module.css';

const ReportsPage: React.FC = () => {
  return (
    <div className={styles.container}>
      <Head>
        <title>Reports - Mae Fah Luang University</title>
        <meta name="description" content="Asset Management Reports" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Sidebar />

      <main className={styles.mainContent} style={{ marginLeft: '280px' }}>
        <Navbar title="Reports" />
        <div style={{
          padding: '2rem',
          backgroundColor: 'var(--card-bg)',
          borderRadius: '15px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <h1>Reports</h1>
          <p>Asset management reports and analytics will be displayed here.</p>
        </div>
      </main>
    </div>
  );
};

export default ReportsPage; 