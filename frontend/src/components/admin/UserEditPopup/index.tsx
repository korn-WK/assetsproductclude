import React, { useState, useEffect } from 'react';
import axios from '../../../lib/axios';
import Swal from 'sweetalert2';
import styles from './UserEditPopup.module.css';

interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  role: 'SuperAdmin' | 'Admin' | 'User';
  department_id: number | null;
  department_name: string | null;
  picture: string | null;
  created_at: string;
}

interface Department {
  id: number;
  name_th: string;
}

interface UserEditPopupProps {
  user: User | null;
  onClose: () => void;
  onUpdate: (updatedUser: User) => void;
}

const UserEditPopup: React.FC<UserEditPopupProps> = ({ user, onClose, onUpdate }) => {
  const [formData, setFormData] = useState<Partial<User>>({});
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await axios.get('/api/assets/departments');
        setDepartments(response.data);
      } catch (error) {
        console.error('Error fetching departments:', error);
      }
    };
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (user) {
      setFormData({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.originalRole,
        department_id: user.department_id,
        department_name: user.department_name,
        picture: user.picture,
        created_at: user.created_at,
      });
    }
  }, [user]);

  if (!user) {
    return null;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await axios.put(`/api/users/${user.id}`, formData);
      onUpdate(response.data);
      onClose();
      
      Swal.fire({
        title: 'Success!',
        text: `User ${user.username} has been updated`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });

    } catch (error: unknown) {
      console.error('Error updating user:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update user';
      Swal.fire({
        title: "Error!",
        text: errorMessage,
        icon: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.popup} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Edit User: {user.username}</h2>
          <button onClick={onClose} className={styles.closeButton}>&times;</button>
        </div>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name || ''}
              onChange={handleChange}
              placeholder="Enter full name"
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email || ''}
              onChange={handleChange}
              placeholder="Enter email address"
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="role">Role</label>
            <select
              id="role"
              name="role"
              value={formData.role || 'User'}
              onChange={handleChange}
            >
              <option value="User">User</option>
              <option value="Admin">Admin</option>
              <option value="SuperAdmin">SuperAdmin</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="department_id">Department</label>
            <select
              id="department_id"
              name="department_id"
              value={formData.department_id || ''}
              onChange={handleChange}
            >
              <option value="">No Department</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name_th}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.actions}>
            <button 
              type="button" 
              onClick={onClose} 
              className={styles.cancelButton}
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className={styles.saveButton}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserEditPopup;