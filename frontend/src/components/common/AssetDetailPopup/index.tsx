import React, { useState, useEffect, useRef, CSSProperties } from 'react';
import Image from 'next/image';
import { AiOutlineEdit, AiOutlineDelete, AiOutlineClose, AiOutlineCalendar, AiOutlineUser, AiOutlineEnvironment, AiOutlineTag, AiOutlineDownload, AiOutlineHistory } from 'react-icons/ai';
import Swal from 'sweetalert2';
import styles from './AssetDetailPopup.module.css';
import DropdownSelect from '../DropdownSelect';
import { useAuth } from '../../../contexts/AuthContext';
import { useDropdown } from '../../../contexts/DropdownContext';
import { formatDate } from '../../../lib/utils';
import { generateBarcode, sanitizeBarcodeText, isValidBarcodeText } from '../../../lib/barcodeUtils';
import { QRCodeCanvas } from 'qrcode.react';
import jsQR from 'jsqr';

interface Asset {
  id: string;
  asset_code: string;
  inventory_number?: string;
  serial_number?: string;
  name: string;
  description: string;
  location_id?: string;
  location?: string;
  room?: string;
  department: string;
  department_id?: string;
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
  showAuditHistory?: boolean; // เพิ่ม prop นี้
}

interface AuditLog {
  id: number;
  status: string;
  note: string;
  user_name: string;
  checked_at: string;
}

const AssetDetailPopup: React.FC<AssetDetailPopupProps> = ({ asset, isOpen, onClose, onUpdate, onDelete, isAdmin = false, isCreating = false, showAuditHistory = false }) => {
  const initialAsset = asset ? { ...asset } : null;
  const [editedAsset, setEditedAsset] = useState<Asset | null>(initialAsset);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const { user } = useAuth();
  const { departments, locations, loading: dropdownLoading } = useDropdown();
  const barcodeRef = useRef<SVGSVGElement>(null);
  const [codeType, setCodeType] = useState<'barcode' | 'qrcode'>('barcode');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Camera modal state
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

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

  useEffect(() => {
    if (codeType === 'barcode' && barcodeRef.current && editedAsset?.inventory_number) {
      generateBarcode(barcodeRef.current, editedAsset.inventory_number);
    } else if (codeType === 'barcode' && barcodeRef.current) {
      barcodeRef.current.innerHTML = '';
    }
  }, [codeType, editedAsset?.inventory_number]);

  useEffect(() => {
    if (showAuditHistory && isOpen && asset?.id) {
      setLoadingAudit(true);
      fetch(`/api/asset-audits/${asset.id}`)
        .then(res => res.json())
        .then(data => setAuditLogs(data))
        .catch(() => setAuditLogs([]))
        .finally(() => setLoadingAudit(false));
    }
  }, [showAuditHistory, isOpen, asset?.id]);

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
    
    // For asset_code, only allow ASCII characters to prevent barcode generation issues
    if (field === 'asset_code') {
      const cleanValue = sanitizeBarcodeText(value);
      
      // Limit length to 50 characters
      const limitedValue = cleanValue.slice(0, 50);
      
      if (cleanValue !== value) {
        // Show warning if non-ASCII characters were removed
        Swal.fire({
          title: 'Invalid Characters',
          text: 'Asset code can only contain English letters, numbers, and basic symbols.',
          icon: 'warning',
          timer: 2000,
          showConfirmButton: false
        });
      }
      
      if (limitedValue !== cleanValue) {
        // Show warning if length was truncated
        Swal.fire({
          title: 'Asset Code Truncated',
          text: 'Asset code has been limited to 50 characters for barcode compatibility.',
          icon: 'warning',
          timer: 2000,
          showConfirmButton: false
        });
      }
      
      setEditedAsset(prev => prev ? { ...prev, [field]: limitedValue } : null);
    } else if (field === 'inventory_number') {
      // Limit inventory_number to 20 characters
      const limitedValue = value.slice(0, 20);
      setEditedAsset(prev => prev ? { ...prev, [field]: limitedValue } : null);
    } else {
      setEditedAsset(prev => prev ? { ...prev, [field]: value } : null);
    }
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

  const handlePrintBarcode = () => {
    if (!editedAsset.inventory_number) {
      Swal.fire({
        title: 'No Inventory Number',
        text: 'Please enter an inventory number to generate a barcode for printing.',
        icon: 'warning'
      });
      return;
    }
    
    const printWindow = window.open('', '', 'width=400,height=300');
    if (!printWindow || !barcodeRef.current) return;
    
    printWindow.document.write('<html><body>' + barcodeRef.current.outerHTML + '</body></html>');
    printWindow.document.close();
    printWindow.print();
  };

  const handleBarcodeImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. decode QR code ฝั่ง frontend ก่อน
    const fileUrl = URL.createObjectURL(file);
    const img = new window.Image();
    img.src = fileUrl;
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const qr = jsQR(imageData.data, imageData.width, imageData.height);
        if (qr && qr.data) {
          setEditedAsset(prev => prev ? { ...prev, inventory_number: qr.data } : null);
          URL.revokeObjectURL(fileUrl);
          return;
        }
      }
      // 2. ถ้าไม่เจอ QR code ให้ส่งไป backend decode barcode เหมือนเดิม
      const formData = new FormData();
      formData.append('barcodeImage', file);
      const res = await fetch('/api/barcode/decode', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.code) {
        setEditedAsset(prev => prev ? { ...prev, inventory_number: data.code } : null);
      } else {
        alert('Barcode or QR code not detected');
      }
      URL.revokeObjectURL(fileUrl);
    };
    img.onerror = () => {
      alert('Cannot read image file');
      URL.revokeObjectURL(fileUrl);
    };
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

    // Validate inventory_number format (ASCII characters and common symbols, large set) for barcode
    if (editedAsset.inventory_number && !isValidBarcodeText(editedAsset.inventory_number)) {
      Swal.fire({
        title: 'Invalid Inventory Number',
        text: `Inventory number contains invalid characters. Please use only English letters, numbers, and common symbols (A-Z, 0-9, -, _, /, ., space, ", *, :, ;, ', (), [], {}, @, #, $, %, &, +, =, !, ?, |, ^, ~, <, >, \\).`,
        icon: 'error'
      });
      return;
    }

    // Validate inventory_number length (max 50 characters for barcode compatibility)
    if (editedAsset.inventory_number && editedAsset.inventory_number.length > 50) {
      Swal.fire({
        title: 'Inventory Number Too Long',
        text: 'Inventory number must be 50 characters or less for barcode generation.',
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
        onClose(); // ปิด popup ทันที
        Swal.fire({
          title: isCreating ? 'Created!' : 'Saved!',
          text: `Asset has been ${isCreating ? 'created' : 'updated'} successfully.`,
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
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

  // Fields required for validation (must be filled)
  const requiredFields: (keyof Asset)[] = ['name', 'inventory_number', 'location_id', 'department_id', 'status'];
  // Fields that should show a red asterisk in the label
  const requiredLabelFields: (keyof Asset)[] = ['name', 'inventory_number', 'location_id', 'department', 'status'];

  // Helper to check if all required fields are filled
  const isRequiredFilled = (asset: Asset | null) => {
    if (!asset) return false;
    return requiredFields.every(f => {
      if (f === 'location_id') return !!asset.location_id && asset.location_id !== '';
      if (f === 'department_id') return !!asset.department_id && asset.department_id !== '';
      if (f === 'status') return !!asset.status && asset.status !== '';
      return !!(asset as any)[f] && (asset as any)[f].toString().trim() !== '';
    });
  };

  const renderField = (label: string, field: keyof Asset, type: string = 'text', icon?: React.ReactNode) => {
    const value = editedAsset[field] as string;
    
    // Fields that should be read-only for non-admin users
    const readOnlyFields = ['owner', 'created_at', 'updated_at'];
    const isReadOnlyForUser = !isAdmin && readOnlyFields.includes(field);
    
    // Helper to render label with asterisk if required
    const renderLabel = () => (
      <>
        {icon} {label} :{requiredLabelFields.includes(field) ? <b className={styles.redAsterisk}>*</b> : ''}
      </>
    );
    
    if (isEditing && !isReadOnlyForUser) {
      if (type === 'textarea') {
        return (
          <div className={styles.infoItem}>
            <label>{renderLabel()}</label>
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
            <label>{renderLabel()}</label>
            <DropdownSelect
              label=""
              options={statusOptions.map(option => ({ id: option.id, name: option.name }))}
              value={value}
              onChange={(value) => handleInputChange(field, value)}
              placeholder="Select status"
              className={styles.editSelect}
            />
          </div>
        );
      } else if (field === 'owner') {
        return (
          <div className={styles.infoItem}>
            <label>{renderLabel()}</label>
            <span className={styles.readOnlyField}>{value || 'N/A'}</span>
          </div>
        );
      } else if (field === 'location_id') {
        return (
          <div className={styles.infoItem}>
            <label>{renderLabel()}</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {dropdownLoading ? (
                <div className={styles.loadingText}>กำลังโหลดข้อมูล...</div>
              ) : (
                <>
                  <DropdownSelect
                    label=""
                    options={locations.map(loc => ({ id: loc.id, name: loc.name }))}
                    value={editedAsset.location_id ?? ''}
                    onChange={(value) => handleInputChange('location_id', value)}
                    placeholder="Select location"
                    className={styles.editSelect}
                    disabled={dropdownLoading}
                    style={{ flex: 1 }}
                  />
                  <input
                    type="text"
                    value={editedAsset.room || ''}
                    onChange={(e) => handleInputChange('room', e.target.value)}
                    className={styles.editInput}
                    placeholder="Room"
                    style={{ flex: 1 }}
                  />
                </>
              )}
            </div>
          </div>
        );
      } else if (field === 'department') {
        return (
          <div className={styles.infoItem}>
            <label>{renderLabel()}</label>
            {dropdownLoading ? (
              <div className={styles.loadingText}>กำลังโหลดข้อมูล...</div>
            ) : (
              <DropdownSelect
                label=""
                options={departments.map(dep => ({ id: dep.id, name: dep.name_th, name_th: dep.name_th }))}
                value={editedAsset.department_id ?? ''}
                onChange={(value) => handleInputChange('department_id', value)}
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
            <label>{renderLabel()}</label>
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
            <label>{renderLabel()}</label>
            <input
              type={type}
              value={value || ''}
              onChange={(e) => handleInputChange(field, e.target.value)}
              className={styles.editInput}
              placeholder={field === 'asset_code' ? '' : ''}
              maxLength={field === 'inventory_number' ? 20 : undefined}
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
      } else if (field === 'location_id') {
        // Show location name and room together in display mode
        const locationName = editedAsset.location || 'N/A';
        const locationDisplay = editedAsset.room ? 
          `${locationName} ${editedAsset.room}` : 
          locationName;
        displayValue = locationDisplay;
      } else {
        displayValue = value || 'N/A';
      }
      
      return (
        <div className={styles.infoItem}>
          <label>{icon} {label} :</label>
          <span className={styles.readOnlyField}>{displayValue}</span>
        </div>
      );
    }
  };

  // Open camera modal and start webcam
  const handleOpenCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraStream(stream);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch (err) {
      Swal.fire({ title: 'Camera Error', text: 'Cannot access camera', icon: 'error' });
      setShowCamera(false);
    }
  };

  // Close camera modal and stop webcam
  const handleCloseCamera = () => {
    setShowCamera(false);
    setCapturedPhoto(null);
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  // Capture photo from video
  const handleCapturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setCapturedPhoto(dataUrl);
      }
    }
  };

  // Use captured photo as asset image
  const handleUsePhoto = () => {
    if (capturedPhoto) {
      fetch(capturedPhoto)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], 'asset-photo.jpg', { type: 'image/jpeg' });
          setImageFile(file);
          setImagePreview(capturedPhoto);
          handleCloseCamera();
        });
    }
  };

  // Responsive style for camera modal
  const getCameraModalStyle = (): React.CSSProperties => {
    if (typeof window !== 'undefined' && window.innerWidth <= 600) {
      return {
        width: '90vw',
        height: '80vh',
        maxWidth: '98vw',
        maxHeight: '98vh',
        background: '#111',
        borderRadius: 18,
        boxShadow: '0 8px 32px #0008',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column' as any,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      };
    }
    return {
      width: '50vw',
      height: '75vh',
      maxWidth: 500,
      maxHeight: '80vh',
      background: '#111',
      borderRadius: 18,
      boxShadow: '0 8px 32px #0008',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column' as any,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    };
  };

  // Camera modal UI helpers
  const CameraModal = () => (
    <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: 'rgba(20,20,20,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={getCameraModalStyle()}>
        {/* Close button */}
        <button onClick={handleCloseCamera} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: 40, height: 40, color: '#fff', fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }} aria-label="ปิดกล้อง">×</button>
        {/* Camera or Preview */}
        {!capturedPhoto ? (
          <>
            <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#222', borderRadius: 18 }} autoPlay muted playsInline />
            {/* Capture button */}
            <button onClick={handleCapturePhoto} style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', width: 64, height: 64, borderRadius: '50%', background: '#fff', border: '6px solid #eee', boxShadow: '0 2px 12px #0008', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }} aria-label="ถ่ายภาพ"></button>
          </>
        ) : (
          <>
            <img src={capturedPhoto} alt="Captured" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 18 }} />
            {/* Retake & Use Photo buttons */}
            <div style={{ position: 'absolute', bottom: 16, left: 0, width: '100%', display: 'flex', justifyContent: 'space-between', padding: '0 18px', zIndex: 10 }}>
              <button onClick={() => setCapturedPhoto(null)} style={{ background: '#fff', color: '#2196f3', border: 'none', borderRadius: 20, padding: '10px 22px', fontSize: 16, fontWeight: 600, boxShadow: '0 2px 8px #0003' }}>ถ่ายใหม่</button>
              <button onClick={handleUsePhoto} style={{ background: '#2196f3', color: '#fff', border: 'none', borderRadius: 20, padding: '10px 22px', fontSize: 16, fontWeight: 600, boxShadow: '0 2px 8px #0003' }} disabled={!capturedPhoto}>ใช้รูปภาพ</button>
            </div>
          </>
        )}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>
    </div>
  );

  return (
    <div className={styles.overlay} onClick={showCamera ? undefined : handleClose}>
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
          <div className={styles.imageSection} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <label htmlFor="image-upload" className={styles.uploadButton}>
                  Change Image
                </label>
                 <button type="button" className={styles.cameraButton} onClick={handleOpenCamera}>
                   <img src="/add-photo.png" alt="Take Photo" width={24} height={24} style={{ display: 'block' }} />
                 </button>
                </div>
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
            {/* Barcode SVG + 3 icon buttons */}
            <div className={styles.barcodeContainer}>
              {/* Toggle switch อยู่ติดกับ barcode/QR code */}
              <div className={styles.toggleSwitch} style={{ marginBottom: 4 }}>
                <button
                  className={codeType === 'barcode' ? styles.active : ''}
                  onClick={() => setCodeType('barcode')}
                  type="button"
                >
                  Barcode
                </button>
                <button
                  className={codeType === 'qrcode' ? styles.active : ''}
                  onClick={() => setCodeType('qrcode')}
                  type="button"
                >
                  QR Code
                </button>
              </div>
              {/* barcode/qr code display */}
              {codeType === 'barcode' ? (
                <>
                  <svg ref={barcodeRef} width={140} height={36}></svg>
                  <div className={styles.barcodeActions}>
                    <button 
                      onClick={handlePrintBarcode} 
                      title="Print Barcode" 
                      className={styles.printButton}
                      disabled={!editedAsset.inventory_number}
                    >
                      <img src="/print.png" alt="Print" width={24} height={24} className={styles.barcodeIcon} />
                    </button>
                    <a
                      href={editedAsset.inventory_number ? `/api/barcode/${editedAsset.inventory_number}` : '#'}
                      download={editedAsset.inventory_number ? `barcode-${editedAsset.inventory_number}.png` : undefined}
                      title="Download Barcode"
                      className={styles.downloadButton}
                      style={{ pointerEvents: editedAsset.inventory_number ? 'auto' : 'none', opacity: editedAsset.inventory_number ? 1 : 0.5 }}
                    >
                      <img src="/dowload.png" alt="Download" width={24} height={24} className={styles.barcodeIcon} />
                    </a>
                    {/* ปุ่ม upload แสดงทั้งสองโหมด */}
                    {isEditing && (
                      <label 
                        className={styles.barcodeUploadButton} 
                        title="Upload Barcode/QR Image to set Inventory Number"
                      >
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBarcodeImageUpload} />
                        <img src="/upload.png" alt="Upload" width={24} height={24} className={styles.barcodeIcon} />
                      </label>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {editedAsset.inventory_number ? (
                      <QRCodeCanvas value={editedAsset.inventory_number} size={100} level="M" includeMargin={true} />
                    ) : (
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px', textAlign: 'center' }}>
                        No Inventory Number
                      </div>
                    )}
                  </div>
                  <div className={styles.barcodeActions}>
                    {/* Download QR code as PNG */}
                    <button
                      onClick={() => {
                        const canvas = document.querySelector('canvas');
                        if (canvas) {
                          const url = canvas.toDataURL('image/png');
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `qrcode-${editedAsset.inventory_number}.png`;
                          a.click();
                        }
                      }}
                      title="Download QR Code"
                      className={styles.downloadButton}
                      disabled={!editedAsset.inventory_number}
                    >
                      <img src="/dowload.png" alt="Download" width={24} height={24} className={styles.barcodeIcon} />
                    </button>
                    {/* Print QR code */}
                    <button
                      onClick={() => {
                        const canvas = document.querySelector('canvas');
                        if (canvas) {
                          const dataUrl = canvas.toDataURL('image/png');
                          const printWindow = window.open('', '', 'width=400,height=400');
                          if (printWindow) {
                            printWindow.document.write(`<img src='${dataUrl}' style='width:200px;height:200px;' />`);
                            printWindow.document.close();
                            printWindow.print();
                          }
                        }
                      }}
                      title="Print QR Code"
                      className={styles.printButton}
                      disabled={!editedAsset.inventory_number}
                    >
                      <img src="/print.png" alt="Print" width={24} height={24} className={styles.barcodeIcon} />
                    </button>
                    {/* ปุ่ม upload แสดงทั้งสองโหมด */}
                    {isEditing && (
                      <label 
                        className={styles.barcodeUploadButton} 
                        title="Upload Barcode/QR Image to set Inventory Number"
                      >
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBarcodeImageUpload} />
                        <img src="/upload.png" alt="Upload" width={24} height={24} className={styles.barcodeIcon} />
                      </label>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className={styles.detailsSection}>
            <div className={styles.infoGrid}>
              {/* Row 1 */}
              {renderField('Asset Code', 'asset_code')}
              {renderField('Name', 'name')}

              {/* Row 2 */}
              {renderField('Inventory Number', 'inventory_number', 'text')}
              {renderField('Department', 'department', 'text', <AiOutlineTag />)}
              
              {/* Row 3 */}
              {renderField('Location', 'location_id', 'text', <AiOutlineEnvironment />)}
              {renderField('Serial Number', 'serial_number', 'text')}
              
              {/* Row 4 */}
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

        {/* ประวัติการตรวจนับ (Audit Log) */}
        {showAuditHistory && (
        <div style={{ margin: '2rem 0 1rem 0' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, marginBottom: 8 }}>
            <AiOutlineHistory /> ประวัติการตรวจนับ
          </h3>
          {loadingAudit ? (
            <div style={{ color: '#888', fontSize: 15 }}>กำลังโหลดประวัติ...</div>
          ) : auditLogs.length === 0 ? (
            <div style={{ color: '#888', fontSize: 15 }}>ไม่พบประวัติการตรวจนับ</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15, background: '#f9fafb', borderRadius: 8 }}>
              <thead>
                <tr style={{ background: '#f3f4f6' }}>
                  <th style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb' }}>วันที่</th>
                  <th style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb' }}>สถานะ</th>
                  <th style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb' }}>หมายเหตุ</th>
                  <th style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb' }}>ผู้ตรวจ</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map(log => (
                  <tr key={log.id}>
                    <td style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb' }}>{formatDate(log.checked_at)}</td>
                    <td style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb' }}>{log.status}</td>
                    <td style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb' }}>{log.note}</td>
                    <td style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb' }}>{log.user_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        )}

        <div className={styles.footer}>
          {isEditing ? (
            <div className={styles.editFooter}>
              <button
                className={styles.saveBtn}
                onClick={handleSave}
                disabled={loading || !isRequiredFilled(editedAsset)}
                style={{
                  background: (!isRequiredFilled(editedAsset) || loading) ? '#d1d5db' : '#10b981',
                  cursor: (!isRequiredFilled(editedAsset) || loading) ? 'not-allowed' : 'pointer',
                }}
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
      {/* Camera Modal (mobile-style) */}
      {showCamera && <CameraModal />}
    </div>
  );
};

export default AssetDetailPopup; 