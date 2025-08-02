import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';

interface Department {
  id: number;
  name_th: string;
  name_en?: string;
}

interface Location {
  id: number;
  name: string;
  description?: string;
}

interface User {
  id: number;
  name: string;
}

interface DropdownData {
  departments: Department[];
  locations: Location[];
  users: User[];
  loading: boolean;
  error: string | null;
}

interface DropdownContextType extends DropdownData {
  fetchDropdownData: () => Promise<void>;
  refreshDropdownData: () => Promise<void>;
}

const DropdownContext = createContext<DropdownContextType | undefined>(undefined);

export const useDropdown = () => {
  const context = useContext(DropdownContext);
  if (context === undefined) {
    throw new Error('useDropdown must be used within a DropdownProvider');
  }
  return context;
};

interface DropdownProviderProps {
  children: ReactNode;
}

export const DropdownProvider: React.FC<DropdownProviderProps> = ({ children }) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  
  const { user, loading: authLoading } = useAuth();

  const fetchDropdownData = useCallback(async () => {
    // Don't fetch if not authenticated or still loading auth
    if (authLoading || !user) {
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // Fetch all data in parallel with timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );
      
      const fetchPromise = Promise.all([
        fetch('/api/assets/departments', { credentials: 'include' }),
        fetch('/api/assets/locations', { credentials: 'include' }),
        fetch('/api/assets/users', { credentials: 'include' }),
      ]);

      const [departmentsRes, locationsRes, usersRes] = await Promise.race([
        fetchPromise,
        timeoutPromise
      ]) as Response[];



      if (!departmentsRes.ok) throw new Error(`Failed to fetch departments: ${departmentsRes.statusText}`);
      if (!locationsRes.ok) throw new Error(`Failed to fetch locations: ${locationsRes.statusText}`);
      if (!usersRes.ok) throw new Error(`Failed to fetch users: ${usersRes.statusText}`);

      const [departmentsData, locationsData, usersData] = await Promise.all([
        departmentsRes.json(),
        locationsRes.json(),
        usersRes.json(),
      ]);



      setDepartments(departmentsData);
      setLocations(locationsData);
      setUsers(usersData);
      setHasLoaded(true);
    } catch (err) {
      console.error('Error fetching dropdown data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch dropdown data');
      
      // Retry after 5 seconds if it's a network error
      if (err instanceof Error && err.message.includes('timeout')) {
        setTimeout(() => {
          fetchDropdownData();
        }, 5000);
      }
    } finally {
      setLoading(false);
    }
  }, [authLoading, user]);

  const refreshDropdownData = async () => {
    await fetchDropdownData();
  };

  // Load data when user becomes authenticated
  useEffect(() => {
    if (!authLoading && user && !hasLoaded) {
      fetchDropdownData();
    }
  }, [authLoading, user, hasLoaded, fetchDropdownData]);

  const value: DropdownContextType = {
    departments,
    locations,
    users,
    loading,
    error,
    fetchDropdownData,
    refreshDropdownData,
  };

  return (
    <DropdownContext.Provider value={value}>
      {children}
    </DropdownContext.Provider>
  );
}; 