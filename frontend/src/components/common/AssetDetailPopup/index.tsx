import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { AiOutlineEdit, AiOutlineDelete, AiOutlineClose, AiOutlineCalendar, AiOutlineUser, AiOutlineEnvironment, AiOutlineTag } from 'react-icons/ai';
import Swal from 'sweetalert2';
import styles from './AssetDetailPopup.module.css';
import DropdownSelect from '../DropdownSelect';
import { useAuth } from '../../../contexts/AuthContext';
import { useDropdown } from '../../../contexts/DropdownContext';
import { formatDate } from '../../../lib/utils';

interface Asset {
  id: string;
  asset_code: string;
  name: string;
  description: string;
  location: string;
  department: string;
  owner: string;
  status: string;
  image_url: string | null;
  acquired_date: string;
  created_at?: string;
  updated_at?: string;
}

interface AssetDetailPopupProps {
  asset: Asset | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (updatedAsset: Asset) => void;
  onDelete?: (assetId: string) => void;
  isAdmin?: boolean;
  isCreating?: boolean;
}

const AssetDetailPopup: React.FC<AssetDetailPopupProps> = ({ asset, isOpen, onClose, onUpdate, onDelete, isAdmin = false, isCreating = false }) => {
  const initialAsset = asset ? { ...asset } : null;
  const [editedAsset, setEditedAsset] = useState<Asset | null>(initialAsset);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const { user } = useAuth();
  const { departments, locations, loading: dropdownLoading } = useDropdown();

  // Check if user can edit (admin or user with department)
  const canEdit = isAdmin || (user && user.department_id !== null);

  // Check if user can only view (user without department)
  const canOnlyView = !isAdmin && user && user.department_id === null;

  useEffect(() => {
    if (asset) {
      const initialAsset = { ...asset };
      if (isCreating) {
        if (user) {
          initialAsset.owner = user.name;
        }
        // When creating, default acquired_date to the user's current local time
        if (!initialAsset.acquired_date || initialAsset.acquired_date.length < 16) {
          const now = new Date();
          const year = now.getFullYear();
          const month = (now.getMonth() + 1).toString().padStart(2, '0');
          const day = now.getDate().toString().padStart(2, '0');
          const hours = now.getHours().toString().padStart(2, '0');
          const minutes = now.getMinutes().toString().padStart(2, '0');
          initialAsset.acquired_date = `${year}-${month}-${day}T${hours}:${minutes}`;
        }
      }

      setEditedAsset(initialAsset);
      setImagePreview(null);
      setImageFile(null);
      
      if (isCreating) {
        setIsEditing(true);
      } else {
        setIsEditing(false);
      }
    }
  }, [asset, isCreating, user]);

  if (!isOpen || !asset || !editedAsset) return null;

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'active': return 'Active';
      case 'transferring': return 'Transferring';
      case 'audited': return 'Audited';
      case 'missing': return 'Missing';
      case 'broken': return 'Broken';
      case 'disposed': return 'Disposed';
      default: return status;
    }
  };

  const statusOptions = [
    { id: 'active', name: 'Active' },
    { id: 'transferring', name: 'Transferring' },
    { id: 'audited', name: 'Audited' },
    { id: 'missing', name: 'Missing' },
    { id: 'broken', name: 'Broken' },
    { id: 'disposed', name: 'Disposed' },
  ];

  const handleInputChange = (field: keyof Asset, value: string) => {
    // For acquired_date, we directly use the value from the datetime-local input,
    // which is already in the desired local time format (e.g., "2025-06-21T02:00").
    // This value can be sent directly to the backend.
    setEditedAsset(prev => prev ? { ...prev, [field]: value } : null);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        Swal.fire({
          title: 'Invalid File Type',
          text: 'Please select an image file (JPEG, PNG, GIF, or WebP).',
          icon: 'error'
        });
        return;
      }
      
      // Check file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        Swal.fire({
          title: 'File Too Large',
          text: 'Please select an image smaller than 5MB.',
          icon: 'error'
        });
        return;
      }
      
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!editedAsset) return;
    
    // Validation
    if (!editedAsset.name?.trim()) {
      Swal.fire({
        title: 'Validation Error',
        text: 'Asset name is required.',
        icon: 'error'
      });
      return;
    }
    
    if (!editedAsset.asset_code?.trim()) {
      Swal.fire({
        title: 'Validation Error',
        text: 'Asset code is required.',
        icon: 'error'
      });
      return;
    }
    
    setLoading(true);
    try {
      let imageUrl = editedAsset.image_url;

      if (imageFile) {
        const formData = new FormData();
        formData.append('image', imageFile);
        
        const uploadResponse = await fetch('/api/assets/upload-image', {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });
        
        if (uploadResponse.ok) {
          const uploadResult = await uploadResponse.json();
          imageUrl = uploadResult.imageUrl;
        } else {
          const errorData = await uploadResponse.json();
          console.error('Image upload failed:', errorData);
          Swal.fire({
            title: 'Image Upload Failed',
            text: errorData.message || 'Failed to upload image. Please try again.',
            icon: 'warning'
          });
          // Continue without image if upload fails
        }
      }

      const finalAssetData = { ...editedAsset, image_url: imageUrl };

      const url = isCreating ? '/api/assets' : `/api/assets/${editedAsset.id}`;
      const method = isCreating ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(finalAssetData),
        credentials: 'include'
      });

      if (response.ok) {
        const resultAsset = await response.json();
        onUpdate?.(resultAsset);
        Swal.fire({
          title: isCreating ? 'Created!' : 'Saved!',
          text: `Asset has been ${isCreating ? 'created' : 'updated'} successfully.`,
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        }).then(() => {
          // Close the popup after the success message
          onClose();
        });
      } else {
        const errorData = await response.json();
        let errorMessage = errorData.error || 'Failed to save asset';
        
        if (response.status === 401) {
          errorMessage = 'Authentication required. Please login again.';
        } else if (response.status === 403) {
          errorMessage = 'Access denied. You do not have permission to modify assets.';
        } else if (response.status === 409) {
          errorMessage = 'Asset code already exists. Please use a different code.';
        }
        
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error saving asset:', error);
      Swal.fire({
        title: 'Error!',
        text: error instanceof Error ? error.message : 'An unknown error occurred.',
        icon: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsEditing(false); // Always reset editing state
    onClose();
  };

  const handleCancel = () => {
    if (isCreating) {
      onClose();
    } else {
      // Revert changes to the original asset data when canceling
      if (asset) {
        setEditedAsset({ ...asset });
      }
      setImageFile(null);
      setImagePreview(null);
      setIsEditing(false);
    }
  };

  const handleDelete = () => {
    if (!onDelete || !editedAsset?.id) return;
    
    Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!"
    }).then((result) => {
      if (result.isConfirmed) {
        onDelete(editedAsset.id);
        // The success message will be handled by the parent component
        // to ensure the item is actually deleted before notifying the user.
      }
    });
  };

  const headerText = isCreating ? "Add New Asset" : "Asset Detail";

  const renderField = (label: string, field: keyof Asset, type: string = 'text', icon?: React.ReactNode) => {
    const value = editedAsset[field] as string;
    
    // Fields that should be read-only for non-admin users
    const readOnlyFields = ['owner', 'created_at', 'updated_at'];
    const isReadOnlyForUser = !isAdmin && readOnlyFields.includes(field);
    
    if (isEditing && !isReadOnlyForUser) {
      if (type === 'textarea') {
        return (
          <div className={styles.infoItem}>
            <label>{icon} {label}:</label>
            <textarea
              value={value || ''}
              onChange={(e) => handleInputChange(field, e.target.value)}
              className={styles.editInput}
              rows={3}
            />
          </div>
        );
      } else if (type === 'select' && field === 'status') {
        return (
          <div className={styles.infoItem}>
            <label>{icon} {label}:</label>
            <select
              value={value}
              onChange={(e) => handleInputChange(field, e.target.value)}
              className={styles.editSelect}
            >
              {statusOptions.map(option => (
                <option key={option.id} value={option.id}>{option.name}</option>
              ))}
            </select>
          </div>
        );
      } else if (field === 'owner') {
        return (
          <div className={styles.infoItem}>
            <label>{icon} {label}:</label>
            <span className={styles.readOnlyField}>{value || 'N/A'}</span>
          </div>
        );
      } else if (field === 'location') {
        return (
          <div className={styles.infoItem}>
            <label>{icon} {label}:</label>
            {dropdownLoading ? (
              <div className={styles.loadingText}>กำลังโหลดข้อมูล...</div>
            ) : (
              <DropdownSelect
                label=""
                options={locations.map(loc => ({ id: loc.id, name: loc.name }))}
                value={editedAsset.location}
                onChange={(value) => handleInputChange('location', value)}
                placeholder="Select a location"
                className={styles.editSelect}
                disabled={dropdownLoading}
              />
            )}
          </div>
        );
      } else if (field === 'department') {
        return (
          <div className={styles.infoItem}>
            <label>{icon} {label}:</label>
            {dropdownLoading ? (
              <div className={styles.loadingText}>กำลังโหลดข้อมูล...</div>
            ) : (
              <DropdownSelect
                label=""
                options={departments.map(dep => ({ id: dep.id, name: dep.name_th, name_th: dep.name_th }))}
                value={editedAsset.department}
                onChange={(value) => handleInputChange('department', value)}
                placeholder="Select a department"
                className={styles.editSelect}
                disabled={dropdownLoading}
              />
            )}
          </div>
        );
      } else if (type === 'datetime-local') {
        const formatForInput = (dateString: string) => {
          // The dateString from the DB is already in local time format (e.g., "2025-06-21 02:00:00").
          // We just need to format it for the datetime-local input requirement.
          if (!dateString) return '';
          try {
            // Replace space with 'T' and slice off seconds and milliseconds.
            return dateString.replace(' ', 'T').slice(0, 16);
          } catch (error) {
            console.error('Error formatting date for input:', error);
            return '';
          }
        };

        return (
          <div className={styles.infoItem}>
            <label>{icon} {label}:</label>
            <input
              type="datetime-local"
              value={formatForInput(value)}
              onChange={(e) => handleInputChange(field, e.target.value)}
              className={styles.editInput}
            />
          </div>
        );
      } else {
        return (
          <div className={styles.infoItem}>
            <label>{icon} {label}:</label>
            <input
              type={type}
              value={value || ''}
              onChange={(e) => handleInputChange(field, e.target.value)}
              className={styles.editInput}
            />
          </div>
        );
      }
    } else {
      // Display mode - use formatDate for acquired_date to show both date and time
      let displayValue;
      if (field === 'status') {
        displayValue = getStatusDisplay(value);
      } else if (field === 'acquired_date' || field === 'created_at' || field === 'updated_at') {
        displayValue = value ? formatDate(value) : 'N/A';
      } else {
        displayValue = value || 'N/A';
      }
      
      return (
        <div className={styles.infoItem}>
          <label>{icon} {label}:</label>
          <span className={styles.readOnlyField}>{displayValue}</span>
        </div>
      );
    }
  };

  return (
    <div className={styles.overlay} onClick={handleClose}>
      <div className={styles.popup} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>{headerText}</h2>
          <div className={styles.headerActions}>
            {!isEditing && canEdit && (
              <button className={styles.editButton} onClick={() => setIsEditing(true)} title="Edit">
                <AiOutlineEdit />
              </button>
            )}
            {canOnlyView && (
              <div className={styles.viewOnlyBadge} title="View Only - No Department Assigned">
                View Only
              </div>
            )}
            <button className={styles.closeButton} onClick={handleClose} title="Close">
              <AiOutlineClose />
            </button>
          </div>
        </div>

        <div className={styles.content}>
          <div className={styles.imageSection}>
            {isEditing ? (
              <div className={styles.imageUpload}>
                <Image
                  src={imagePreview || editedAsset.image_url || "/file.svg"}
                  alt={editedAsset.name}
                  width={200}
                  height={200}
                  className={styles.assetImage}
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className={styles.fileInput}
                  id="image-upload"
                />
                <label htmlFor="image-upload" className={styles.uploadButton}>
                  Change Image
                </label>
              </div>
            ) : (
              <Image
                src={editedAsset.image_url || "/file.svg"}
                alt={editedAsset.name}
                width={200}
                height={200}
                className={styles.assetImage}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/file.svg';
                }}
              />
            )}
          </div>

          <div className={styles.detailsSection}>
            <div className={styles.infoGrid}>
              {/* Row 1 */}
              {renderField('Asset Code', 'asset_code')}
              {renderField('Name', 'name')}

              {/* Row 2 */}
              {renderField('Location', 'location', 'text', <AiOutlineEnvironment />)}
              {renderField('Department', 'department', 'text', <AiOutlineTag />)}
              
              {/* Row 3 */}
              {renderField('Status', 'status', 'select')}
              {renderField('Acquired Date & Time', 'acquired_date', 'datetime-local', <AiOutlineCalendar />)}

              {/* Full Width Description */}
              <div className={styles.fullWidth}>
                {renderField('Description', 'description', 'textarea')}
              </div>

              {/* Full Width Owner (Read-Only) */}
              <div className={styles.fullWidth}>
                {renderField('Owner', 'owner', 'text', <AiOutlineUser />)}
              </div>

              {/* Read-only dates */}
              {editedAsset.created_at && (
                <div className={styles.infoItem}>
                  <label>Created:</label>
                  <span className={styles.readOnlyField}>{formatDate(editedAsset.created_at)}</span>
                </div>
              )}
              {editedAsset.updated_at && (
                <div className={styles.infoItem}>
                  <label>Last Updated:</label>
                  <span className={styles.readOnlyField}>{formatDate(editedAsset.updated_at)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          {isEditing ? (
            <div className={styles.editFooter}>
              <button
                className={styles.saveBtn}
                onClick={handleSave}
                disabled={loading}
              >
                {loading ? "Saving..." : "Save Changes"}
              </button>
              <button
                className={styles.cancelBtn}
                onClick={handleCancel}
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              {isAdmin && onDelete && !isCreating ? (
                <button
                  className={styles.deleteBtn}
                  onClick={handleDelete}
                  disabled={loading}
                >
                  <AiOutlineDelete /> Delete
                </button>
              ) : (
                null
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssetDetailPopup; 