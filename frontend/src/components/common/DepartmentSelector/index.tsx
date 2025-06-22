import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import styles from './DepartmentSelector.module.css';

interface Department {
  id: number;
  name_th: string;
}

const DepartmentSelector: React.FC = () => {
  const { user } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<number | null>(user?.department_id || null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    fetchDepartments();
  }, []);

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

  const handleDepartmentChange = async (departmentId: number | null) => {
    setLoading(true);
    setMessage('');
    
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
    <div className={styles.container}>
      <h3>Select Your Department</h3>
      <p className={styles.description}>
        Choose your department to see only relevant assets. 
        Select &quot;All Departments&quot; to see all assets.
      </p>
      
      <div className={styles.selector}>
        <select
          value={selectedDepartment || ''}
          onChange={(e) => {
            const value = e.target.value;
            const departmentId = value === '' ? null : parseInt(value);
            handleDepartmentChange(departmentId);
          }}
          disabled={loading}
          className={styles.select}
        >
          <option value="">All Departments</option>
          {departments.map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.name_th}
            </option>
          ))}
        </select>
      </div>

      {loading && <p className={styles.loading}>Updating...</p>}
      {message && (
        <p className={`${styles.message} ${message.includes('successfully') ? styles.success : styles.error}`}>
          {message}
        </p>
      )}
    </div>
  );
};

export default DepartmentSelector; 