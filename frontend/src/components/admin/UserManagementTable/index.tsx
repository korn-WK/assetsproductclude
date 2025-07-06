import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import axios from '../../../lib/axios';
import { FaEdit, FaTrashAlt, FaSearch, FaFilePdf, FaUserShield, FaUserPlus } from 'react-icons/fa';
import Swal from 'sweetalert2';
import styles from './UserManagementTable.module.css';
import UserEditPopup from '../UserEditPopup';
import { formatDate } from '../../../lib/utils';

interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  department_id: number | null;
  department_name: string | null;
  picture: string | null;
  created_at: string;
}

const UserManagementTable: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  useEffect(() => {
    // Pre-warm the PDF generator on component mount to ensure the font is ready.
    import('../../../lib/pdfGenerator').then(pdfModule => {
        if (pdfModule.preparePdfGenerator) {
            pdfModule.preparePdfGenerator();
        }
    });
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get('/api/users');
        setUsers(response.data);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleEdit = (user: User) => {
    setEditingUser(user);
  };

  const handleClosePopup = () => {
    setEditingUser(null);
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUsers(users.map(user => user.id === updatedUser.id ? { ...user, ...updatedUser } : user));
  };

  const handleDelete = (userId: number, username: string) => {
    Swal.fire({
      title: `Delete ${username}?`,
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel"
    }).then((result) => {
      if (result.isConfirmed) {
        axios.delete(`/api/users/${userId}`)
          .then(() => {
            setUsers(users.filter(user => user.id !== userId));
            Swal.fire({
              title: "Deleted!",
              text: `User ${username} has been deleted`,
              icon: "success",
              timer: 1500,
              showConfirmButton: false
            });
          })
          .catch((error) => {
            console.error('Error deleting user:', error);
            Swal.fire({
              title: "Error!",
              text: error.response?.data?.error || 'Failed to delete user',
              icon: "error"
            });
          });
      }
    });
  };

  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = searchTerm === '' ||
      (user.name && user.name.toLowerCase().includes(searchLower)) ||
      (user.email && user.email.toLowerCase().includes(searchLower)) ||
      (user.username && user.username.toLowerCase().includes(searchLower));

    const matchesRole = roleFilter === 'all' || user.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const handleExportPDF = async () => {
    try {
      const { generateUsersPDF } = await import('../../../lib/pdfGenerator');
      generateUsersPDF(filteredUsers);
      Swal.fire({
        title: "Export Successful!",
        text: "PDF file has been generated",
        icon: "success",
        timer: 1500,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      Swal.fire({
        title: "Error!",
        text: "Failed to export PDF",
        icon: "error"
      });
    }
  };

  const handleAddUser = () => {
    Swal.fire({
      title: "Add New User",
      text: "This feature will be available soon",
      icon: "info",
      confirmButtonText: "OK"
    });
  };

  let userTitle = '';
  if (roleFilter === 'all') userTitle = 'All Users';
  else if (roleFilter === 'admin') userTitle = 'Admin';
  else if (roleFilter === 'user') userTitle = 'User';

  if (loading) {
    return (
      <div className={styles.tableContainer}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          padding: '3rem',
          color: 'var(--text-color-secondary)'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              border: '3px solid var(--border-color)', 
              borderTop: '3px solid var(--button-primary-bg)', 
              borderRadius: '50%', 
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem'
            }}></div>
            <p style={{ margin: 0, fontSize: '1.1rem' }}>Loading users...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Card List for Mobile */}
      <div className={styles.cardList}>
        {filteredUsers.length === 0 ? (
          <div className={styles.noDataCard}>No users found</div>
        ) : (
          filteredUsers.map((user) => (
            <div className={styles.userCard} key={user.id}>
              <div className={styles.cardHeader}>
                {user.picture ? (
                  <Image
                    src={user.picture}
                    alt={user.name}
                    width={48}
                    height={48}
                    className={styles.userPicture}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = '/file.svg';
                    }}
                  />
                ) : (
                  <div className={styles.defaultAvatar}>
                    {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
                <div className={styles.cardMainInfo}>
                  <div className={styles.cardName}>{user.name}</div>
                  <div className={styles.cardEmail}>{user.email}</div>
                </div>
              </div>
              <div className={styles.cardFields}>
                <div className={styles.cardField}><span>Department:</span> {user.department_name || 'Not Assigned'}</div>
                <div className={styles.cardField}><span>Role:</span> <span className={`${styles.roleBadge} ${user.role === 'admin' ? styles.roleAdmin : styles.roleUser}`}>{user.role === 'admin' ? 'Admin' : 'User'}</span></div>
              </div>
              <div className={styles.cardActions}>
                <button
                  className={`${styles.iconButton} ${styles.editButton}`}
                  onClick={() => handleEdit(user)}
                  title="Edit"
                >
                  <FaEdit />
                </button>
                <button
                  className={`${styles.iconButton} ${styles.deleteButton}`}
                  onClick={() => handleDelete(user.id, user.username)}
                  title="Delete"
                >
                  <FaTrashAlt />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Table for Desktop/Tablet */}
      <div className={styles.tableContainer}>
        <div className={styles.header}>
          <h3>{userTitle} ({filteredUsers.length})</h3>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '24px 0 16px 0', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className={styles.filterButtons}>
              <div className={styles.roleButtonGroup}>
                <button
                  className={`${styles.roleButton} ${roleFilter === 'all' ? styles.active : ''}`}
                  onClick={() => setRoleFilter('all')}
                  type="button"
                >
                  All Roles
                </button>
                <button
                  className={`${styles.roleButton} ${roleFilter === 'admin' ? styles.active : ''}`}
                  onClick={() => setRoleFilter('admin')}
                  type="button"
                >
                  Admin
                </button>
                <button
                  className={`${styles.roleButton} ${roleFilter === 'user' ? styles.active : ''}`}
                  onClick={() => setRoleFilter('user')}
                  type="button"
                >
                  User
                </button>
              </div>
            </div>
          </div>
          <div className={styles.actionButtons}>
            <button className={styles.exportButton} onClick={handleExportPDF}>
              <FaFilePdf /> Export PDF
            </button>
            <button className={styles.addButton} onClick={handleAddUser}>
              <FaUserPlus /> Add User
            </button>
          </div>
        </div>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Avatar</th>
              <th>Username</th>
              <th>Name</th>
              <th>Email</th>
              <th>Department</th>
              <th>Role</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ 
                  textAlign: 'center', 
                  padding: '3rem 1.5rem',
                  color: 'var(--text-color-secondary)',
                  fontStyle: 'italic'
                }}>
                  No users found
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td>
                    {user.picture ? (
                      <Image
                        src={user.picture}
                        alt={user.name}
                        width={50}
                        height={50}
                        className={styles.userPicture}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/file.svg';
                        }}
                      />
                    ) : (
                      <div className={styles.defaultAvatar}>
                        {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                    )}
                  </td>
                  <td style={{ fontWeight: '600' }}>{user.username}</td>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.department_name || 'Not Assigned'}</td>
                  <td>
                    <span className={`${styles.roleBadge} ${user.role === 'admin' ? styles.roleAdmin : styles.roleUser}`}>
                      {user.role === 'admin' ? 'Admin' : 'User'}
                    </span>
                  </td>
                  <td>{formatDate(user.created_at)}</td>
                  <td>
                    <div className={styles.actions}>
                      <button
                        className={`${styles.iconButton} ${styles.editButton}`}
                        onClick={() => handleEdit(user)}
                        title="Edit"
                      >
                        <FaEdit />
                      </button>
                      <button
                        className={`${styles.iconButton} ${styles.deleteButton}`}
                        onClick={() => handleDelete(user.id, user.username)}
                        title="Delete"
                      >
                        <FaTrashAlt />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editingUser && (
        <UserEditPopup
          user={editingUser}
          onClose={handleClosePopup}
          onUpdate={handleUpdateUser}
        />
      )}
    </>
  );
};

export default UserManagementTable; 