import React, { useState } from 'react';
import { AiOutlinePlus, AiOutlineEdit, AiOutlineDelete, AiOutlineSearch } from 'react-icons/ai';
import Swal from 'sweetalert2';
import styles from './AdminTable.module.css';

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
}

const AdminTable: React.FC<AdminTableProps> = ({
  title,
  data,
  columns,
  onAdd,
  onEdit,
  onDelete,
  loading = false,
  searchPlaceholder = "Search..."
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter data based on search term
  const filteredData = data.filter(item =>
    Object.values(item).some(value =>
      value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
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
        </div>
        <button className={styles.addButton} onClick={onAdd}>
          <AiOutlinePlus /> Add New
        </button>
      </div>

      <div className={styles.searchContainer}>
        <div className={styles.searchBox}>
          <AiOutlineSearch className={styles.searchIcon} />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>
      </div>

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
                      {column.render 
                        ? column.render(item[column.key], item)
                        : item[column.key] || '-'
                      }
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
        <div className={styles.pagination}>
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className={styles.pageButton}
          >
            Previous
          </button>
          <span className={styles.pageInfo}>
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className={styles.pageButton}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminTable; 