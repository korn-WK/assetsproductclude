import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';

export interface StatusOption {
  value: string;
  label: string;
  color?: string;
}

export function useStatusOptions() {
  const [options, setOptions] = useState<StatusOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatuses = useCallback(() => {
    setLoading(true);
    axios.get('/api/statuses')
      .then(res => {
        if (Array.isArray(res.data)) {
          setOptions(res.data.map((s: any) => ({
            id: s.id, // เพิ่ม id ตรงนี้
            value: s.value,
            label: s.label,
            color: s.color || '#adb5bd'
          })));
        }
      })
      .catch(() => setError('Failed to fetch statuses'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  return { options, loading, error, refresh: fetchStatuses };
} 