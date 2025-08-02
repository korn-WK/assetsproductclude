import React, { useState, useEffect, useRef, CSSProperties } from 'react';
import Image from 'next/image';
import { AiOutlineEdit, AiOutlineDelete, AiOutlineClose, AiOutlineCalendar, AiOutlineUser, AiOutlineEnvironment, AiOutlineTag, AiOutlineDownload, AiOutlineHistory, AiOutlineInfoCircle } from 'react-icons/ai';
import Swal from 'sweetalert2';
import styles from './AssetDetailPopup.module.css';
import DropdownSelect from '../DropdownSelect';
import { useAuth } from '../../../contexts/AuthContext';
import { useDropdown } from '../../../contexts/DropdownContext';
import { useAssets } from '../../../contexts/AssetContext';
import { formatDate } from '../../../lib/utils';
import { generateBarcode, sanitizeBarcodeText, isValidBarcodeText } from '../../../lib/barcodeUtils';
import { QRCodeCanvas } from 'qrcode.react';
import jsQR from 'jsqr';
import axios from 'axios';
import { useStatusOptions } from '../../../lib/statusOptions';
import bannerStyles from '../../user/AssetsTable/AssetsTable.module.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import th from 'date-fns/locale/th/index.js';
// เพิ่ม import dayjs และ timezone plugin
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
dayjs.extend(utc);
dayjs.extend(timezone);

import { Asset } from '../../../common/types/asset';
import statusBadgeStyles from '../statusBadge.module.css';

interface AssetDetailPopupProps {
  asset: Asset | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (updatedAsset: Asset) => void;
  onDelete?: (assetId: string) => void;
  isAdmin?: boolean;
  isCreating?: boolean;
  showAuditHistory?: boolean; // เพิ่ม prop นี้
  showUserEdit?: boolean;
}

interface AuditLog {
  id: number;
  status: string;
  note: string;
  user_name: string;
  checked_at: string;
}

function useUserEditWindow() {
  const [canEditWindow, setCanEditWindow] = useState(true); // default: ให้แก้ไขได้
  const [checked, setChecked] = useState(false);
  const [isInAuditPeriod, setIsInAuditPeriod] = useState(false);

  useEffect(() => {
    fetch('/api/settings/user-edit-window')
      .then(res => res.json())
      .then(data => {
        if (data.start_date && data.end_date) {
          const now = new Date();
          const start = new Date(data.start_date);
          const end = new Date(data.end_date);
          const inAuditPeriod = now >= start && now <= end;
          
          setCanEditWindow(true); // ให้แก้ไขได้เสมอ (จะควบคุมการแสดงปุ่มใน canShowEditButton)
          setIsInAuditPeriod(inAuditPeriod);
          
          // ถ้าไม่อยู่ในช่วงตรวจนับแล้ว ให้ล้างข้อมูล localStorage
          if (!inAuditPeriod) {
            localStorage.removeItem('editedAssetsInAuditPeriod');
          }
        } else {
          setCanEditWindow(true); // ถ้าไม่มีข้อมูล ให้แก้ไขได้
          setIsInAuditPeriod(false);
          localStorage.removeItem('editedAssetsInAuditPeriod');
        }
        setChecked(true);
      })
      .catch(error => {
        console.error('❌ Error fetching user edit window:', error);
        setCanEditWindow(true);
        setIsInAuditPeriod(false);
        setChecked(true);
      });
  }, []);

  return { canEditWindow, checked, isInAuditPeriod };
}

const AssetDetailPopup: React.FC<AssetDetailPopupProps> = ({ asset, isOpen, onClose, onUpdate, onDelete, isAdmin = false, isCreating = false, showAuditHistory = false, showUserEdit = true }) => {
  const { pauseAutoRefresh, resumeAutoRefresh } = useAssets();
  const initialAsset = asset ? { ...asset } : null;

  // Pause auto-refresh immediately when component mounts or asset changes
  useEffect(() => {
    if (asset) {
      pauseAutoRefresh();
    }
  }, [asset, pauseAutoRefresh]);

  // Also pause when popup opens
  useEffect(() => {
    if (isOpen) {
      pauseAutoRefresh();
    }
  }, [isOpen, pauseAutoRefresh]);
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
  const { options: statusOptions } = useStatusOptions();
  const { canEditWindow, checked, isInAuditPeriod } = useUserEditWindow();
  const [showEditWindowNotice, setShowEditWindowNotice] = useState(false);
  const [hideAuditNotice, setHideAuditNotice] = useState(false);

  // Pause auto-refresh when popup is open to prevent refresh loops
  useEffect(() => {
    if (isOpen) {
      // Pause immediately when popup opens
      pauseAutoRefresh();
    } else {
      // Resume when popup closes
      resumeAutoRefresh();
    }
  }, [isOpen, pauseAutoRefresh, resumeAutoRefresh]);
  
  // เพิ่ม state สำหรับเก็บข้อมูลว่า asset นี้เคย edit ในช่วงตรวจนับแล้วหรือยัง
  const [hasEditedInAuditPeriod, setHasEditedInAuditPeriod] = useState(false);

  // ตรวจสอบว่า asset นี้เคย edit ในช่วงตรวจนับแล้วหรือยัง
  useEffect(() => {
    if (asset?.id && isInAuditPeriod) {
      const editedAssets = JSON.parse(localStorage.getItem('editedAssetsInAuditPeriod') || '[]');
      const hasEdited = editedAssets.includes(asset.id);
      setHasEditedInAuditPeriod(hasEdited);
    } else {
      setHasEditedInAuditPeriod(false);
    }
  }, [asset?.id, isInAuditPeriod]);

  // Camera modal state
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  // Add a state for acquiredDate as Date object for DatePicker
  const [acquiredDate, setAcquiredDate] = useState<Date | null>(null);
  const now = new Date();

  // แยก role ให้ชัดเจน
      const isSuperadmin = user?.originalRole?.toLowerCase() === 'superadmin';
    const isPureAdmin = user?.originalRole?.toLowerCase() === 'admin' && !isSuperadmin;
  const isRegularUser = !isSuperadmin && !isPureAdmin;
  const isAdminOrSuperadmin = isSuperadmin || isPureAdmin;

  // Auto-hide audit notice
  useEffect(() => {
    if (isInAuditPeriod && (isPureAdmin || isRegularUser) && !hideAuditNotice) {
      const timer = setTimeout(() => {
        setHideAuditNotice(true);
      }, 2000); // 

      return () => clearTimeout(timer);
    }
  }, [isInAuditPeriod, isPureAdmin, isRegularUser, hideAuditNotice]);

  // แจ้งเตือนถ้าอยู่นอกช่วงเวลา (และไม่ใช่ admin/superadmin)
  useEffect(() => {
    if (checked && !canEditWindow && !isAdminOrSuperadmin) {
      setShowEditWindowNotice(true);
      const timer = setTimeout(() => setShowEditWindowNotice(false), 6000);
      return () => clearTimeout(timer);
    }
  }, [canEditWindow, checked, isAdminOrSuperadmin]);

  // ปรับ logic canEdit - ตรวจสอบว่าสามารถ edit ได้หรือไม่
  const canEdit = isAdminOrSuperadmin || (user && user.department_id !== null && canEditWindow);

  // ตรวจสอบว่าสามารถแสดงปุ่ม edit ได้หรือไม่
  const canShowEditButton = () => {
    // superadmin edit ได้ตลอด
    if (isSuperadmin) return true;
    // admin (not superadmin)
    if (isPureAdmin) {
      if (!isInAuditPeriod) return true;
      if (isInAuditPeriod && !hasEditedInAuditPeriod) return true;
      return false;
    }
    // user
    if (!isInAuditPeriod) return canEdit;
    if (isInAuditPeriod && !hasEditedInAuditPeriod) return canEdit;
    return false;
  };



  // Check if user can only view (user without department)
  const canOnlyView = !isAdminOrSuperadmin && user && user.department_id === null;

  useEffect(() => {
    if (asset) {
      const initialAsset = { ...asset };
      if (isCreating) {
        if (user) {
          initialAsset.owner = user.name;
        }
        if (!initialAsset.acquired_date || initialAsset.acquired_date.length < 16) {
          // ใช้เวลาประเทศไทย
          const nowTH = dayjs().tz('Asia/Bangkok');
          const year = nowTH.year();
          const month = (nowTH.month() + 1).toString().padStart(2, '0');
          const day = nowTH.date().toString().padStart(2, '0');
          const hours = nowTH.hour().toString().padStart(2, '0');
          const minutes = nowTH.minute().toString().padStart(2, '0');
          initialAsset.acquired_date = `${year}-${month}-${day}T${hours}:${minutes}`;
        }
      }
      setEditedAsset(initialAsset);
      setImagePreview(null);
      setImageFile(null);
      // ฟิก acquiredDate เป็นเวลาประเทศไทย
      setAcquiredDate(dayjs().tz('Asia/Bangkok').toDate());
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
    return statusLabels[status] || status;
  };

  const statusLabels = Object.fromEntries(statusOptions.map(opt => [opt.value, opt.label]));
  const statusColors: Record<string, string> = {
    'พร้อมใช้งาน': '#28a745',
    'รอใช้งาน': '#b35f00',
    'รอตัดจำหน่าย': '#6f42c1',
    'ชำรุด': '#adb5bd',
    'รอซ่อม': '#dc3545',
    'ระหว่างการปรับปรุง': '#b02a37',
    'ไม่มีความจำเป็นต้องใช้': '#795548',
    'สูญหาย': '#218838',
    'รอแลกเปลี่ยน': '#6c757d',
    'แลกเปลี่ยน': '#17a2b8',
    'มีกรรมสิทธิ์ภายใต้สัญญาเช่า': '#fd7e14',
    'รอโอนย้าย': '#e0a800',
    'รอโอนกรรมสิทธิ์': '#007bff',
    'ชั่วคราว': '#6c757d',
    'ขาย': '#5bc0de',
    'แปรสภาพ': '#ffc107',
    'ทำลาย': '#6cb2eb',
    'สอบข้อเท็จจริง': '#20c997',
    'เงินชดเชยที่ดินและอาสิน': '#c82333',
    'ระหว่างทาง': '#bd2130',
  };

  const handleInputChange = (field: keyof Asset, value: string | Date) => {
    if (field === 'acquired_date') {
      let dateObj: Date | null = null;
      if (value instanceof Date) {
        dateObj = value;
        // ถ้าเลือกเฉพาะวัน (เวลาเป็น 00:00) ให้ set เวลาเป็นเวลาปัจจุบัน
        if (dateObj.getHours() === 0 && dateObj.getMinutes() === 0) {
          const current = new Date();
          dateObj.setHours(current.getHours(), current.getMinutes());
        }
      }
      setAcquiredDate(dateObj);
      setEditedAsset((prev: Asset | null) => prev ? { ...prev, acquired_date: dateObj ? dateObj.toISOString().slice(0, 16).replace('T', ' ') : '' } : null);
      return;
    }
    // For asset_code, only allow ASCII characters to prevent barcode generation issues
    if (field === 'asset_code') {
      const cleanValue = sanitizeBarcodeText(value as string);

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

      setEditedAsset((prev: Asset | null) => prev ? { ...prev, [field]: limitedValue } : null);
    } else if (field === 'inventory_number') {
      // Limit inventory_number to 20 characters (don't pad yet)
      const limitedValue = value.toString().slice(0, 20);
      setEditedAsset((prev: Asset | null) => prev ? { ...prev, [field]: limitedValue } : null);
    } else {
      setEditedAsset((prev: Asset | null) => prev ? { ...prev, [field]: value } : null);
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

    const handlePrintBarcodeLabels = () => {
    if (!editedAsset.inventory_number) {
      Swal.fire({
        title: 'No Inventory Number',
        text: 'Please enter an inventory number to generate barcode labels for printing.',
        icon: 'warning'
      });
      return;
    }

    // Show options dialog for number of labels
    Swal.fire({
      title: 'Print Barcode Labels',
      text: 'How many labels do you want to print? (1-30)',
      input: 'number',
      inputAttributes: {
        min: '1',
        max: '30',
        step: '1'
      },
      inputValue: '27',
      showCancelButton: true,
      confirmButtonText: 'Print',
      cancelButtonText: 'Cancel',
      inputValidator: (value) => {
        if (!value) {
          return 'Please enter number of labels';
        }
        const num = parseInt(value);
        if (isNaN(num) || num < 1 || num > 30) {
          return 'Please enter a number between 1 and 30';
        }
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        const numLabels = parseInt(result.value);
        if (numLabels >= 1 && numLabels <= 30) {
          printBarcodeLabels(numLabels);
        }
      }
    });
  };

  const handlePrintQRCodeLabels = () => {
    if (!editedAsset.inventory_number) {
      Swal.fire({
        title: 'No Inventory Number',
        text: 'Please enter an inventory number to generate QR code labels for printing.',
        icon: 'warning'
      });
      return;
    }

    // Show options dialog for number of labels
    Swal.fire({
      title: 'Print QR Code Labels',
      text: 'How many labels do you want to print? (1-30)',
      input: 'number',
      inputAttributes: {
        min: '1',
        max: '30',
        step: '1'
      },
      inputValue: '27',
      showCancelButton: true,
      confirmButtonText: 'Print',
      cancelButtonText: 'Cancel',
      inputValidator: (value) => {
        if (!value) {
          return 'Please enter number of labels';
        }
        const num = parseInt(value);
        if (isNaN(num) || num < 1 || num > 30) {
          return 'Please enter a number between 1 and 30';
        }
      }
    }).then(async (result) => {
      if (result.isConfirmed && result.value) {
        const numLabels = parseInt(result.value);
        if (numLabels >= 1 && numLabels <= 30) {
          await printQRCodeLabels(numLabels);
        }
      }
    });
  };

  const printBarcodeLabels = (numLabels: number) => {
    if (!editedAsset?.inventory_number) {
      console.error('No inventory number available');
      return;
    }

    const barcodeText = editedAsset.inventory_number;


    // Create a temporary SVG element to generate barcode
    const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    tempSvg.setAttribute('width', '200');
    tempSvg.setAttribute('height', '50');
    tempSvg.style.display = 'none';
    document.body.appendChild(tempSvg);
    
    // Generate barcode
    const success = generateBarcode(tempSvg, barcodeText);
    if (!success) {
      console.error('Failed to generate barcode');
      document.body.removeChild(tempSvg);
      return;
    }
    
    // Get the barcode SVG content
    const barcodeSvg = tempSvg.innerHTML;

    document.body.removeChild(tempSvg);

    // Create print window with grid layout
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;

    const assetName = editedAsset.name || 'Asset';
    const barcodeNumber = editedAsset.inventory_number;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Barcode Labels - ${assetName}</title>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.12.1/dist/JsBarcode.all.min.js"></script>
        <style>
          @media print {
            body { margin: 0; padding: 5px; }
            .label-grid { page-break-inside: avoid; }
            .label { page-break-inside: avoid; }
          }
          
          body {
            font-family: 'THSarabun', Arial, sans-serif;
            margin: 0;
            padding: 5px;
            background: white;
          }
          
          .label-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 5px;
            max-width: 210mm;
            margin: 0 auto;
            justify-items: center;
          }
          
          /* For labels that don't fill the last row completely */
          .label-grid:has(.label:nth-child(4n+1):last-child) {
            justify-items: start;
          }
          
          .label-grid:has(.label:nth-child(4n+2):last-child) {
            justify-items: start;
          }
          
          .label-grid:has(.label:nth-child(4n+3):last-child) {
            justify-items: start;
          }
          
          .label {
            border: 1px solid #000;
            padding: 5px;
            text-align: center;
            background: white;
            min-height: 40px;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            align-items: center;
            box-sizing: border-box;
          }
          
          .asset-name {
            font-size: 6px;
            font-weight: bold;
            color: #000;
            margin: 0;
            padding: 0;
            line-height: 1;
            max-width: 100%;
            word-wrap: break-word;
          }
          
          .barcode-container {
            margin-top: 2px;
            margin-bottom: 1px;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          
          .barcode-number {
            font-size: 7.5px;
            color: #000;
            margin: 0;
            padding: 0;
            font-family: monospace;
            line-height: 1;
          }
          
          svg {
            max-width: 100%;
            height: auto;
            display: block;
          }
          
          @media print {
            .label {
              border: 1px solid #000;
              page-break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>

        <div class="label-grid">
    `;

    // Generate labels based on selected number
    let labelsHtml = '';
    for (let i = 0; i < numLabels; i++) {
      labelsHtml += `
        <div class="label">
          <div class="asset-name">${assetName}</div>
          <div class="barcode-container">
            <svg width="180" height="40" xmlns="http://www.w3.org/2000/svg" id="barcode-${i}"></svg>
          </div>
          <div class="barcode-number">${barcodeNumber}</div>
        </div>
      `;
    }

    const fullContent = printContent + labelsHtml + `
        </div>
        <script>
          window.onload = function() {
        
            
            // Generate barcodes for all elements
            setTimeout(function() {

              
              const barcodeElements = document.querySelectorAll('[id^="barcode-"]');
              
              
              barcodeElements.forEach((element, index) => {
                
                try {
                  JsBarcode(element, '${barcodeNumber}', {
                    width: 1.5,
                    height: 40,
                    fontSize: 6,
                    marginTop: 5,
                    marginLeft: 15,
                    marginRight: 15,
                    displayValue: false,
                    background: '#fff',
                    lineColor: '#000',
                    format: 'CODE128'
                  });
                  
                } catch (error) {
                  console.error('Failed to generate barcode for element', index, ':', error);
                }
              });
              
              setTimeout(function() {

                window.print();
                setTimeout(function() {
                  window.close();
                }, 500);
              }, 1000);
            }, 500);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(fullContent);
    printWindow.document.close();
  };

  const printQRCodeLabels = async (numLabels: number) => {
    if (!editedAsset?.inventory_number) {
      console.error('No inventory number available');
      return;
    }

    const qrText = editedAsset.inventory_number;


    // Create print window with grid layout
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;

    const assetName = editedAsset.name || 'Asset';
    const qrNumber = editedAsset.inventory_number;

    // Create a temporary div to generate QR code using qrcode.react
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '-9999px';
    document.body.appendChild(tempDiv);
    
    

    // Import and use qrcode.react
    const { QRCodeSVG } = await import('qrcode.react');
    const React = await import('react');
    const ReactDOM = await import('react-dom/client');

    // Create root and render QR code
    const root = ReactDOM.createRoot(tempDiv);
    root.render(
      React.createElement(QRCodeSVG, {
        value: qrNumber,
        size: 80,
        level: 'M',
        includeMargin: false,
        bgColor: '#FFFFFF',
        fgColor: '#000000'
      })
    );

    // Wait a bit for rendering
    await new Promise(resolve => setTimeout(resolve, 100));

    // Get the SVG content
    
    const svgElement = tempDiv.querySelector('svg');
    let qrSvg = '';
    if (svgElement) {
      qrSvg = svgElement.outerHTML;
      
    } else {
      
      // Fallback to simple pattern if SVG not found
      const size = 80;
      const cellSize = 4;
      const cells = size / cellSize;
      
      qrSvg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">`;
      qrSvg += `<rect width="${size}" height="${size}" fill="white"/>`;
      
      // Draw border squares (like real QR code)
      qrSvg += `<rect x="0" y="0" width="20" height="20" fill="black"/>`;
      qrSvg += `<rect x="${size-20}" y="0" width="20" height="20" fill="black"/>`;
      qrSvg += `<rect x="0" y="${size-20}" width="20" height="20" fill="black"/>`;
      
      // Draw inner pattern based on text
      for (let i = 5; i < cells - 5; i++) {
        for (let j = 5; j < cells - 5; j++) {
          const charCode = qrNumber.charCodeAt((i * cells + j) % qrNumber.length);
          if (charCode % 3 === 0) {
            qrSvg += `<rect x="${i * cellSize}" y="${j * cellSize}" width="${cellSize}" height="${cellSize}" fill="black"/>`;
          }
        }
      }
      
      qrSvg += `</svg>`;
    }
    
    // Clean up
    document.body.removeChild(tempDiv);

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR Code Labels - ${assetName}</title>
        <style>
          @media print {
            body { margin: 0; padding: 5px; }
            .label-grid { page-break-inside: avoid; }
            .label { page-break-inside: avoid; }
          }
          
          body {
            font-family: 'THSarabun', Arial, sans-serif;
            margin: 0;
            padding: 5px;
            background: white;
          }
          
          .label-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            grid-template-rows: auto;
            gap: 5px;
            max-width: 210mm;
            margin: 0 auto;
            justify-items: center;
            align-items: start;
            width: 100%;
          }
          
          /* For labels that don't fill the last row completely */
          .label-grid:has(.label:nth-child(4n+1):last-child) {
            justify-items: start;
          }
          
          .label-grid:has(.label:nth-child(4n+2):last-child) {
            justify-items: start;
          }
          
          .label-grid:has(.label:nth-child(4n+3):last-child) {
            justify-items: start;
          }
          
          .label {
            border: 1px solid #000;
            padding: 8px;
            text-align: center;
            background: white;
            min-height: 120px;
            height: 120px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            align-items: center;
            box-sizing: border-box;
            gap: 5px;
            width: 100%;
            max-width: 100%;
          }
          
          .asset-name {
            font-size: 10px;
            font-weight: bold;
            color: #000;
            margin-bottom: 3px;
            line-height: 1.1;
            max-width: 100%;
            word-wrap: break-word;
          }
          
          .qr-container {
            margin: 2px 0;
            display: flex;
            justify-content: center;
            align-items: center;
            flex: 1;
            width: 100%;
            height: 100%;
            min-height: 60px;
          }
          
          svg {
            max-width: 100%;
            height: auto;
            display: block;
            width: 80px;
            height: 80px;
          }
          
          @media print {
            .label {
              border: 1px solid #000;
              page-break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        <div class="label-grid">
    `;

    // Generate labels based on selected number with embedded SVG
    let labelsHtml = '';
    for (let i = 0; i < numLabels; i++) {
      labelsHtml += `
        <div class="label">
          <div class="asset-name">${assetName}</div>
          <div class="qr-container">
            ${qrSvg}
          </div>
        </div>
      `;
    }

    const fullContent = printContent + labelsHtml + `
        </div>
        <script>
          // Print immediately when loaded
          window.onload = function() {
            setTimeout(function() {
              window.print();
              setTimeout(function() {
                window.close();
              }, 500);
            }, 500);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(fullContent);
    printWindow.document.close();
    printWindow.document.close();
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
          setEditedAsset((prev: Asset | null) => prev ? { ...prev, inventory_number: qr.data } : null);
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
        setEditedAsset((prev: Asset | null) => prev ? { ...prev, inventory_number: data.code } : null);
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

      // ตรวจสอบว่าเปลี่ยน department หรือ status หรือทั้งสอง
      const isDepartmentChanged = editedAsset.department_id !== asset?.department_id;
      const isStatusChanged = editedAsset.status !== asset?.status;
      // ไม่อนุญาตให้โอนย้ายไป department เดิม (เฉพาะตอน Edit)
      if (!isCreating && isDepartmentChanged && editedAsset.department_id === asset?.department_id) {
        Swal.fire({
          title: 'Error',
          text: 'Cannot transfer to the same department. Please select a different department.',
          icon: 'error'
        });
        setLoading(false);
        return;
      }
      // เฉพาะกรณีแก้ไข (Edit) เท่านั้นที่ต้องเช็ค validation นี้
      if (!isCreating && isDepartmentChanged && isStatusChanged) {
        Swal.fire({
          title: 'Error',
          text: 'Cannot transfer department and verify status at the same time. Please do one action at a time.',
          icon: 'error'
        });
        setLoading(false);
        return;
      }
      let finalAssetData: any = { ...editedAsset, image_url: imageUrl };
      // --- เพิ่มเติม: acquired_date เป็นเวลาประเทศไทย ---
      if (acquiredDate) {
        finalAssetData.acquired_date = dayjs(acquiredDate).tz('Asia/Bangkok').format('YYYY-MM-DD HH:mm');
      }
      if (isDepartmentChanged && !isStatusChanged) {
        // โอนย้าย: ส่งเฉพาะ department_id (และ field อื่น ๆ ที่ไม่ใช่ status)
        finalAssetData = { ...finalAssetData, status: asset?.status };
      } else if (!isDepartmentChanged && isStatusChanged) {
        // ตรวจนับ: ส่งเฉพาะ status (และ field อื่น ๆ ที่ไม่ใช่ department_id)
        finalAssetData = { ...finalAssetData, department_id: asset?.department_id };
      } else if (!isDepartmentChanged && !isStatusChanged) {
        // อัปเดต field อื่น ๆ ปกติ
      }

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
        
        // ถ้าเคย edit แล้วในช่วงตรวจนับ ให้เปลี่ยนสถานะ
        if (isInAuditPeriod && !hasEditedInAuditPeriod) {
          setHasEditedInAuditPeriod(true);
          // บันทึกลง localStorage
          const editedAssets = JSON.parse(localStorage.getItem('editedAssetsInAuditPeriod') || '[]');
          if (!editedAssets.includes(editedAsset.id)) {
            editedAssets.push(editedAsset.id);
            localStorage.setItem('editedAssetsInAuditPeriod', JSON.stringify(editedAssets));
          }
        }
        
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
    // Resume auto-refresh when closing popup
    resumeAutoRefresh();
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
    // Resume auto-refresh when canceling
    resumeAutoRefresh();
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
      if (f === 'inventory_number') return !!asset.inventory_number && asset.inventory_number.length === 20;
      return !!(asset as any)[f] && (asset as any)[f].toString().trim() !== '';
    });
  };

  const renderField = (label: string, field: keyof Asset, type: string = 'text', icon?: React.ReactNode) => {
    const value = editedAsset[field] as string;

    // Fields that should be read-only for non-admin users
    const readOnlyFields = ['owner', 'created_at', 'updated_at'];
    const isReadOnlyForUser = !isAdminOrSuperadmin && readOnlyFields.includes(field as string);

    // Helper to render label with asterisk if required
    const renderLabel = () => {
      // Special: show red asterisk for inventory_number if not exactly 20 chars
      if (field === 'inventory_number') {
        const isValid = value && value.length === 20;
        return <>{icon} {label} :<b className={styles.redAsterisk} style={{ color: isValid ? undefined : '#ef4444' }}>*</b></>;
      }
      return <>{icon} {label} :{requiredLabelFields.includes(field) ? <b className={styles.redAsterisk}>*</b> : ''}</>;
    };

    if (isEditing && !isReadOnlyForUser) {
      if (field === 'acquired_date') {
        // สร้าง placeholder เป็นเวลาปัจจุบันของไทย
        let placeholder = '';
        if (!acquiredDate) {
          const nowTH = dayjs().tz('Asia/Bangkok');
          placeholder = nowTH.format('D MMMM YYYY HH:mm');
        }
        return (
          <div className={styles.infoItem}>
            <label>{renderLabel()}</label>
            <DatePicker
              selected={acquiredDate}
              onChange={() => { }}
              showTimeSelect
              timeFormat="HH:mm"
              timeIntervals={1}
              dateFormat="d MMMM yyyy HH:mm"
              locale={th}
              className={styles.editInput}
              placeholderText={placeholder || "เลือกวันที่ได้มา"}
              isClearable={false}
              autoComplete="off"
              popperPlacement="bottom"
              calendarStartDay={0}
              maxDate={now}
              disabled
            />
          </div>
        );
      }
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
              options={statusOptions.map(option => ({ id: option.value, name: option.label }))}
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
        // ปรับ logic: superadmin เปิดเสมอ, admin เปิดเฉพาะนอก audit, user ปิดเสมอ
        let canEditDepartment = false;
        if (isSuperadmin || isCreating) {
          canEditDepartment = true;
        } else if (isPureAdmin) {
          canEditDepartment = !isInAuditPeriod;
        }
        

        
        if (canEditDepartment) {
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
        } else {
          // read-only
          return (
            <div className={styles.infoItem}>
              <label>{renderLabel()}</label>
              <span className={styles.readOnlyField}>
                {departments.find(dep => String(dep.id) === String(editedAsset.department_id))?.name_th || editedAsset.department || 'N/A'}
              </span>
            </div>
          );
        }
      } else {
        return (
          <div className={styles.infoItem}>
            <label>{renderLabel()}</label>
            <input
              type={type}
              value={value || ''}
              onChange={(e) => handleInputChange(field, e.target.value)}
              onBlur={(e) => {
                if (field === 'inventory_number') {
                  let inputValue = e.target.value;
                  // ลบเลข 0 นำหน้าออกก่อน (เฉพาะเมื่อขึ้นต้นด้วย 0)
                  if (inputValue.startsWith('0')) {
                    inputValue = inputValue.replace(/^0+/, '');
                  }
                  // ถ้ามีข้อมูลและความยาวน้อยกว่า 20 ตัว ให้เพิ่ม 0 นำหน้า
                  if (inputValue.length > 0 && inputValue.length < 20) {
                    inputValue = inputValue.padStart(20, '0');
                    setEditedAsset(prev => prev ? { ...prev, inventory_number: inputValue } : null);
                  }
                }
              }}
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

  // ย้ายฟังก์ชัน renderCodeActions ไปไว้ใน AssetDetailPopup และกำหนด type codeType: 'barcode' | 'qrcode'
  const renderCodeActions = () => {
    const isBarcode = codeType === 'barcode';
    const codeValue = editedAsset?.inventory_number;
    return (
      <div className={styles.barcodeActions} style={{marginTop: '3rem', width: '100%', display: 'flex', justifyContent: 'space-around', padding: '0px 30px'}}>
        {/* Download */}
        <button
          onClick={() => {
            if (isBarcode) {
              // Download barcode with label layout
              if (barcodeRef.current && codeValue) {
                // Create canvas with label layout (high resolution)
                const canvas = document.createElement('canvas');
                const scale = 2; // Increase resolution
                canvas.width = 220 * scale;
                canvas.height = 120 * scale;
                const ctx = canvas.getContext('2d');
                
                if (ctx) {
                  // Scale context for high resolution
                  ctx.scale(scale, scale);
                  // Set background
                  ctx.fillStyle = 'white';
                  ctx.fillRect(0, 0, canvas.width, canvas.height);
                  
                  // Draw border
                  ctx.strokeStyle = 'black';
                  ctx.lineWidth = 1;
                  ctx.strokeRect(0, 0, canvas.width, canvas.height);
                  
                  // Draw asset name
                  ctx.fillStyle = 'black';
                  ctx.font = 'bold 12px Arial';
                  ctx.textAlign = 'center';
                  ctx.fillText(editedAsset.name || 'Asset', 110, 20);
                  
                  // Create temporary SVG for barcode
                  const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                  tempSvg.setAttribute('width', '200');
                  tempSvg.setAttribute('height', '60');
                  
                  // Generate barcode in temporary SVG
                  const success = generateBarcode(tempSvg, codeValue, {
                    width: 3.0,
                    height: 60,
                    fontSize: 14,
                    marginTop: 0,
                    displayValue: false,
                    background: '#fff',
                    lineColor: '#000'
                  });
                  
                  if (success) {
                    // Convert SVG to image
                    const svgString = tempSvg.outerHTML;
                    const svgBlob = new Blob([svgString], {type: 'image/svg+xml;charset=utf-8'});
                    const url = URL.createObjectURL(svgBlob);
                    const img = new window.Image();
                    img.onload = function() {
                      ctx.drawImage(img, (canvas.width / scale - 200) / 2, 30, 200, 60);
                      URL.revokeObjectURL(url);
                      
                      // Draw inventory number
                      ctx.font = '12px Arial';
                      ctx.textAlign = 'center';
                      ctx.fillText(codeValue || '', 110, 100);
                      
                      // Download
                      const pngUrl = canvas.toDataURL('image/png');
                      const a = document.createElement('a');
                      a.href = pngUrl;
                      a.download = `barcode-${codeValue}.png`;
                      a.click();
                    };
                    img.src = url;
                  } else {
                    console.error('Failed to generate barcode for download');
                  }
                }
              }
            } else {
              // Download QR code with label layout
              const canvas = document.createElement('canvas');
              canvas.width = 200;
              canvas.height = 120;
              const ctx = canvas.getContext('2d');
              
              if (ctx) {
                // Set background
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Draw border
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 1;
                ctx.strokeRect(0, 0, canvas.width, canvas.height);
                
                // Draw asset name
                ctx.fillStyle = 'black';
                ctx.font = 'bold 12px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(editedAsset.name || 'Asset', canvas.width / 2, 20);
                
                // Get QR code canvas and draw it
                const qrCanvas = document.querySelector('canvas');
                if (qrCanvas) {
                  ctx.drawImage(qrCanvas, (canvas.width - 80) / 2, 30, 80, 80);
                  
                  // Download
                  const pngUrl = canvas.toDataURL('image/png');
                  const a = document.createElement('a');
                  a.href = pngUrl;
                  a.download = `qrcode-${codeValue}.png`;
                  a.click();
                }
              }
            }
          }}
          title={isBarcode ? "Download Barcode" : "Download QR Code"}
          className={styles.downloadButton}
          disabled={!codeValue}
        >
          <img src="/dowload.png" alt="Download" width={24} height={24} className={styles.barcodeIcon} />
        </button>

        {/* Print Labels - แสดงเฉพาะเมื่อเป็น Barcode */}
        {isBarcode && (
          <button
            onClick={handlePrintBarcodeLabels}
            title="Print Barcode Labels"
            className={styles.printLabelsButton}
            disabled={!codeValue}
          >
            <img src="/print.png" alt="Print Labels" width={24} height={24} className={styles.barcodeIcon} />
          </button>
        )}

        {/* Print QR Code Labels - แสดงเฉพาะเมื่อเป็น QR Code */}
        {!isBarcode && (
          <button
            onClick={handlePrintQRCodeLabels}
            title="Print QR Code Labels"
            className={styles.printQRCodeLabelsButton}
            disabled={!codeValue}
          >
            <img src="/print.png" alt="Print QR Labels" width={24} height={24} className={styles.barcodeIcon} />
          </button>
        )}

        {/* Upload (แสดงทั้งสองโหมด) */}
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
    );
  };

  return (
    <div className={styles.overlay} onClick={showCamera ? undefined : handleClose}>
      {showEditWindowNotice && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 1000, maxWidth: 350 }}>
          <div className={bannerStyles.viewOnlyNotice} style={{ position: 'static', marginTop: 0, maxWidth: 350 }}>
            <div className={bannerStyles.viewOnlyNoticeContent}>
              <button className={bannerStyles.noticeCloseBtn} onClick={() => setShowEditWindowNotice(false)} title="Close notice">
                <AiOutlineClose />
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <AiOutlineInfoCircle style={{ color: '#38bdf8', fontSize: 32 }} />
                <div>
                  <div style={{ fontWeight: 700, color: '#92400e', fontSize: 16 }}>ไม่อยู่ในช่วงเวลาตรวจนับ</div>
                  <div style={{ color: '#92400e', fontSize: 15 }}>ขณะนี้ไม่สามารถแก้ไขข้อมูลได้</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {isInAuditPeriod && (isPureAdmin || isRegularUser) && !hideAuditNotice && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 1000, maxWidth: 350 }} onClick={(e) => e.stopPropagation()}>
          <div className={bannerStyles.viewOnlyNotice} style={{ position: 'static', marginTop: 0, maxWidth: 350 }}>
            <div className={bannerStyles.viewOnlyNoticeContent}>
              <button className={bannerStyles.noticeCloseBtn} onClick={() => setHideAuditNotice(true)} title="Audit period notice">
                <AiOutlineClose />
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <AiOutlineCalendar style={{ color: '#10b981', fontSize: 32 }} />
                <div>
                  <div style={{ fontWeight: 700, color: '#065f46', fontSize: 16 }}>ช่วงเวลาตรวจนับ</div>
                  <div style={{ color: '#065f46', fontSize: 15 }}>
                    {hasEditedInAuditPeriod ? 'คุณได้แก้ไขข้อมูลแล้ว' : 'คุณสามารถแก้ไขได้ครั้งเดียวเท่านั้น'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className={styles.popup} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>{headerText}</h2>
          <div className={styles.headerActions}>
            {!isEditing && canShowEditButton() && showUserEdit !== false && (
              <button className={styles.editButton} onClick={() => {
                // ปรับ inventory number ให้มี 20 หลักเมื่อเริ่ม edit
                if (editedAsset?.inventory_number) {
                  let inventoryNumber = editedAsset.inventory_number;
                  // ลบเลข 0 นำหน้าออกก่อน
                  inventoryNumber = inventoryNumber.replace(/^0+/, '');
                  // เพิ่มเลข 0 นำหน้าให้ครบ 20 หลัก
                  if (inventoryNumber.length > 0 && inventoryNumber.length < 20) {
                    inventoryNumber = inventoryNumber.padStart(20, '0');
                  }
                  setEditedAsset(prev => prev ? { ...prev, inventory_number: inventoryNumber } : null);
                }
                setIsEditing(true);
              }} title="Edit">
                <AiOutlineEdit />
              </button>
            )}
            {canOnlyView && (
              <div className={styles.viewOnlyBadge} title="View Only - No Department Assigned">
                View Only
              </div>
            )}
            {isInAuditPeriod && hasEditedInAuditPeriod && (isPureAdmin || isRegularUser) && (
              <div className={styles.auditEditBadge} title="Already edited during audit period">
                ✓ Edited
              </div>
            )}
            <button className={styles.closeButton} onClick={handleClose} title="Close">
              <AiOutlineClose />
            </button>
          </div>
        </div>

        <div className={styles.content} style={{}}>
          <div className={styles.imageSection} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', }}>
            {isEditing ? (
              <div className={styles.imageUpload}>
                <Image
                  src={imagePreview || editedAsset.image_url || "/522733693_1501063091226628_5759500172344140771_n.jpg"}
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
                src={editedAsset.image_url || "/522733693_1501063091226628_5759500172344140771_n.jpg"}
                alt={editedAsset.name}
                width={200}
                height={200}
                className={styles.assetImage} style={{}}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/522733693_1501063091226628_5759500172344140771_n.jpg';
                }}
              />
            )}
            {/* Toggle switch อยู่ติดกับ barcode/QR code */}
            <div className={styles.toggleSwitch} style={{ marginBottom: 4 , marginTop: '10px', }}>
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
            {/* Barcode SVG + 3 icon buttons///////////////////////////////////////////////////////////////////////////////// */}
              
              {/* barcode/qr code display */}

              
              {codeType === 'barcode' ? (
                <div style={{
                  position: 'relative',
                  width: '100%',
                  height: 70,
                  marginTop: '3rem', //ปรับบาร์โค้ดพร้อมชื่อassets
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  
                }}>
                  {editedAsset?.name && (
                    <div style={{
                      position: 'absolute',
                      top: -5, // ปรับให้ชิดขอบบนของ barcode หรือปรับค่าตามต้องการ
                      left: 0,
                      width: '100%',
                      textAlign: 'center',
                      fontWeight: 600,
                      fontSize: '0.85em',
                      color: '#222',
                      zIndex: 2,
                      pointerEvents: 'none',
                      background: 'transparent',
                      
                    }}>
                      {editedAsset.name}
                    </div>
                  )}
                  <svg ref={barcodeRef} width={140} height={36} style={{ display: 'block' }}></svg>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',paddingTop: '1.2rem', marginBottom: '-2.2rem' }}>
                  {editedAsset.inventory_number ? (
                    <>
                      <div style={{
                        fontSize: '12px',
                        color: '#333',
                        marginBottom: '8px',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        wordWrap: 'break-word',
                        lineHeight: '1.2'
                      }}>
                        {editedAsset.name}
                      </div>
                      <QRCodeCanvas value={editedAsset.inventory_number} size={100} level="M" includeMargin={true} />
                    </>
                  ) : (
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px', textAlign: 'center' }}>
                      No Inventory Number
                    </div>
                  )}
                </div>
              )}
              {renderCodeActions()}
          </div>
          {/* //////////////////////////////////////////////////////// */}

          <div className={styles.detailsSection}>
            <div className={styles.infoGrid}>
              {/* Row 1 */}
              {renderField('Asset Code', 'asset_code')}
              {renderField('Name', 'name')}

              {/* Row 2 */}
              {renderField('Inventory Number (20 digits)', 'inventory_number', 'text')}
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
              {isAdminOrSuperadmin && onDelete && !isCreating ? (
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