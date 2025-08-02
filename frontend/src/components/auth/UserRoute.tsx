import React from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';

interface UserRouteProps {
  children: React.ReactNode;
}

const UserRoute: React.FC<UserRouteProps> = ({ children }) => {
  const { isAuthenticated, isAdmin, loading, user } = useAuth();
  const router = useRouter();

  if (loading) {
    return <div>Loading...</div>;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    router.push('/');
    return null;
  }

  // Redirect to admin dashboard if superadmin
      if (user?.originalRole?.toLowerCase() === 'superadmin') {
    router.push('/admin/asset-management');
    return null;
  }

  // Render user content if user is authenticated and not admin
  return <>{children}</>;
};

export default UserRoute; 