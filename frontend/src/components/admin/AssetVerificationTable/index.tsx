import React, { useEffect, useState } from 'react';
import styles from '../../user/AssetsTable/AssetsTable.module.css';
import statusBadgeStyles from '../../common/statusBadge.module.css';
import { formatDate } from '../../../lib/utils';
import AssetAuditHistoryPopup from '../../common/AssetAuditHistoryPopup';
import { useAuth } from '../../../contexts/AuthContext';
import Image from 'next/image';
import Pagination from '../../common/Pagination';
import ExcelJS from 'exceljs';
import { AiOutlineDownload, AiOutlineCalendar, AiOutlineDown } from 'react-icons/ai';
import { DateRange } from 'react-date-range';
import { format, parse, isAfter, isBefore, isEqual } from 'date-fns';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { useStatusOptions } from '../../../lib/statusOptions';
import DateRangeFilterButton from '../../common/DateRangeFilterButton';
import Swal from 'sweetalert2';
import { AiOutlineEye } from 'react-icons/ai';
import AssetDetailPopup from '../../common/AssetDetailPopup';
import { highlightText } from '../../common/highlightText';

interface PendingAudit {
  id: number;
  asset_id: number;
  asset_code: string;
  asset_name: string;
  status: string;
  status_color?: string;
  note: string;
  user_name: string;
  checked_at: string;
  confirmed?: number;
  image_url?: string;
  inventory_number?: string;
  department_name?: string;
}



// เพิ่มฟังก์ชันแปลง PendingAudit -> Asset
function mapPendingAuditToAsset(audit: PendingAudit) {
  return {
    id: String(audit.asset_id ?? audit.id),
    asset_code: audit.asset_code || '',
    inventory_number: audit.inventory_number || '',
    serial_number: '',
    name: audit.asset_name || '',
    description: audit.note || '',
    location_id: '',
    location: '',
    department: audit.department_name || '',
    department_id: '',
    owner: audit.user_name || '',
    status: audit.status || '',
    image_url: audit.image_url || '',
    acquired_date: audit.checked_at || '',
    created_at: '',
    updated_at: '',
  };
}

interface AssetVerificationTableSuperAdminProps {
  searchTerm?: string;
  verificationPeriod?: { startDate?: Date; endDate?: Date };
  extraActionButton?: React.ReactElement<any, any>; // ปรับ type ตรงนี้
  onSearch?: (term: string) => void;
}

// เพิ่ม dropdown menu component ภายในไฟล์นี้ (minimal inline)
function ThreeDotsMenu({ onHistory }: { onHistory: () => void }) {
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, borderRadius: 4, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        onClick={e => { e.stopPropagation(); onHistory(); }}
        aria-label="View audit history"
        title="ดูประวัติการตรวจนับ"
      >
        <AiOutlineEye size={20} />
      </button>
    </div>
  );
}

const AssetVerificationTableSuperAdmin: React.FC<AssetVerificationTableSuperAdminProps> = ({ searchTerm = '', verificationPeriod, extraActionButton, onSearch }) => {
  const [pendingAudits, setPendingAudits] = useState<PendingAudit[]>([]);
  const [totalAudits, setTotalAudits] = useState(0);
  const [departments, setDepartments] = useState<{ id: number, name_th: string }[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState<'all' | number>('all');
  const [selected, setSelected] = useState<number[]>([]);
  const [showPopup, setShowPopup] = useState(false);
  const [popupAssetId, setPopupAssetId] = useState<number | null>(null);
  const { user } = useAuth();
  const [verificationFilter, setVerificationFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [currentPage, setCurrentPage] = React.useState(1);
  const rowsPerPage = 5;
  const [range, setRange] = useState<Array<{ startDate?: Date; endDate?: Date; key: string }>>([{ startDate: undefined, endDate: undefined, key: 'selection' }]);
  const [showPicker, setShowPicker] = useState(false);
  const { options: statusOptions, loading: statusLoading } = useStatusOptions();
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
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 600);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ดึง department list
  useEffect(() => {
    fetch('/api/assets/departments')
      .then(res => res.json())
      .then(data => setDepartments(data));
  }, []);

  // ดึงข้อมูล audits แบบ pagination + department filter
  useEffect(() => {
    const fetchAudits = async () => {
      let url = `/api/assets/audits/all?limit=${rowsPerPage}&offset=${(currentPage - 1) * rowsPerPage}`;
      if (departmentFilter !== 'all') {
        url += `&department_id=${departmentFilter}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      setPendingAudits(data.audits || []);
      setTotalAudits(data.total || 0);
    };
    fetchAudits();
  }, [currentPage, departmentFilter]);

  // Filter เฉพาะในหน้านั้น (เช่น filter สถานะ, วันที่)
  const filteredAudits = pendingAudits.filter(audit => {
    let pass = true;
    if (verificationFilter === 'all') pass = true;
    if (verificationFilter === 'pending') pass = !audit.confirmed;
    if (verificationFilter === 'approved') pass = !!audit.confirmed;
    // Date range filter
    const startDate = range[0].startDate;
    const endDate = range[0].endDate;
    if (startDate && endDate) {
      const checkedDate = audit.checked_at
        ? parse(audit.checked_at, 'yyyy-MM-dd HH:mm:ss', new Date())
        : undefined;
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      pass =
        pass &&
        !!checkedDate &&
        (isAfter(checkedDate, start) || isEqual(checkedDate, start)) &&
        (isBefore(checkedDate, end) || isEqual(checkedDate, end));
    }
    // Search filter เฉพาะคอลัมน์ที่ต้องการ
    const q = searchTerm.toLowerCase();
    if (q) {
      pass = pass && (
        (audit.inventory_number || '').toLowerCase().includes(q) ||
        (audit.asset_name || '').toLowerCase().includes(q) ||
        (statusLabels[audit.status] || audit.status || '').toLowerCase().includes(q) ||
        (audit.note || '').toLowerCase().includes(q) ||
        (audit.user_name || '').toLowerCase().includes(q) ||
        (audit.department_name || '').toLowerCase().includes(q) ||
        (formatDate(audit.checked_at) || '').toLowerCase().includes(q) ||
        (audit.confirmed ? 'approved' : 'pending').includes(q)
      );
    }
    return pass;
  });

  const totalPages = Math.ceil(totalAudits / rowsPerPage);
  const paginatedAudits = filteredAudits; // เพราะ backend ส่งมาแค่หน้าปัจจุบันแล้ว

  React.useEffect(() => {
    setCurrentPage(1);
  }, [verificationFilter]);

  const toggleSelect = (id: number) => {
    setSelected(sel => sel.includes(id) ? sel.filter(i => i !== id) : [...sel, id]);
  };

  const selectAll = () => {
    const pendingIds = filteredAudits.filter(a => !a.confirmed).map(a => a.id);
    if (selected.length === pendingIds.length) setSelected([]);
    else setSelected(pendingIds);
  };

  const confirmSelected = async () => {
    if (selected.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'กรุณาเลือกอย่างน้อย 1 รายการ',
        confirmButtonText: 'ตกลง',
      });
      return;
    }
    const result = await Swal.fire({
      title: 'ยืนยันการตรวจนับ',
      text: `คุณต้องการยืนยันรายการที่เลือก (${selected.length} รายการ) ใช่หรือไม่?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ยกเลิก',
    });
    if (!result.isConfirmed) return;
    await fetch('/api/assets/audits/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: selected }),
    });
    setPendingAudits(audits => audits.map(a => selected.includes(a.id) ? { ...a, confirmed: 1 } : a));
    setSelected([]);
    Swal.fire({
      icon: 'success',
      title: 'ยืนยันสำเร็จ',
      text: 'ยืนยันการตรวจนับเรียบร้อยแล้ว',
      confirmButtonText: 'ตกลง',
    });
  };

  const openHistoryPopup = (assetId: number) => {
    setPopupAssetId(assetId);
    setShowPopup(true);
  };

  // Export XLSX logic (reuse from ReportAssetsTable)
  const handleExportXLSX = async () => {
    if (!filteredAudits || filteredAudits.length === 0) return;
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Asset Verification');
    
    // Add header row
    const headers = [
      'Inventory Number',
      'Name',
      'Status',
      'Note',
      'Auditor',
      'Department',
      'Date',
      'Verification Status',
    ];
    worksheet.addRow(headers);
    
    // Add data rows
    const dataRows = filteredAudits.map((audit: PendingAudit) => [
      audit.inventory_number || '',
      audit.asset_name || '',
      statusLabels[audit.status] || audit.status || '',
      audit.note || '',
      audit.user_name || '',
      audit.department_name || '',
      formatDate(audit.checked_at) || '',
      audit.confirmed ? 'Approved' : 'Pending',
    ]);
    
    dataRows.forEach(row => {
      worksheet.addRow(row);
    });
    
    // Calculate dynamic column widths based on actual content
    const calculateColumnWidth = (columnIndex: number) => {
      let maxLength = headers[columnIndex].length; // Start with header length
      
      // Check all data rows for this column
      dataRows.forEach(row => {
        const cellValue = String(row[columnIndex] || '');
        maxLength = Math.max(maxLength, cellValue.length);
      });
      
      // Add some padding and ensure minimum width
      const width = Math.max(maxLength + 2, 8);
      
      // Cap maximum width to prevent overly wide columns
      return Math.min(width, 50);
    };
    
    // Calculate widths for all columns
    const columnWidths = headers.map((_, index) => ({
      width: calculateColumnWidth(index)
    }));
    
    // Set column widths
    worksheet.columns = columnWidths;
    
    // Apply formatting to all cells
    worksheet.eachRow((row: any, rowNumber: number) => {
      row.eachCell((cell: any, colNumber: number) => {
        // Set text format for inventory number column
        if (colNumber === 1 && rowNumber > 1) {
          cell.value = String(cell.value ?? '');
          cell.numFmt = '@';
        }
        
        // Center alignment for all cells
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        
        // Border for all cells (including empty ones)
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } },
        };
        
        // Header styling
        if (rowNumber === 1) {
          cell.font = { bold: true };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD9D9D9' },
          };
        }
        
        // Ensure empty cells have borders by setting empty string if null/undefined
        if (cell.value === null || cell.value === undefined) {
          cell.value = '';
        }
      });
    });
    
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'asset_verification_all.xlsx';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const popupAsset = pendingAudits.find(a => a.asset_id === popupAssetId);

  // เพิ่ม state และ AssetDetailPopup
  const [showDetailPopup, setShowDetailPopup] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState<PendingAudit | null>(null);
  const [assetDetail, setAssetDetail] = useState<any>(null);

  return (
    <>
      <div style={{ padding: isMobile ? '0.5rem' : '2rem', backgroundColor: 'var(--card-bg)', borderRadius: '15px', boxShadow: 'var(--shadow-sm)', marginTop: isMobile ? '48px' : undefined }}>
        {isMobile ? (
          <div style={{ maxWidth: 380, margin: '0 auto', width: '100%' }}>
            <div style={{ display: 'flex', gap: '0.7rem', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
              <div className={styles.dropdownWrapper} style={{ flex: 1, minWidth: 0, maxWidth: 180 }}>
                <select
                  className={styles.filterDropdown}
                  value={verificationFilter}
                  onChange={e => setVerificationFilter(e.target.value as 'all' | 'pending' | 'approved')}
                  style={{ width: '100%', background: '#fafbfc', border: '1.5px solid #e5e7eb', borderRadius: 10, height: 44, fontSize: '1rem', color: '#222', fontWeight: 500 }}
                >
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                </select>
                <span className={styles.caretIcon}><AiOutlineDown /></span>
              </div>
              <div className={styles.dropdownWrapper} style={{ flex: 1, minWidth: 0, maxWidth: 180 }}>
                <select
                  className={styles.filterDropdown}
                  value={departmentFilter}
                  onChange={e => setDepartmentFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  style={{ width: '100%', background: '#fafbfc', border: '1.5px solid #e5e7eb', borderRadius: 10, height: 44, fontSize: '1rem', color: '#222', fontWeight: 500 }}
                >
                  <option value="all">All Departments</option>
                  {departments.map(dep => (
                    <option key={dep.id} value={dep.id}>{dep.name_th}</option>
                  ))}
                </select>
                <span className={styles.caretIcon}><AiOutlineDown /></span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.7rem', alignItems: 'center', justifyContent: 'center', marginBottom: 10, position: 'relative' }}>
              <button
                style={{ background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 10, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0 }}
                onClick={() => setShowPicker(v => !v)}
                type="button"
              >
                <AiOutlineCalendar style={{ fontSize: '1.3rem', color: '#222' }} />
              </button>
              {showPicker && (
                <div style={{ position: 'absolute', zIndex: 90, top: 50, left: 0, border: '1.5px solid #e5e7eb', borderRadius: 12, background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                  <DateRange
                    editableDateInputs={true}
                    onChange={(item: any) => setRange([item.selection])}
                    moveRangeOnFirstSelection={false}
                    ranges={range}
                    showSelectionPreview={true}
                    showMonthAndYearPickers={true}
                    maxDate={new Date()}
                    rangeColors={['#11998e']}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0.8rem', background: '#fff' }}>
                    <button
                      style={{ padding: '0.5rem 1.1rem', borderRadius: 6, border: 'none', background: '#11998e', color: '#fff', fontWeight: 500, cursor: 'pointer' }}
                      onClick={() => {
                        setRange([{ startDate: undefined, endDate: undefined, key: 'selection' }]);
                        setShowPicker(false);
                      }}
                    >
                      Reset
                    </button>
                    <button
                      style={{ marginLeft: 8, padding: '0.5rem 1.1rem', borderRadius: 6, border: 'none', background: '#11998e', color: '#fff', fontWeight: 500, cursor: 'pointer' }}
                      onClick={() => setShowPicker(false)}
                    >
                      OK
                    </button>
                  </div>
                </div>
              )}
              <button
                className={styles.exportXlsxButtonSmall}
                style={{
                  background: 'linear-gradient(135deg, #5768D2 0%, #EB9CED 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  padding: '0.5rem 0.5rem',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  height: 44,
                  boxShadow: 'var(--shadow-md)',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  flex: 1,
                  minWidth: 0,
                  maxWidth: 150,
                  justifyContent: 'center',
                }}
                onMouseOver={e => e.currentTarget.style.background = 'linear-gradient(135deg, #7C5FE6 0%, #F3B6F9 100%)'}
                onMouseOut={e => e.currentTarget.style.background = 'linear-gradient(135deg, #5768D2 0%, #EB9CED 100%)'}
                onClick={handleExportXLSX}
                title="Export XLSX"
              >
                <AiOutlineDownload style={{ fontSize: '1.3em' }} />
                <span style={{ marginLeft: 4 }}>Export</span>
              </button>
              {extraActionButton &&
                React.isValidElement(extraActionButton)
                  ? React.cloneElement(
                      extraActionButton,
                      {
                        ...(extraActionButton.props as any),
                        style: {
                          background: 'linear-gradient(90deg, #4F8CFF 0%, #6BD6FF 100%)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 10,
                          fontWeight: 600,
                          fontSize: '0.9rem',
                          cursor: 'pointer',
                          maxWidth: 150,
                          height: 44,
                          lineHeight: 1.1,
                          boxShadow: 'var(--shadow-md)',
                          transition: 'background 0.2s',
                          flex: 1,
                          minWidth: 0,
                          marginLeft: 0,
                          marginRight: 0,
                          justifyContent: 'center',
                          ...(extraActionButton.props && (extraActionButton.props as any).style),
                        },
                        onMouseOver: (e: any) => e.currentTarget.style.background = 'linear-gradient(90deg, #3576E6 0%, #4FC3F7 100%)',
                        onMouseOut: (e: any) => e.currentTarget.style.background = 'linear-gradient(90deg, #4F8CFF 0%, #6BD6FF 100%)',
                      }
                    )
                  : extraActionButton
              }
            </div>
            {/* Row 3: Search input */}
            <div style={{ padding: '0 0.5rem 0.5rem 0.5rem' }}>
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={e => {
                  const value = e.target.value;
                  onSearch?.(value);
                }}
                className={styles.mobileSearchInput}
              />
            </div>
            <div style={{ maxWidth: 380, margin: '0 auto', width: '100%' }}>
              {paginatedAudits.map(audit => (
                <div className={styles.assetCard} key={audit.id} style={{ position: 'relative', cursor: 'pointer' }} onClick={async (e) => {
                  console.log('Asset card clicked!', audit.asset_name);
                  // ป้องกันการ click เมื่อคลิกที่ไอคอนตาหรือ checkbox
                  if ((e.target as HTMLElement).closest('[data-history-button]') || 
                      (e.target as HTMLElement).closest('[data-select-checkbox]')) {
                    console.log('Clicked on history button or checkbox, ignoring');
                    return;
                  }
                  console.log('Opening asset detail popup...');
                  console.log('Setting selectedAudit:', audit);
                  console.log('Setting showDetailPopup to true');
                  setSelectedAudit(audit);
                  setShowDetailPopup(true);
                  setAssetDetail(null);
                  try {
                    const res = await fetch(`/api/assets/${audit.asset_id || audit.id}`, { credentials: 'include' });
                    if (res.ok) {
                      const data = await res.json();
                      setAssetDetail(data);
                    } else {
                      setAssetDetail(null);
                    }
                  } catch {
                    setAssetDetail(null);
                  }
                }}>
                  {/* ไอคอนตาและ checkbox ในมุมขวาบน */}
                  <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div data-history-button>
                      <ThreeDotsMenu onHistory={() => { setPopupAssetId(audit.asset_id); setShowPopup(true); }} />
                    </div>
                    {(verificationFilter !== 'approved') && !audit.confirmed && (
                      <div data-select-checkbox>
                        <input
                          type="checkbox"
                          checked={selected.includes(audit.id)}
                          onChange={(e) => { e.stopPropagation(); toggleSelect(audit.id); }}
                          style={{ width: 20, height: 20, cursor: 'pointer', margin: 0 }}
                        />
                      </div>
                    )}
                  </div>
                  
                  {/* รูป asset ตรงกลาง */}
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 16, padding: '16px 0', marginTop: 45 }}>
                    <img
                      src={audit.image_url || '/522733693_1501063091226628_5759500172344140771_n.jpg'}
                      alt={audit.asset_name}
                      style={{ 
                        width: 90, 
                        height: 90, 
                        objectFit: 'cover', 
                        borderRadius: 12,
                        border: '3px solid #e5e7eb',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}
                      onError={e => { (e.target as HTMLImageElement).src = '/522733693_1501063091226628_5759500172344140771_n.jpg'; }}
                    />
                  </div>
                  
                  <div className={styles.assetCardContent}>
                                    <div className={styles.assetCardTitle}>{highlightText(audit.asset_name || '', searchTerm)}</div>
                <div className={styles.assetCardMetaRow}><b>Inventory:</b> {highlightText(audit.inventory_number || '', searchTerm)}</div>
                    <div className={styles.assetCardMetaRow}><b>Status:</b> <span className={`${statusBadgeStyles.statusBadge} compact`} style={{ 
                      background: audit.status_color ? `${audit.status_color}20` : '#f3f4f6', 
                      color: audit.status_color || '#6b7280' 
                    }}>{highlightText(statusLabels[audit.status] || audit.status, searchTerm)}</span></div>
                    <div className={styles.assetCardMetaRow}><b>Note:</b> {highlightText(audit.note || '-', searchTerm)}</div>
                    <div className={styles.assetCardMetaRow}><b>Auditor:</b> {highlightText(audit.user_name || '-', searchTerm)}</div>
                    <div className={styles.assetCardMetaRow}><b>Department:</b> {highlightText(audit.department_name || '-', searchTerm)}</div>
                    <div className={styles.assetCardMetaRow}><b>Date:</b> {highlightText(formatDate(audit.checked_at) || '-', searchTerm)}</div>
                    <div className={styles.assetCardMetaRow}><b>Verification:</b> <span className={`${statusBadgeStyles.statusBadge} ${audit.confirmed ? statusBadgeStyles.approved : statusBadgeStyles.pending}`}>{highlightText((audit.confirmed ? 'Approved' : 'Pending'), searchTerm)}</span></div>
                  </div>
                </div>
              ))}
              {totalPages > 1 && (
                <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />
                  {(verificationFilter !== 'approved') && (
                    <button
                      className={styles.confirmButton}
                      disabled={selected.length === 0}
                      onClick={confirmSelected}
                      style={{ marginLeft: 8, display: 'flex', alignItems: 'center', gap: 6, borderRadius: 10, padding: '0.5rem 1.2rem', fontSize: '1rem', height: 40 }}
                    >
                      Confirm Selected
                    </button>
                  )}
                </div>
              )}
            </div>
            {showPopup && popupAssetId && (
              <AssetAuditHistoryPopup
                assetId={popupAssetId}
                open={showPopup}
                onClose={() => setShowPopup(false)}
              />
            )}
          </div>
        ) : (
          <>
            <div className={styles.assetsControls} style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'nowrap' }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <div className={styles.dropdownWrapper}>
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <select
                      className={styles.departmentDropdown}
                      value={verificationFilter}
                      onChange={e => setVerificationFilter(e.target.value as any)}
                    >
                      <option value="all">All</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                    </select>
                    <span className={styles.caretIcon}><AiOutlineDown /></span>
                  </div>
              </div>
                <div className={styles.dropdownWrapper}>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <select
                    className={styles.departmentDropdown}
                    value={departmentFilter}
                    onChange={e => setDepartmentFilter(e.target.value as 'all' | number)}
                  >
                    <option value="all">All Departments</option>
                    {departments.map(dep => (
                      <option key={dep.id} value={dep.id}>{dep.name_th}</option>
                    ))}
                  </select>
                  <span className={styles.caretIcon}><AiOutlineDown /></span>
                  </div>
                </div>
              </div>
              {/* Calendar + Export (right) */}
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginLeft: 'auto' }}>
                <button
                  onClick={() => setShowPicker(v => !v)}
                  style={{
                    background: '#fafbfc',
                    border: '1.5px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '0.6rem 0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 0,
                    minHeight: 0,
                    height: '44px',
                    width:'48px',
                    boxShadow: 'none',
                    cursor: 'pointer',
                    transition: 'border 0.2s',
                    outline: showPicker ? '2px solid #11998e' : 'none',
                  }}
                  title="เลือกช่วงวันที่"
                >
                  <AiOutlineCalendar style={{ fontSize: '1.35em', color: '#222' }} />
                </button>
                {showPicker && (
                  <div style={{ position: 'absolute', zIndex: 90, top: 230,  border: '1.5px solid #e5e7eb', borderRadius: 12 ,background: '#fff' }}>
                    <DateRange
                      editableDateInputs={true}
                      onChange={(item: any) => setRange([item.selection])}
                      moveRangeOnFirstSelection={false}
                      ranges={range}
                      showSelectionPreview={true}
                      showMonthAndYearPickers={true}
                      maxDate={new Date()}
                      rangeColors={['#11998e']}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0.8rem',background: '#fff' }}>
                      <button
                        style={{ padding: '0.5rem 1.1rem', borderRadius: 6, border: 'none', background: '#11998e', color: '#fff', fontWeight: 500, cursor: 'pointer' }}
                        onClick={() => {
                          setRange([{ startDate: undefined, endDate: undefined, key: 'selection' }]);
                          setShowPicker(false);
                        }}
                      >
                        Reset
                      </button>
                      <button
                        style={{ marginLeft: 8, padding: '0.5rem 1.1rem', borderRadius: 6, border: 'none', background: '#11998e', color: '#fff', fontWeight: 500, cursor: 'pointer' }}
                        onClick={() => setShowPicker(false)}
                      >
                        OK
                      </button>
                    </div>
                  </div>
                )}
                <button
                  className={styles.exportXlsxButtonSmall}
                  style={{
                    background: 'linear-gradient(135deg, #5768D2 0%, #EB9CED 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 10,
                    padding: '0.5rem 1.2rem',
                    fontSize: '1rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    height: 44,
                    boxShadow: 'var(--shadow-md)',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                  }}
                  onMouseOver={e => e.currentTarget.style.background = 'linear-gradient(135deg, #7C5FE6 0%, #F3B6F9 100%)'}
                  onMouseOut={e => e.currentTarget.style.background = 'linear-gradient(135deg, #5768D2 0%, #EB9CED 100%)'}
                  onClick={handleExportXLSX}
                  title="Export XLSX"
                >
                  <AiOutlineDownload style={{ fontSize: '1.3em' }} />
                  {!isMobile && 'Export'}
                </button>
                {extraActionButton}
              </div>
            </div>
            

            <table className={styles.assetsTable} style={{ tableLayout: 'fixed', width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: 30 }}>
                    {(verificationFilter !== 'approved') && (
                      <input
                        type="checkbox"
                        checked={
                          filteredAudits.filter(a => !a.confirmed).length > 0 &&
                          selected.length === filteredAudits.filter(a => !a.confirmed).length
                        }
                        onChange={selectAll}
                      />
                    )}
                  </th>
                  <th style={{ width: 80 }}>Image</th>
                  <th style={{ width: 120 }}>Inventory Number</th>
                  <th style={{ width: 180 }}>Name</th>
                  <th style={{ width: 200 }}>Status</th>
                  <th style={{ width: 120 }}>Note</th>
                  <th style={{ width: 120 }}>Auditor</th>
                  <th style={{ width: 190 }}>Department</th>
                  <th style={{ width: 140 }}>Date</th>
                  <th style={{ width: 140 }}>Verification Status</th>
                  <th style={{ width: 80 }}>History</th>
                </tr>
              </thead>
              <tbody>
                {paginatedAudits.map(audit => (
                  <tr 
                    key={audit.id} 
                    style={{ cursor: 'pointer' }}
                    onClick={async () => {
                      setSelectedAudit(audit);
                      setShowDetailPopup(true);
                      setAssetDetail(null);
                      try {
                        const res = await fetch(`/api/assets/${audit.asset_id || audit.id}`, { credentials: 'include' });
                        if (res.ok) {
                          const data = await res.json();
                          setAssetDetail(data);
                        } else {
                          setAssetDetail(null);
                        }
                      } catch {
                        setAssetDetail(null);
                      }
                    }}
                  >
                    <td>
                      {!audit.confirmed && (
                        <input
                          type="checkbox"
                          checked={selected.includes(audit.id)}
                          onChange={() => toggleSelect(audit.id)}
                          onClick={e => e.stopPropagation()}
                        />
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <Image
                        src={audit.image_url || '/522733693_1501063091226628_5759500172344140771_n.jpg'}
                        alt={audit.asset_name}
                        width={60}
                        height={60}
                        style={{ objectFit: 'cover', borderRadius: 8 }}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/522733693_1501063091226628_5759500172344140771_n.jpg';
                        }}
                      />
                    </td>
                    <td>{highlightText(audit.inventory_number || '', searchTerm)}</td>
                    <td>{highlightText(audit.asset_name || '', searchTerm)}</td>
                    <td>
                      <span className={`${statusBadgeStyles.statusBadge} compact`} style={{ 
                        background: audit.status_color ? `${audit.status_color}20` : '#f3f4f6', 
                        color: audit.status_color || '#6b7280' 
                      }}>
                        {highlightText(statusLabels[audit.status] || audit.status, searchTerm)}
                      </span>
                    </td>
                    <td>{highlightText(audit.note || '', searchTerm)}</td>
                    <td>{highlightText(audit.user_name || '', searchTerm)}</td>
                    <td>{highlightText(audit.department_name || '', searchTerm)}</td>
                    <td>{highlightText(formatDate(audit.checked_at) || '', searchTerm)}</td>
                    <td
                      style={{ textAlign: 'center', verticalAlign: 'middle', height: 48 }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                        <span className={`${statusBadgeStyles.statusBadge} ${audit.confirmed ? statusBadgeStyles.approved : statusBadgeStyles.pending}`}>
                          {highlightText((audit.confirmed ? 'Approved' : 'Pending'), searchTerm)}
                        </span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <ThreeDotsMenu onHistory={() => { setPopupAssetId(audit.asset_id); setShowPopup(true); }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <button
                className={styles.confirmButton}
                disabled={selected.length === 0}
                onClick={confirmSelected}
              >
                Confirm Selected
              </button>
            </div>
            {totalPages > 1 && (
              <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
            {showPopup && popupAssetId && (
              <AssetAuditHistoryPopup
                assetId={popupAssetId}
                open={showPopup}
                onClose={() => setShowPopup(false)}
              />
            )}
          </>
        )}
        
        {/* AssetDetailPopup - ใช้ร่วมกันทั้ง mobile และ desktop */}
        {showDetailPopup && selectedAudit && (
          <AssetDetailPopup
            asset={assetDetail ? {
              ...assetDetail,
              id: String(assetDetail.id || assetDetail.asset_id || selectedAudit.asset_id || selectedAudit.id),
              asset_code: assetDetail.asset_code || '',
              inventory_number: assetDetail.inventory_number || '',
              serial_number: assetDetail.serial_number || '',
              name: assetDetail.name || selectedAudit.asset_name || '',
              description: assetDetail.description || '',
              location_id: assetDetail.location_id || '',
              location: assetDetail.location || '',
              room: assetDetail.room || '',
              department: assetDetail.department || selectedAudit.department_name || '',
              department_id: assetDetail.department_id || '',
              owner: assetDetail.owner || selectedAudit.user_name || '',
              status: assetDetail.status || selectedAudit.status,
              image_url: assetDetail.image_url || selectedAudit.image_url || '',
              acquired_date: assetDetail.acquired_date || selectedAudit.checked_at || '',
              created_at: assetDetail.created_at || '',
              updated_at: assetDetail.updated_at || '',
            } : {
              id: String(selectedAudit.asset_id || selectedAudit.id),
              asset_code: '',
              inventory_number: '',
              serial_number: '',
              name: selectedAudit.asset_name || '',
              description: '',
              location_id: '',
              location: '',
              room: '',
              department: selectedAudit.department_name || '',
              department_id: '',
              owner: selectedAudit.user_name || '',
              status: selectedAudit.status,
              image_url: selectedAudit.image_url || '',
              acquired_date: selectedAudit.checked_at || '',
              created_at: '',
              updated_at: '',
            }}
            isOpen={showDetailPopup}
            onClose={() => setShowDetailPopup(false)}
            isAdmin={false}
            isCreating={false}
          />
        )}
      </div>
    </>
  );
};

export default AssetVerificationTableSuperAdmin; 