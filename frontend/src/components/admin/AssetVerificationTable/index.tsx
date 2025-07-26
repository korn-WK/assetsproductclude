import React, { useEffect, useState } from 'react';
import type { Asset } from '../../common/AssetDetailPopup';
import styles from '../../user/AssetsTable/AssetsTable.module.css';
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

interface PendingAudit {
  id: number;
  asset_id: number;
  asset_code: string;
  asset_name: string;
  status: string;
  note: string;
  user_name: string;
  checked_at: string;
  confirmed?: number;
  image_url?: string;
  inventory_number?: string;
  department_name?: string;
}

const statusTabs = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'พร้อมใช้งาน', label: 'พร้อมใช้งาน' },
  { key: 'รอใช้งาน', label: 'รอใช้งาน' },
  { key: 'รอตัดจำหน่าย', label: 'รอตัดจำหน่าย' },
  { key: 'ชำรุด', label: 'ชำรุด' },
  { key: 'รอซ่อม', label: 'รอซ่อม' },
  { key: 'ระหว่างการปรับปรุง', label: 'ระหว่างการปรับปรุง' },
  { key: 'ไม่มีความจำเป็นต้องใช้', label: 'ไม่มีความจำเป็นต้องใช้' },
  { key: 'สูญหาย', label: 'สูญหาย' },
  { key: 'รอแลกเปลี่ยน', label: 'รอแลกเปลี่ยน' },
  { key: 'แลกเปลี่ยน', label: 'แลกเปลี่ยน' },
  { key: 'มีกรรมสิทธิ์ภายใต้สัญญาเช่า', label: 'มีกรรมสิทธิ์ภายใต้สัญญาเช่า' },
  { key: 'รอโอนย้าย', label: 'รอโอนย้าย' },
  { key: 'รอโอนกรรมสิทธิ์', label: 'รอโอนกรรมสิทธิ์' },
  { key: 'ชั่วคราว', label: 'ชั่วคราว' },
  { key: 'ขาย', label: 'ขาย' },
  { key: 'แปรสภาพ', label: 'แปรสภาพ' },
  { key: 'ทำลาย', label: 'ทำลาย' },
  { key: 'สอบข้อเท็จจริง', label: 'สอบข้อเท็จจริง' },
  { key: 'เงินชดเชยที่ดินและอาสิน', label: 'เงินชดเชยที่ดินและอาสิน' },
  { key: 'ระหว่างทาง', label: 'ระหว่างทาง' },
];
const statusLabels: Record<string, string> = Object.fromEntries(statusTabs.map(s => [s.key, s.label]));
const statusColors: Record<string, string> = Object.fromEntries(statusTabs.map(s => [s.key, '#22c55e']));
const statusOptions = statusTabs.filter(s => s.key !== 'all').map(s => ({ value: s.key, label: s.label }));

// ฟังก์ชัน highlightText
function highlightText(text: string, keyword: string) {
  if (!keyword) return text;
  const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.split(regex).map((part, i) =>
    part.toLowerCase() === keyword.toLowerCase() ? <mark key={i} style={{ background: '#ffe066', color: '#222', padding: 0 }}>{part}</mark> : part
  );
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
}

// เพิ่ม dropdown menu component ภายในไฟล์นี้ (minimal inline)
function ThreeDotsMenu({ onHistory }: { onHistory: () => void }) {
  const [open, setOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);
  return (
    <div style={{ position: 'relative', display: 'inline-block', marginLeft: 12 }} ref={menuRef}>
      <button
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4 }}
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        aria-label="More actions"
      >
        <AiOutlineEye size={20} />
      </button>
      {open && (
        <div style={{ position: 'fixed', right: 32, top: (window.event && (window.event as MouseEvent).clientY) ? (window.event as MouseEvent).clientY : 28, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.18)', zIndex: 9999, minWidth: 110, padding: 0 }}>
          <div
            style={{ padding: '6px 10px', cursor: 'pointer', fontWeight: 500, color: '#222', borderRadius: 8, fontSize: '0.97em' }}
            onClick={e => { e.stopPropagation(); setOpen(false); onHistory(); }}
          >
            ดูประวัติการตรวจนับ
          </div>
        </div>
      )}
    </div>
  );
}

const AssetVerificationTableSuperAdmin: React.FC<AssetVerificationTableSuperAdminProps> = ({ searchTerm = '', verificationPeriod, extraActionButton }) => {
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
    worksheet.addRow([
      'Inventory Number',
      'Name',
      'Status',
      'Note',
      'Auditor',
      'Department',
      'Date',
      'Verification Status',
    ]);
    filteredAudits.forEach((audit: PendingAudit) => {
      worksheet.addRow([
        audit.inventory_number || '',
        audit.asset_name,
        statusLabels[audit.status] || audit.status,
        audit.note,
        audit.user_name,
        audit.department_name || '',
        formatDate(audit.checked_at),
        audit.confirmed ? 'Approved' : 'Pending',
      ]);
    });
    worksheet.columns = [
      { width: 140 },
      { width: 220 },
      { width: 110 },
      { width: 120 },
      { width: 120 },
      { width: 180 },
      { width: 120 },
      { width: 150 },
    ];
    worksheet.eachRow((row: any, rowNumber: number) => {
      row.eachCell((cell: any, colNumber: number) => {
        if (colNumber === 1 && rowNumber > 1) {
          cell.value = String(cell.value ?? '');
          cell.numFmt = '@';
        }
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
      <div style={{ padding: isMobile ? '0rem' : '2rem', backgroundColor: 'var(--card-bg)', borderRadius: '15px', boxShadow: 'var(--shadow-sm)', marginTop: isMobile ? '55px' : undefined }}>
        {isMobile ? (
          <>
            {/* Row 1: All Department */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 0.5rem 0.3rem 0.5rem', marginBottom: 8 }}>
              <select
                className={styles.filterDropdown}
                value={departmentFilter}
                onChange={e => setDepartmentFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                style={{ width: '100%', background: '#fafbfc', border: '1.5px solid #e5e7eb', borderRadius: 12, height: 44, fontSize: '1rem', color: '#222', fontWeight: 500 }}
              >
                <option value="all">All Departments</option>
                {departments.map(dep => (
                  <option key={dep.id} value={dep.id}>{dep.name_th}</option>
                ))}
              </select>
            </div>
            {/* Row 2: Calendar, Status, Export */}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0 0.5rem', marginBottom: 8, position: 'relative' }}>
              <button
                style={{ background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 10, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                onClick={() => setShowPicker(v => !v)}
                type="button"
              >
                <AiOutlineCalendar style={{ fontSize: '1.3rem', color: '#222' }} />
              </button>
              {showPicker && (
                <div style={{ position: 'absolute', zIndex: 20, top: 50, left: 0, right: 0, background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 12 }}>
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
              <select
                className={styles.filterDropdown}
                value={verificationFilter}
                onChange={e => setVerificationFilter(e.target.value as 'all' | 'pending' | 'approved')}
                style={{ flex: 1, background: '#fafbfc', border: '1.5px solid #e5e7eb', borderRadius: 10, height: 44, fontSize: '1rem', color: '#222', fontWeight: 500 }}
              >
                <option value="all">ทั้งหมด</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
              </select>
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
                          fontSize: '1.08rem',
                          cursor: 'pointer',
                          marginLeft: 8,
                          maxWidth: 140,
                          height: 44,
                          lineHeight: 1.1,
                          boxShadow: 'var(--shadow-md)',
                          transition: 'background 0.2s',
                          ...(extraActionButton.props && (extraActionButton.props as any).style),
                        },
                        onMouseOver: (e: any) => e.currentTarget.style.background = 'linear-gradient(90deg, #3576E6 0%, #4FC3F7 100%)',
                        onMouseOut: (e: any) => e.currentTarget.style.background = 'linear-gradient(90deg, #4F8CFF 0%, #6BD6FF 100%)',
                      }
                    )
                  : extraActionButton
              }
            </div>
            {/* Row 3: search box */}
            <div style={{padding: '0 0.5rem 0.5rem 0.5rem'}}>
              <input
                type="text"
                placeholder="Search..."
                className={styles.mobileSearchInput}
                value={searchTerm}
                style={{width: '100%', borderRadius: 10, border: '1.5px solid #e5e7eb', height: 44, fontSize: '1rem', background: '#fff', color: '#222', marginTop: 0, marginBottom: 0}}
              />
            </div>
            {/* Card view */}
            <div className={styles.assetCardList}>
              {paginatedAudits.map(audit => (
                <div className={styles.assetCard} key={audit.id} onClick={async () => {
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
                  <img
                    src={audit.image_url || '/file.svg'}
                    alt={audit.asset_name}
                    className={styles.assetCardImage}
                    onError={e => { (e.target as HTMLImageElement).src = '/file.svg'; }}
                  />
                  <div className={styles.assetCardContent}>
                    <div className={styles.assetCardTitle}>{highlightText(audit.asset_name || '', searchTerm)}</div>
                    <div className={styles.assetCardMetaRow}><b>Inventory:</b> {highlightText(audit.inventory_number || '', searchTerm)}</div>
                    <div className={styles.assetCardMetaRow}><b>Status:</b> <span className={styles.statusBadge} style={{ background: (statusOptions.find(opt => opt.value === audit.status)?.color) || '#adb5bd', color: '#fff' }}>{highlightText(statusLabels[audit.status] || audit.status, searchTerm)}</span></div>
                    <div className={styles.assetCardMetaRow}><b>Note:</b> {highlightText(audit.note || '-', searchTerm)}</div>
                    <div className={styles.assetCardMetaRow}><b>Auditor:</b> {highlightText(audit.user_name || '-', searchTerm)}</div>
                    <div className={styles.assetCardMetaRow}><b>Department:</b> {highlightText(audit.department_name || '-', searchTerm)}</div>
                    <div className={styles.assetCardMetaRow}><b>Date:</b> {highlightText(formatDate(audit.checked_at) || '-', searchTerm)}</div>
                    <div className={styles.assetCardMetaRow}><b>Verification:</b> <span style={{ background: audit.confirmed ? '#22c55e' : '#facc15', color: '#fff', borderRadius: 8, padding: '0.2em 0.8em', fontWeight: 500, fontSize: '0.95em' }}>{highlightText((audit.confirmed ? 'Approved' : 'Pending'), searchTerm)}</span></div>
                    <div className={styles.assetCardMetaRow} style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                      <ThreeDotsMenu onHistory={() => { setPopupAssetId(audit.asset_id); setShowPopup(true); }} />
                    </div>
                    {(verificationFilter !== 'approved') && !audit.confirmed && (
                      <div style={{ marginTop: 8 }}>
                        <input
                          type="checkbox"
                          checked={selected.includes(audit.id)}
                          onChange={() => toggleSelect(audit.id)}
                          style={{ marginRight: 8 }}
                        /> Select
                      </div>
                    )}
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
          </>
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
                      <option value="all">ทั้งหมด</option>
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
                  <div style={{ position: 'absolute', zIndex: 20, top: 50, left: 0, right: 0, background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 12 }}>
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
                  <th style={{ width: 70 }}>Image</th>
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
                  <tr key={audit.id} onClick={async () => {
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
                        src={audit.image_url || '/file.svg'}
                        alt={audit.asset_name}
                        width={60}
                        height={60}
                        style={{ objectFit: 'cover', borderRadius: 8 }}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/file.svg';
                        }}
                      />
                    </td>
                    <td>{highlightText(audit.inventory_number || '', searchTerm)}</td>
                    <td>{highlightText(audit.asset_name || '', searchTerm)}</td>
                    <td>
                      <span className={styles.statusBadge} style={{ background: (statusOptions.find(opt => opt.value === audit.status)?.color) || '#adb5bd', color: '#fff' }}>
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
                        <span style={{ background: audit.confirmed ? '#22c55e' : '#facc15', color: '#fff', borderRadius: 8, padding: '0.2em 0.8em', fontWeight: 500, fontSize: '0.95em', display: 'inline-block' }}>
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
          </>
        )}
      </div>
    </>
  );
};

export default AssetVerificationTableSuperAdmin; 