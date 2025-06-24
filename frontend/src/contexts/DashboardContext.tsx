import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';

interface DashboardStats {
  totalAssets: number;
  activeAssets: number;
  brokenAssets: number;
  missingAssets: number;
  transferringAssets: number;
  auditedAssets: number;
  disposedAssets: number;
  monthlyData: Array<{
    month: string;
    count: number;
  }>;
}

interface DashboardContextType {
  stats: DashboardStats | null;
  loading: boolean;
  error: string | null;
  fetchStats: () => void;
  fetchStatsByYear: (year: number) => Promise<void>;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider = ({ children }: { children: ReactNode }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    console.log('DashboardContext: fetchStats called');
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/assets/stats', {
        credentials: 'include'
      });
      console.log('DashboardContext: fetchStats response status:', response.status);
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required. Please login again.');
        } else if (response.status === 403) {
          throw new Error('Access denied. You do not have permission to view stats.');
        } else {
          throw new Error(`Failed to fetch stats: ${response.statusText}`);
        }
      }
      
      const data = await response.json();
      console.log('DashboardContext: fetchStats data:', data);
      setStats(data);
    } catch (err) {
      console.error('DashboardContext: fetchStats error:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      
      // Retry after 3 seconds for network errors
      if (err instanceof Error && !err.message.includes('Authentication') && !err.message.includes('Access denied')) {
        setTimeout(() => {
          console.log('DashboardContext: Retrying fetchStats...');
          fetchStats();
        }, 3000);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStatsByYear = useCallback(async (year: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/assets/stats?year=${year}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch stats for year ${year}: ${response.statusText}`);
      }
      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <DashboardContext.Provider value={{ stats, loading, error, fetchStats, fetchStatsByYear }}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}; 