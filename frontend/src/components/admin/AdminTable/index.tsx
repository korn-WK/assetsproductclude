import React, { useState, useEffect } from 'react';
import { AiOutlinePlus, AiOutlineEdit, AiOutlineDelete, AiOutlineSearch } from 'react-icons/ai';
import Swal from 'sweetalert2';
import styles from './AdminTable.module.css';
import Pagination from '../../common/Pagination';

interface AdminTableProps {
  title: string;
  data: any[];
  columns: {
    key: string;
    label: string;
    render?: (value: any, item: any) => React.ReactNode;
  }[];
  onAdd: () => void;
  onEdit: (item: any) => void;
  onDelete: (id: string | number) => Promise<void>;
  loading?: boolean;
  searchPlaceholder?: string;
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

const AdminTable: React.FC<AdminTableProps> = ({
  title,
  data,
  columns,
  onAdd,
  onEdit,
  onDelete,
  loading = false,
  searchPlaceholder = "Search...",
  searchTerm: propSearchTerm // Destructure searchTerm from props
}) => {
  // searchTerm now comes from props
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 600);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Filter data based on search term
  const filteredData = data.filter(item =>
    columns.some(col => {
      // เฉพาะคอลัมน์ที่ต้องการค้นหา (เช่น name_th, name_en, description, created_at)
      const value = item[col.key];
      // created_at อาจต้องแปลงเป็น string ที่แสดงจริง
      if (col.key === 'created_at' && value) {
        return new Date(value).toLocaleDateString('en-US').toLowerCase().includes(propSearchTerm?.toLowerCase() || '');
      }
      return value && value.toString().toLowerCase().includes(propSearchTerm?.toLowerCase() || '');
    })
  );

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const currentData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleDelete = async (id: string | number) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        await onDelete(id);
        Swal.fire(
          'Deleted!',
          'The item has been deleted.',
          'success'
        );
      } catch (error) {
        // Check if it's a department deletion error
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete the item.';
        
        if (errorMessage.includes('Cannot delete department')) {
          Swal.fire({
            title: 'Cannot Delete Department',
            html: `
              <div style="text-align: left;">
                <p><strong>This department cannot be deleted because:</strong></p>
                <p>${errorMessage.replace('Cannot delete department: ', '')}</p>
                <br>
                <p><strong>To delete this department, you need to:</strong></p>
                <ul style="text-align: left; margin: 10px 0;">
                  <li>Move all assets to another department first</li>
                  <li>Update users to use a different department</li>
                </ul>
                <p style="color: #666; font-size: 0.9em;">
                  Go to Asset Management and User Management to make these changes.
                </p>
              </div>
            `,
            icon: 'warning',
            confirmButtonText: 'I Understand',
            confirmButtonColor: '#3085d6'
          });
        } else if (errorMessage.includes('Cannot delete location')) {
          Swal.fire({
            title: 'Cannot Delete Location',
            html: `
              <div style="text-align: left;">
                <p><strong>This location cannot be deleted because:</strong></p>
                <p>${errorMessage.replace('Cannot delete location: ', '')}</p>
                <br>
                <p><strong>To delete this location, you need to:</strong></p>
                <ul style="text-align: left; margin: 10px 0;">
                  <li>Move all assets to another location first</li>
                  <li>Update asset locations in Asset Management</li>
                </ul>
                <p style="color: #666; font-size: 0.9em;">
                  Go to Asset Management to update asset locations before deleting this location.
                </p>
              </div>
            `,
            icon: 'warning',
            confirmButtonText: 'I Understand',
            confirmButtonColor: '#3085d6'
          });
        } else {
          Swal.fire(
            'Error!',
            errorMessage,
            'error'
          );
        }
      }
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2>{title}</h2>
        </div>
        <div className={styles.loadingState}>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2>{title}</h2>
          <p className={styles.totalItems}>Total {data.length} items</p>
          <p className={styles.description}>Complete {title.toLowerCase()} management for administrators</p>
        </div>
        <button className={styles.addButton} onClick={onAdd}>
          <AiOutlinePlus /> Add New
        </button>
      </div>

      {/* เงื่อนไขแสดง search เฉพาะถ้ามี searchPlaceholder */}
      

      {isMobile ? (
        <>
          <div className={styles.cardList}>
            {currentData.length === 0 ? (
              <div className={styles.noData}>No data found</div>
            ) : (
              currentData.map((item, index) => (
                <div className={styles.card} key={item.id || index}>
                  <div className={styles.cardContent}>
                    {columns.map((column) => (
                      <div key={column.key} className={styles.cardField}>
                        <span className={styles.cardLabel}>{column.label}:</span>
                        <span className={styles.cardValue}>
                          {(() => {
                            // ถ้า column นี้มี render function ให้ wrap ด้วย highlightText ถ้าเป็นคอลัมน์ที่ค้นหาได้
                            const value = item[column.key];
                            if (column.render) {
                              const rendered = column.render(value, item);
                              // ถ้าเป็น string ให้ highlight ได้
                              if (typeof rendered === 'string') {
                                return highlightText(rendered, propSearchTerm || '');
                              }
                              return rendered;
                            }
                            return highlightText(value || '-', propSearchTerm || '');
                          })()}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className={styles.cardActions}>
                    <button
                      className={styles.editButton}
                      onClick={() => onEdit(item)}
                      title="Edit"
                    >
                      <AiOutlineEdit />
                    </button>
                    <button
                      className={styles.deleteButton}
                      onClick={() => handleDelete(item.id)}
                      title="Delete"
                    >
                      <AiOutlineDelete />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          {totalPages > 1 && (
            <div className={styles.paginationWrapper}>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </>
      ) : (
        <>
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column.key}>{column.label}</th>
                  ))}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentData.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + 1} className={styles.noData}>
                      No data found
                    </td>
                  </tr>
                ) : (
                  currentData.map((item, index) => (
                    <tr key={item.id || index}>
                      {columns.map((column) => (
                        <td key={column.key}>
                          {(() => {
                            // ถ้า column นี้มี render function ให้ wrap ด้วย highlightText ถ้าเป็นคอลัมน์ที่ค้นหาได้
                            const value = item[column.key];
                            if (column.render) {
                              const rendered = column.render(value, item);
                              // ถ้าเป็น string ให้ highlight ได้
                              if (typeof rendered === 'string') {
                                return highlightText(rendered, propSearchTerm || '');
                              }
                              return rendered;
                            }
                            return highlightText(value || '-', propSearchTerm || '');
                          })()}
                        </td>
                      ))}
                      <td className={styles.actions}>
                        <button
                          className={styles.editButton}
                          onClick={() => onEdit(item)}
                          title="Edit"
                        >
                          <AiOutlineEdit />
                        </button>
                        <button
                          className={styles.deleteButton}
                          onClick={() => handleDelete(item.id)}
                          title="Delete"
                        >
                          <AiOutlineDelete />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className={styles.paginationWrapper}>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminTable; 