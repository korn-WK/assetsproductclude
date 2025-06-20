import Head from 'next/head';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import AssetsTable from '../components/AssetsTable';
import styles from '../../styles/Home.module.css'; // Create this file for main layout

const Home: React.FC = () => {
  return (
    <div className={styles.container}>
      <Head>
        <title>Assets - Mae Fah Luang University</title>
        <meta name="description" content="Asset Management Dashboard" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Sidebar />

      <main className={styles.mainContent}>
        <Navbar />
        <AssetsTable />
      </main>
    </div>
  );
};

export default Home;