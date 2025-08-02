import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { Asset } from '../common/types/asset';

interface AssetContextType {
  assets: Asset[];
  loading: boolean;
  error: string | null;
  fetchAssets: (params?: Record<string, string>) => void;
  searchAssets: (query: string) => void;
  updateAsset: (updatedAsset: Asset) => void;
  refreshAssets: () => void;
  forceRefresh: () => void;
  lastUpdateTime: Date | null;
  pauseAutoRefresh: () => void;
  resumeAutoRefresh: () => void;
}

const AssetContext = createContext<AssetContextType | undefined>(undefined);

export const AssetProvider = ({ children }: { children: ReactNode }) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [autoRefreshPaused, setAutoRefreshPaused] = useState<boolean>(false);

  const fetchAssets = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = `/api/assets${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setAssets(data);
      setLastUpdateTime(new Date());

    } catch (err) {
      console.error('Error fetching assets:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch assets');
    } finally {
      setLoading(false);
    }
  }, []);

  // Real-time update system using polling (ENABLED)
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    const startRealTimeUpdates = () => {
      // Check for updates every 5 seconds (more frequent for real-time)
      intervalId = setInterval(async () => {
        // Skip if auto-refresh is paused
        if (autoRefreshPaused) {
          return;
        }
        
        try {
          const response = await fetch('/api/assets/last-updated', {
            credentials: 'include'
          });
          
          if (response.ok) {
            const { lastUpdated } = await response.json();
            const serverLastUpdated = new Date(lastUpdated);
            
            // If server has newer data, refresh
            if (!lastUpdateTime || serverLastUpdated > lastUpdateTime) {
              await fetchAssets();
            }
          }
        } catch (error) {
          console.error('Real-time update check failed:', error);
        }
      }, 5000); // Check every 5 seconds for real-time updates
    };

    // ENABLED: Start real-time updates
    startRealTimeUpdates();

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [lastUpdateTime, fetchAssets, autoRefreshPaused]);

  const searchAssets = useCallback(async (query: string) => {
    if (!query.trim()) {
      fetchAssets();
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/assets?search=${encodeURIComponent(query)}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setAssets(data);
      setLastUpdateTime(new Date());
    } catch (err) {
      console.error('Error searching assets:', err);
      setError(err instanceof Error ? err.message : 'Failed to search assets');
    } finally {
      setLoading(false);
    }
  }, [fetchAssets]);

  const updateAsset = useCallback((updatedAsset: Asset) => {
    setAssets(prevAssets => {
      const updatedAssets = prevAssets.map(asset => 
        asset.id === updatedAsset.id ? updatedAsset : asset
      );
      setLastUpdateTime(new Date());

      return updatedAssets;
    });
    
    // Always force refresh to ensure UI is updated, regardless of auto-refresh state
    setTimeout(() => {
      fetchAssets();
    }, 100);
  }, [fetchAssets]);

  const refreshAssets = useCallback(async () => {
    await fetchAssets();
  }, [fetchAssets]);

  const forceRefresh = useCallback(async () => {
    setLoading(true);
    await fetchAssets();
  }, [fetchAssets]);

  const pauseAutoRefresh = useCallback(() => {
    setAutoRefreshPaused(true);
  }, []);

  const resumeAutoRefresh = useCallback(() => {
    setAutoRefreshPaused(false);
  }, []);

  const value = {
    assets,
    loading,
    error,
    fetchAssets,
    searchAssets,
    updateAsset,
    refreshAssets,
    forceRefresh,
    lastUpdateTime,
    pauseAutoRefresh,
    resumeAutoRefresh
  };

  return (
    <AssetContext.Provider value={value}>
      {children}
    </AssetContext.Provider>
  );
};

export const useAssets = () => {
  const context = useContext(AssetContext);
  if (context === undefined) {
    throw new Error('useAssets must be used within an AssetProvider');
  }
  return context;
}; 