import React from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';

interface UserRouteProps {
  children: React.ReactNode;
}

const UserRoute: React.FC<UserRouteProps> = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return <div>Loading...</div>;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    router.push('/');
    return null;
  }

  // Redirect to admin dashboard if admin
  if (isAdmin) {
    router.push('/admin/dashboard');
    return null;
  }

  // Render user content if user is authenticated and not admin
  return <>{children}</>;
};

export default UserRoute; 