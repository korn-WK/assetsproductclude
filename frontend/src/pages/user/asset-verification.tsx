import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from '../../components/user/Sidebar';
import Layout from '../../components/common/Layout';
import Navbar from '../../components/common/Navbar';
import AssetVerificationTable from '../../components/user/AssetVerificationTable';

const AssetVerificationUserPage: React.FC = () => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user || (user.originalRole?.toLowerCase() !== 'admin' && user.originalRole?.toLowerCase() !== 'superadmin')) {
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

  if (loading || !user || (user.originalRole?.toLowerCase() !== 'admin' && user.originalRole?.toLowerCase() !== 'superadmin')) {
    return null;
  }

  return (
    <Layout sidebar={<Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />}>
      <Navbar
        title="Asset Verification"
        isAdmin={user.originalRole?.toLowerCase() === 'superadmin' || user.originalRole?.toLowerCase() === 'admin'}
        onMenuClick={() => setSidebarOpen(true)}
        onSearch={setSearchTerm}
      />
      <div style={
        isMobile
          ? {  
              backgroundColor: 'transparent', 
              borderRadius: '0', 
              boxShadow: 'none', 
              marginTop: 25,
              width: '100%',
              maxWidth: '100vw',
              overflow: 'hidden'
            }
          : { 
              padding: '2rem', 
              backgroundColor: 'var(--card-bg)', 
              borderRadius: '15px', 
              boxShadow: 'var(--shadow-sm)' 
            }
      }>
        <h1></h1>
        <AssetVerificationTable searchTerm={searchTerm} />
      </div>
    </Layout>
  );
};

export default AssetVerificationUserPage; 