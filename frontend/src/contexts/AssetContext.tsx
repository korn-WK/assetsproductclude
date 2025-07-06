import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';

interface Asset {
  id: string;
  asset_code: string;
  name: string;
  description: string;
  location: string;
  location_id?: string;
  department: string;
  department_id?: string;
  owner: string;
  status: 'active' | 'transferring' | 'audited' | 'missing' | 'broken' | 'disposed'; // Updated status types
  image_url: string | null;
  acquired_date: string;
  serial_number?: string;
}

interface AssetContextType {
  assets: Asset[];
  loading: boolean;
  error: string | null;
  fetchAssets: (params?: Record<string, string>) => void;
  searchAssets: (query: string) => void;
}

const AssetContext = createContext<AssetContextType | undefined>(undefined);

export const AssetProvider = ({ children }: { children: ReactNode }) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssets = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      // สร้าง query string จาก params
      const query = new URLSearchParams(params).toString();
      const url = query ? `/api/assets?${query}` : '/api/assets';
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required. Please login again.');
        } else if (response.status === 403) {
          throw new Error('Access denied. You do not have permission to view assets.');
        } else {
          throw new Error(`Failed to fetch assets: ${response.statusText}`);
        }
      }
      const data = await response.json();
      setAssets(data.map((asset: any) => ({ ...asset, serial_number: asset.serial_number })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      if (err instanceof Error && !err.message.includes('Authentication') && !err.message.includes('Access denied')) {
        setTimeout(() => {
          fetchAssets(params);
        }, 3000);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const searchAssets = useCallback(async (query: string) => {
    console.log('AssetContext: searchAssets called with query:', query);
    if (!query.trim()) {
      console.log('AssetContext: Empty query, calling fetchAssets');
      fetchAssets(); // If search is cleared, fetch all assets
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const url = `/api/assets/search?q=${encodeURIComponent(query)}`;
      console.log('AssetContext: Making search request to:', url);
      const response = await fetch(url, {
        credentials: 'include'
      });
      console.log('AssetContext: searchAssets response status:', response.status);
      if (!response.ok) throw new Error('Failed to search assets');
      const data = await response.json();
      console.log('AssetContext: searchAssets data length:', data.length);
      setAssets(data.map((asset: any) => ({ ...asset, serial_number: asset.serial_number })));
    } catch (err) {
      console.error('AssetContext: searchAssets error:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      // Fallback to fetching all assets if search fails
      console.log('AssetContext: Falling back to fetchAssets due to search error');
      fetchAssets();
    } finally {
      setLoading(false);
    }
  }, [fetchAssets]);

  return (
    <AssetContext.Provider value={{ assets, loading, error, fetchAssets, searchAssets }}>
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