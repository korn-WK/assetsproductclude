import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import axios from '../../../lib/axios';
import { FaEdit, FaTrashAlt, FaSearch, FaFilePdf, FaUserShield, FaUserPlus, FaCrown, FaUser } from 'react-icons/fa';
import Swal from 'sweetalert2';
import styles from './UserManagementTable.module.css';
import UserEditPopup from '../UserEditPopup';
import { formatDate } from '../../../lib/utils';
import ExcelJS from 'exceljs';
import { AiOutlineDownload } from 'react-icons/ai';
import DateRangeFilterButton from '../../common/DateRangeFilterButton';
import AddUserPopup from '../AddUserPopup';

interface UserType {
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

interface UserManagementTableProps {
  searchTerm?: string;
}

// ฟังก์ชัน highlightText
function highlightText(text: string, keyword: string) {
  if (!keyword) return text;
  const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.split(regex).map((part, i) =>
    part.toLowerCase() === keyword.toLowerCase() ? <mark key={i} style={{ background: '#ffe066', color: '#222', padding: 0 }}>{part}</mark> : part
  );
}

const UserManagementTable: React.FC<UserManagementTableProps> = ({ searchTerm }) => {
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [roleFilter, setRoleFilter] = useState('all');
  const [dateRange, setDateRange] = useState<{ startDate?: Date; endDate?: Date }>({});
  const [showAddUserPopup, setShowAddUserPopup] = useState(false);

  // Move fetchUsers to be accessible for refresh
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

  useEffect(() => {
    // Pre-warm the PDF generator on component mount to ensure the font is ready.
    import('../../../lib/pdfGenerator').then(pdfModule => {
        if (pdfModule.preparePdfGenerator) {
            pdfModule.preparePdfGenerator();
        }
    });
  }, []);

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleEdit = (user: UserType) => {
    setEditingUser(user);
  };

  const handleClosePopup = () => {
    setEditingUser(null);
  };

  const handleUpdateUser = (updatedUser: UserType) => {
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

  // Combine all filters: role, date, search
  const filteredUsers = users.filter(user => {
    // 1. Role filter
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    // 2. Date filter
    let matchesDate = true;
    if (dateRange.startDate && dateRange.endDate && user.created_at) {
      const created = new Date(user.created_at);
      const start = new Date(dateRange.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(dateRange.endDate);
      end.setHours(23, 59, 59, 999);
      matchesDate = created >= start && created <= end;
    }
    // 3. Search filter
    const q = (searchTerm || '').toLowerCase();
    const matchesSearch = !q ||
      user.username?.toLowerCase().includes(q) ||
      user.name?.toLowerCase().includes(q) ||
      user.email?.toLowerCase().includes(q) ||
      user.department_name?.toLowerCase().includes(q) ||
      user.role?.toLowerCase().includes(q) ||
      formatDate(user.created_at).toLowerCase().includes(q);
    return matchesRole && matchesDate && matchesSearch;
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

  const handleExportXLSX = async () => {
    if (filteredUsers.length === 0) return;
    const rows = filteredUsers.map(user => ([
      user.username || '',
      user.name || '',
      user.email || '',
      user.department_name || '',
      user.role || '',
      formatDate(user.created_at),
    ]));
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Users');
    // Add header
    worksheet.addRow([
      'Username',
      'Name',
      'Email',
      'Department',
      'Role',
      'Created At',
    ]);
    // Add data rows
    rows.forEach(row => {
      worksheet.addRow(row);
    });
    // Set column widths (auto width)
    if (worksheet.columns) {
      worksheet.columns.forEach((column) => {
        let maxLength = 10;
        if (typeof column.eachCell === 'function') {
          column.eachCell({ includeEmpty: true }, (cell) => {
            const cellValue = cell.value ? cell.value.toString() : '';
            maxLength = Math.max(maxLength, cellValue.length + 2);
          });
        }
        column.width = maxLength;
      });
    }
    // Center align and add border to all cells
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } },
        };
        if (rowNumber === 1) {
          cell.font = { bold: true };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD9D9D9' },
          };
        }
      });
    });
    // Download file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users.xlsx';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleAddUser = () => setShowAddUserPopup(true);

  let userTitle = '';
  if (roleFilter === 'all') userTitle = 'All Users';
  else if (roleFilter === 'SuperAdmin') userTitle = 'SuperAdmin';
  else if (roleFilter === 'Admin') userTitle = 'Admin';
  else if (roleFilter === 'User') userTitle = 'User';

  console.log('filteredUsers', filteredUsers);

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
      {/* Mobile Controls */}
      <div className={`${styles.mobileControlsWrapper} ${styles.mobileOnly}`}>
        <div className={styles.mobileTitleRow}>
          <span className={styles.mobileUserTitle}>{userTitle} ({filteredUsers.length})</span>
        </div>
        <div className={styles.mobileControls}>
          <select
            className={styles.mobileFilterDropdown}
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="SuperAdmin">SuperAdmin</option>
            <option value="Admin">Admin</option>
            <option value="User">User</option>
          </select>
          <DateRangeFilterButton
            value={dateRange}
            onChange={setDateRange}
            label="Created At"
          />
          <button className={styles.exportButton} onClick={handleExportXLSX}>
            <AiOutlineDownload />
          </button>
          <button className={styles.addButton} onClick={handleAddUser}>
            <FaUserPlus />
          </button>
        </div>
      </div>

      {/* Card List for Mobile */}
      <div className={styles.cardList}>
        {filteredUsers.length === 0 ? (
          <div className={styles.noDataCard}>No users found</div>
        ) : (
          filteredUsers.map((user: UserType) => (
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
                  <div className={styles.cardName}>{highlightText(user.name, searchTerm || '')}</div>
                  <div className={styles.cardEmail}>{highlightText(user.email, searchTerm || '')}</div>
                </div>
              </div>
              <div className={styles.cardFields}>
                <div className={styles.cardField}><span>Department:</span> {highlightText(user.department_name || 'Not Assigned', searchTerm || '')}</div>
                <div className={styles.cardField}><span>Role:</span> <span className={`${styles.roleBadge} ${user.role === 'SuperAdmin' ? styles.roleSuperAdmin : user.role === 'Admin' ? styles.roleAdmin : styles.roleUser}`}>{highlightText(user.role, searchTerm || '')}</span></div>
                <div className={styles.cardField}><span>Created At:</span> {highlightText(formatDate(user.created_at), searchTerm || '')}</div>
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
                  className={`${styles.roleButton} ${roleFilter === 'SuperAdmin' ? styles.active : ''}`}
                  onClick={() => setRoleFilter('SuperAdmin')}
                  type="button"
                >
                  SuperAdmin
                </button>
                <button
                  className={`${styles.roleButton} ${roleFilter === 'Admin' ? styles.active : ''}`}
                  onClick={() => setRoleFilter('Admin')}
                  type="button"
                >
                  Admin
                </button>
                <button
                  className={`${styles.roleButton} ${roleFilter === 'User' ? styles.active : ''}`}
                  onClick={() => setRoleFilter('User')}
                  type="button"
                >
                  User
                </button>
              </div>
            </div>
          </div>
          <div className={styles.actionButtons}>
            <DateRangeFilterButton
              value={dateRange}
              onChange={setDateRange}
              label="Created At"
            />
            <button className={styles.exportButton} onClick={handleExportXLSX}>
              <AiOutlineDownload /> Export XLSX
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
              filteredUsers.map((user: UserType) => (
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
                  <td style={{ fontWeight: '600' }}>{highlightText(user.username, searchTerm || '')}</td>
                  <td>{highlightText(user.name, searchTerm || '')}</td>
                  <td>{highlightText(user.email, searchTerm || '')}</td>
                  <td>
                    {highlightText(user.department_name ? user.department_name : (user.department_id ? String(user.department_id) : 'Not Assigned'), searchTerm || '')}
                  </td>
                  <td>
                    <span className={
                      `${styles.roleBadge} ${
                        user.role === 'SuperAdmin'
                          ? styles.roleSuperAdmin
                          : user.role === 'Admin'
                          ? styles.roleAdmin
                          : styles.roleUser
                      }`
                    }>
                      {user.role === 'SuperAdmin' && <FaCrown style={{marginRight: 4}} />}
                      {user.role === 'Admin' && <FaUserShield style={{marginRight: 4}} />}
                      {user.role === 'User' && <FaUser style={{marginRight: 4}} />}
                      {highlightText(user.role, searchTerm || '')}
                    </span>
                  </td>
                  <td>{highlightText(formatDate(user.created_at), searchTerm || '')}</td>
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
          onUpdate={handleUpdateUser as any}
        />
      )}
      {showAddUserPopup && (
        <AddUserPopup
          onClose={() => setShowAddUserPopup(false)}
          onUserAdded={user => { setUsers([...users, user]); fetchUsers(); }}
          onUsersImported={importedUsers => { setUsers([...users, ...importedUsers]); fetchUsers(); }}
        />
      )}
    </>
  );
};

export default UserManagementTable; 