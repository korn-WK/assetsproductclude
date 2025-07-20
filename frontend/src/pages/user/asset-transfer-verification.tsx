import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from '../../components/user/Sidebar';
import Layout from '../../components/common/Layout';
import Navbar from '../../components/common/Navbar';
import AssetTransferVerificationTable from '../../components/admin/AssetTransferVerificationTable';

const AssetTransferVerificationPage: React.FC = () => {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading) {
      const role = user?.role?.toLowerCase();
      if (!user || role !== 'admin') {
        router.replace('/user/asset-browser');
      }
    }
  }, [user, loading, router]);

  const role = user?.role?.toLowerCase();
  if (loading || !user || role !== 'admin') {
    return null;
  }

  return (
    <Layout sidebar={<Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />}>
      <Navbar
        title="Asset Transfer Verification"
        isAdmin={true}
        onMenuClick={() => setSidebarOpen(true)}
      />
      <div style={{
        padding: '2rem',
        backgroundColor: 'var(--card-bg)',
        borderRadius: '15px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <AssetTransferVerificationTable />
      </div>
    </Layout>
  );
};

export default AssetTransferVerificationPage; 