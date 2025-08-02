import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import axios from '../../../lib/axios';
import { FaEdit, FaTrashAlt, FaUserPlus, FaCrown, FaUserShield, FaUser } from 'react-icons/fa';
import { AiOutlineDown } from 'react-icons/ai';
import Swal from 'sweetalert2';
import styles from './UserManagementTable.module.css';
import UserEditPopup from '../UserEditPopup';
import AddUserPopup from '../AddUserPopup';
import { formatDate } from '../../../lib/utils';
import ExcelJS from 'exceljs';
import { AiOutlineDownload } from 'react-icons/ai';
import DateRangeFilterButton from '../../common/DateRangeFilterButton';
import { useAuth } from '../../../contexts/AuthContext';
import Pagination from '../../common/Pagination';
import { highlightText } from '../../common/highlightText';

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

const UserManagementTable: React.FC<UserManagementTableProps> = ({ searchTerm }) => {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [showAddUserPopup, setShowAddUserPopup] = useState(false);
  const [roleFilter, setRoleFilter] = useState('all');
  const [dateRange, setDateRange] = useState<{ startDate?: Date; endDate?: Date }>({});
  // Pagination for card list (mobile)
  const [cardPage, setCardPage] = useState(1);
  const cardsPerPage = 5;
  // Pagination for table (desktop/tablet)
  const [tablePage, setTablePage] = useState(1);
  const rowsPerPage = 5;

  // ฟิลเตอร์ user ตาม search, role และ date range
  const filteredUsers = users.filter(user => {
    const q = (searchTerm || '').toLowerCase();
    const matchSearch = (
      user.username?.toLowerCase().includes(q) ||
      user.name?.toLowerCase().includes(q) ||
      user.email?.toLowerCase().includes(q) ||
      user.department_name?.toLowerCase().includes(q) ||
                      user.originalRole?.toLowerCase().includes(q) ||
      formatDate(user.created_at).toLowerCase().includes(q)
    );
          const matchRole = roleFilter === 'all' || user.originalRole.toLowerCase() === roleFilter.toLowerCase();
    
    // Date range filter
    let matchDate = true;
    if (dateRange.startDate && dateRange.endDate) {
      const userCreatedAt = new Date(user.created_at);
      const startDate = new Date(dateRange.startDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(dateRange.endDate);
      endDate.setHours(23, 59, 59, 999);
      matchDate = userCreatedAt >= startDate && userCreatedAt <= endDate;
    }
    
    return matchSearch && matchRole && matchDate;
  });

  const totalCardPages = Math.ceil(filteredUsers.length / cardsPerPage);
  const currentCardData = filteredUsers.slice((cardPage - 1) * cardsPerPage, cardPage * cardsPerPage);
  const totalTablePages = Math.ceil(filteredUsers.length / rowsPerPage);
  const currentTableData = filteredUsers.slice((tablePage - 1) * rowsPerPage, tablePage * rowsPerPage);

  // Reset cardPage to 1 when filteredUsers changes
  useEffect(() => {
    setCardPage(1);
  }, [filteredUsers.length]);

  // Reset tablePage to 1 when filteredUsers changes
  useEffect(() => {
    setTablePage(1);
  }, [filteredUsers.length]);

  // Reset pagination when dateRange changes
  useEffect(() => {
    setCardPage(1);
    setTablePage(1);
  }, [dateRange]);

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
      user.originalRole || '',
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

  const handleAddUser = () => {
    setShowAddUserPopup(true);
  };

  const handleCloseAddUserPopup = () => {
    setShowAddUserPopup(false);
  };

  const handleUserAdded = async (newUser: UserType) => {
    // Refresh data from server instead of just adding to state
    try {
      const response = await axios.get('/api/users');
      setUsers(response.data);
      setShowAddUserPopup(false);
      Swal.fire({
        title: "Success!",
        text: "User added successfully",
        icon: "success",
        confirmButtonText: "OK"
      });
    } catch (error) {
      console.error('Error refreshing users after adding:', error);
      // Fallback to adding to state if refresh fails
      setUsers(prev => [...prev, newUser]);
      setShowAddUserPopup(false);
      Swal.fire({
        title: "Success!",
        text: "User added successfully",
        icon: "success",
        confirmButtonText: "OK"
      });
    }
  };

  const handleUsersImported = async (importedUsers: UserType[]) => {
    // Refresh data from server instead of just adding to state
    try {
      const response = await axios.get('/api/users');
      setUsers(response.data);
      setShowAddUserPopup(false);
      Swal.fire({
        title: "Success!",
        text: `${importedUsers.length} users imported successfully`,
        icon: "success",
        confirmButtonText: "OK"
      });
    } catch (error) {
      console.error('Error refreshing users after import:', error);
      // Fallback to adding to state if refresh fails
      setUsers(prev => [...prev, ...importedUsers]);
      setShowAddUserPopup(false);
      Swal.fire({
        title: "Success!",
        text: `${importedUsers.length} users imported successfully`,
        icon: "success",
        confirmButtonText: "OK"
      });
    }
  };

  let userTitle = `Total of ${filteredUsers.length} users`;

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
          <span className={styles.mobileUserTitle}>{userTitle}</span>
        </div>
                 <div className={styles.mobileControls}>
           <div className={styles.dropdownWrapper}>
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
             <span className={styles.caretIcon}><AiOutlineDown /></span>
           </div>
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
          <>
            {currentCardData.map((user: UserType) => (
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
                  <div className={styles.cardField}><span>Role:</span> <span className={`${styles.roleBadge} ${user.originalRole === 'SuperAdmin' ? styles.roleSuperAdmin : user.originalRole === 'Admin' ? styles.roleAdmin : styles.roleUser}`}>{highlightText(user.originalRole, searchTerm || '')}</span></div>
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
            ))}
            {totalCardPages > 1 && (
              <Pagination
                currentPage={cardPage}
                totalPages={totalCardPages}
                onPageChange={setCardPage}
              />
            )}
          </>
        )}
      </div>

      {/* Table for Desktop/Tablet */}
      <div className={styles.tableContainer}>
        <div className={styles.header}>
          <div>
            <p className={styles.totalAssets}>{userTitle}</p>
                            {user?.originalRole === 'SuperAdmin' ? (
              <p style={{ fontSize: '1.1rem', fontWeight: 500, color: 'var(--text-color-primary)', marginTop: '1rem', marginBottom: 0 }}>User management for administrators</p>
            ) : (
              <p style={{ fontSize: '1.1rem', fontWeight: 500, color: 'var(--text-color-primary)', marginTop: '1rem', marginBottom: 0 }}>Asset management for user</p>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '24px 0 16px 0', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                         <div className={styles.filterButtons}>
               {/* เปลี่ยนจากปุ่มกลุ่มเป็น dropdown */}
               <div className={styles.dropdownWrapper}>
                 <select
                   className={styles.dropdown}
                   value={roleFilter}
                   onChange={e => setRoleFilter(e.target.value)}
                   style={{ minWidth: 140, padding: '0.7rem 1.2rem', borderRadius: 12, border: '1px solid var(--border-color)', fontSize: '1rem', color: 'var(--text-color-primary)', background: 'var(--card-bg)' }}
                 >
                   <option value="all">All Roles</option>
                   <option value="SuperAdmin">SuperAdmin</option>
                   <option value="Admin">Admin</option>
                   <option value="User">User</option>
                 </select>
                 <span className={styles.caretIcon}><AiOutlineDown /></span>
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
            {currentTableData.length === 0 ? (
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
              currentTableData.map((user: UserType) => (
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
                        user.originalRole === 'SuperAdmin'
                          ? styles.roleSuperAdmin
                          : user.originalRole === 'Admin'
                          ? styles.roleAdmin
                          : styles.roleUser
                      }`
                    }>
                      {user.originalRole === 'SuperAdmin' && <FaCrown style={{marginRight: 4}} />}
                      {user.originalRole === 'Admin' && <FaUserShield style={{marginRight: 4}} />}
                      {user.originalRole === 'User' && <FaUser style={{marginRight: 4}} />}
                      {highlightText(user.originalRole, searchTerm || '')}
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
        {totalTablePages > 1 && (
          <Pagination
            currentPage={tablePage}
            totalPages={totalTablePages}
            onPageChange={setTablePage}
          />
        )}
      </div>

      {showAddUserPopup && (
        <AddUserPopup
          onClose={handleCloseAddUserPopup}
          onUserAdded={handleUserAdded}
          onUsersImported={handleUsersImported}
        />
      )}

      {editingUser && (
        <UserEditPopup
          user={editingUser}
          onClose={handleClosePopup}
          onUpdate={handleUpdateUser as any}
        />
      )}
    </>
  );
};

export default UserManagementTable; 