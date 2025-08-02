import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from '../../components/user/Sidebar';
import Layout from '../../components/common/Layout';
import Navbar from '../../components/common/Navbar';
import AssetTransferTable from '../../components/user/AssetTransferTable';

const AssetTransferVerificationPage: React.FC = () => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (!loading) {
      const role = user?.originalRole?.toLowerCase();
      if (!user || role !== 'admin') {
        router.replace('/user/asset-browser');
      }
    }
  }, [user, loading, router]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 600);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const role = user?.originalRole?.toLowerCase();
  if (loading || !user || role !== 'admin') {
    return null;
  }

  return (
    <Layout sidebar={<Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />}>
      <Navbar
        title="Asset Transfer Verification"
        isAdmin={true}
        onMenuClick={() => setSidebarOpen(true)}
        onSearch={setSearchTerm}
      />
      <div style={{
        padding: isMobile ? '1rem' : '2rem',
        backgroundColor: 'var(--card-bg)',
        borderRadius: '15px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <AssetTransferTable searchTerm={searchTerm} onSearch={setSearchTerm} />
      </div>
    </Layout>
  );
};

export default AssetTransferVerificationPage; 