import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import styles from './DepartmentSelector.module.css';

interface Department {
  id: number;
  name_th: string;
}

interface DepartmentSelectorProps {
  value?: number | 'all';
  onChange?: (value: number | 'all') => void;
  showAllOption?: boolean;
  compact?: boolean;
}

const DepartmentSelector: React.FC<DepartmentSelectorProps> = ({ value, onChange, showAllOption, compact }) => {
  const { user } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<number | 'all'>(value ?? (user?.department_id ?? 'all'));
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (value !== undefined) setSelectedDepartment(value);
  }, [value]);

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/api/assets/departments', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setDepartments(data);
      }
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  };

  const handleDepartmentChange = async (departmentId: number | 'all') => {
    setLoading(true);
    setMessage('');
    if (onChange) {
      onChange(departmentId);
      setLoading(false);
      setSelectedDepartment(departmentId);
      return;
    }
    
    try {
      const response = await fetch('/api/auth/department', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ department_id: departmentId }),
        credentials: 'include'
      });

      if (response.ok) {
        setSelectedDepartment(departmentId);
        setMessage('Department updated successfully!');
        
        // Reload the page to refresh the assets list
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        const errorData = await response.json();
        setMessage(errorData.message || 'Failed to update department');
      }
    } catch (err) {
      console.error('Error updating department:', err);
      setMessage('Failed to update department');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={compact ? styles.containerCompact : styles.container}>
      <div className={styles.dropdownWrapper}>
        <select
          className={styles.departmentDropdown}
          value={selectedDepartment === 'all' ? '' : selectedDepartment}
          onChange={(e) => {
            const value = e.target.value;
            const departmentId = value === '' ? 'all' : parseInt(value);
            handleDepartmentChange(departmentId);
          }}
          disabled={loading}
        >
          {showAllOption && <option value="">All Departments</option>}
          {departments.map((dep) => (
            <option key={dep.id} value={dep.id}>{dep.name_th}</option>
          ))}
        </select>
        <span className={styles.dropdownIcon}>▼</span>
      </div>
      {loading && <div className={styles.loading}>Loading...</div>}
      {message && <div className={styles.message}>{message}</div>}
    </div>
  );
};

export default DepartmentSelector; 