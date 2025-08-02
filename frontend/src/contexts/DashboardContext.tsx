import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';

// เพิ่ม type สำหรับ dynamic status
export interface AssetStatusCount {
  status: string;
  count: number;
}

interface DashboardStats {
  totalAssets: number;
  statuses: AssetStatusCount[]; // เปลี่ยนจาก field เดิมเป็น array
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
  fetchStatsByYear: (year: number, department?: string) => Promise<void>;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider = ({ children }: { children: ReactNode }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/assets/stats', {
        credentials: 'include'
      });
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
      // แปลง object statuses เป็น array
      let statuses: AssetStatusCount[] = [];
      if (data.statuses && typeof data.statuses === 'object' && !Array.isArray(data.statuses)) {
        statuses = Object.entries(data.statuses).map(([status, count]) => ({ status, count }));
      } else if (Array.isArray(data.statuses)) {
        statuses = data.statuses;
      }
      setStats({
        totalAssets: data.total,
        statuses,
        monthlyData: data.monthlyData || [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      if (err instanceof Error && !err.message.includes('Authentication') && !err.message.includes('Access denied')) {
        setTimeout(() => {
          fetchStats();
        }, 3000);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStatsByYear = useCallback(async (year: number, department?: string) => {
    setLoading(true);
    setError(null);
    try {
      let url = `/api/assets/stats?year=${year}`;
      if (department && department !== 'All Departments') {
        url += `&department=${encodeURIComponent(department)}`;
      }
      const response = await fetch(url, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch stats for year ${year}: ${response.statusText}`);
      }
      const data = await response.json();
      let statuses: AssetStatusCount[] = [];
      if (data.statuses && typeof data.statuses === 'object' && !Array.isArray(data.statuses)) {
        statuses = Object.entries(data.statuses).map(([status, count]) => ({ status, count }));
      } else if (Array.isArray(data.statuses)) {
        statuses = data.statuses;
      }
      setStats({
        totalAssets: data.total,
        statuses,
        monthlyData: data.monthlyData || [],
      });
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