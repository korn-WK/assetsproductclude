import React, { useEffect, useState } from 'react';
import styles from '../AssetsTable/AssetsTable.module.css';
import { formatDate } from '../../../lib/utils';
import AssetAuditHistoryPopup from '../../common/AssetAuditHistoryPopup';
import { useAuth } from '../../../contexts/AuthContext';
import Image from 'next/image';
import Pagination from '../../common/Pagination';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { AiOutlineDownload, AiOutlineCalendar } from 'react-icons/ai';
// @ts-ignore
import { DateRange } from 'react-date-range';
import { format, parse, isAfter, isBefore, isEqual } from 'date-fns';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { useStatusOptions } from '../../../lib/statusOptions';
import Swal from 'sweetalert2';
import { AiOutlineEye } from 'react-icons/ai';
import type { Asset } from '../../common/AssetDetailPopup';
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
  confirmed?: number; // เพิ่ม confirmed เพื่อติดตามสถานะการยืนยัน
  image_url?: string; // เพิ่ม image_url เพื่อเก็บ URL ของรูปภาพ
  inventory_number?: string; // เพิ่ม inventory_number เพื่อเก็บหมายเลขสินค้า
  department_name?: string; // เพิ่ม department_name เพื่อเก็บชื่อแผนก
}

interface AssetVerificationTableProps {
  searchTerm?: string;
}
function highlightText(text: string, keyword: string) {
  if (!keyword) return text;
  const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.split(regex).map((part, i) =>
    part.toLowerCase() === keyword.toLowerCase() ? <mark key={i} style={{ background: '#ffe066', color: '#222', padding: 0 }}>{part}</mark> : part
  );
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
// ฟังก์ชันแปลง PendingAudit -> Asset
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
const AssetVerificationTable: React.FC<AssetVerificationTableProps> = ({ searchTerm }) => {
  const [pendingAudits, setPendingAudits] = useState<PendingAudit[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [showPopup, setShowPopup] = useState(false);
  const [popupAssetId, setPopupAssetId] = useState<number | null>(null);
  const { user } = useAuth();
  const [verificationFilter, setVerificationFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const filterTabs = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
  ];
  const [currentPage, setCurrentPage] = React.useState(1);
  const rowsPerPage = 5;
  const [range, setRange] = useState<[{ startDate?: Date; endDate?: Date; key: string }]>([
    {
      startDate: undefined,
      endDate: undefined,
      key: 'selection',
    },
  ]);
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState(searchTerm || '');
  const [departments, setDepartments] = useState<{ id: number, name_th: string }[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState<'all' | number>('all');
  const [isMobile, setIsMobile] = useState(false);
  const [showDetailPopup, setShowDetailPopup] = useState(false);
  const [detailAsset, setDetailAsset] = useState<Asset | null>(null);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 600);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  useEffect(() => {
    fetch('/api/assets/departments')
      .then(res => res.json())
      .then(data => setDepartments(data));
  }, []);

  const { options: statusOptions, loading: statusLoading } = useStatusOptions();
  const statusLabels = Object.fromEntries(statusOptions.map(opt => [opt.value, opt.label]));

  useEffect(() => {
    fetch('/api/assets/audits/list')
      .then(res => res.json())
      .then(data => setPendingAudits(data))
      .catch(() => setPendingAudits([]));
  }, []);

  // Filter audits by date range (using react-date-range)
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
    // Search filter
    const q = (typeof search === 'string' ? search : '').trim().toLowerCase();
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

  // Reset to first page when filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [verificationFilter, pendingAudits]);

  const auditsByDepartment = departmentFilter === 'all'
    ? filteredAudits
    : filteredAudits.filter(a => a.department_name && departments.find(d => d.id === departmentFilter && d.name_th === a.department_name));
  const paginatedAudits = auditsByDepartment.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  const totalPages = Math.ceil(auditsByDepartment.length / rowsPerPage);

  const toggleSelect = (id: number) => {
    setSelected(sel => sel.includes(id) ? sel.filter(i => i !== id) : [...sel, id]);
  };

  const selectAll = () => {
    // เลือกเฉพาะ pending เท่านั้น
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
    // อัปเดตสถานะใน state เป็น approved แทนการลบแถว
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

  const handleExport = () => {
    if (filteredAudits.length === 0) return;
    const rows = filteredAudits.map(audit => ({
      'Inventory Number': `\t${audit.inventory_number || ''}`,
      'Name': audit.asset_name,
      'Status': statusLabels[audit.status] || audit.status,
      'Note': audit.note,
      'Auditor': audit.user_name,
      'Date': formatDate(audit.checked_at),
      'Verification Status': audit.confirmed ? 'Approved' : 'Pending',
    }));
    const csv = [
      Object.keys(rows[0]).join(','),
      ...rows.map(row => Object.values(row).map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');
    // Add UTF-8 BOM to fix Thai/Unicode in Excel
    const csvWithBom = '\uFEFF' + csv;
    const blob = new Blob([csvWithBom], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'asset_verification.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportXLSX = async () => {
    if (filteredAudits.length === 0) return;
    const rows = filteredAudits.map(audit => ([
      audit.inventory_number || '',
      audit.asset_name,
      statusLabels[audit.status] || audit.status,
      audit.note,
      audit.user_name,
      audit.department_name || '',
      formatDate(audit.checked_at),
      audit.confirmed ? 'Approved' : 'Pending',
    ]));
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Asset Verification');
    // Add header
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
    // Add data rows, ensure all cells exist (even if empty)
    rows.forEach(row => {
      // Ensure row has 7 elements
      const fullRow = [
        row[0] || '',
        row[1] || '',
        row[2] || '',
        row[3] || '',
        row[4] || '',
        row[5] || '',
        row[6] || '',
        row[7] || '',
      ];
      worksheet.addRow(fullRow);
    });
    // Set column widths
    worksheet.columns = [
      { width: 24 }, // Inventory Number
      { width: 30 }, // Name
      { width: 12 }, // Status
      { width: 18 }, // Note
      { width: 18 }, // Auditor
      { width: 18 }, // Department
      { width: 18 }, // Date
      { width: 20 }, // Verification Status
    ];
    // Auto width columns
    worksheet.columns.forEach((column) => {
      let maxLength = 10;
      if (typeof column.eachCell === 'function') {
        column.eachCell({ includeEmpty: true }, (cell: any) => {
          const cellValue = cell.value ? cell.value.toString() : '';
          maxLength = Math.max(maxLength, cellValue.length + 2);
        });
      }
      column.width = maxLength;
    });
    // Center align and add border to all cells, force Inventory Number as text
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        // Inventory Number column (col 1): force as text (except header)
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
    // Download file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'asset_verification.xlsx';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const popupAsset = pendingAudits.find(a => a.asset_id === popupAssetId);

  return (
    <>
      {isMobile ? (
        <div style={{  backgroundColor: 'var(--card-bg)', borderRadius: '15px', boxShadow: 'var(--shadow-sm)' }}>
          {/* Row 1: Department dropdown */}
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
            <button className={styles.exportXlsxButtonSmall} style={{ color: '#fff', border: 'none', borderRadius: 10, padding: '0.5rem 1.2rem', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, height: 44, boxShadow: 'var(--shadow-md)' }} onClick={handleExportXLSX}>
              <AiOutlineDownload style={{ fontSize: '1.3em' }} />
              Export
            </button>
          </div>
          {/* Row 3: search box */}
          <div style={{padding: '0 0.5rem 0.5rem 0.5rem'}}>
            <input
              type="text"
              placeholder="Search..."
              className={styles.mobileSearchInput}
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{width: '100%', borderRadius: 10, border: '1.5px solid #e5e7eb', height: 44, fontSize: '1rem', background: '#fff', color: '#222', marginTop: 0, marginBottom: 0}}
            />
          </div>
          {/* Card view */}
          <div className={styles.assetCardList}>
            {paginatedAudits.map(audit => (
              <div className={styles.assetCard} key={audit.id} onClick={() => {
                if (user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'superadmin') {
                  setDetailAsset(mapPendingAuditToAsset(audit));
                  setShowDetailPopup(true);
                }
              }}>
                <img
                  src={audit.image_url || '/file.svg'}
                  alt={audit.asset_name}
                  className={styles.assetCardImage}
                  onError={e => { (e.target as HTMLImageElement).src = '/file.svg'; }}
                />
                <div className={styles.assetCardContent}>
                  <div className={styles.assetCardTitle}>{highlightText(audit.asset_name || '', search || '')}</div>
                  <div className={styles.assetCardMetaRow}><b>Inventory:</b> {highlightText(audit.inventory_number || '', search || '')}</div>
                  <div className={styles.assetCardMetaRow}><b>Status:</b> <span className={styles.statusBadge} style={{ background: (statusOptions.find(opt => opt.value === audit.status)?.color) || '#adb5bd', color: '#fff' }}>{highlightText(statusLabels[audit.status] || audit.status, search || '')}</span></div>
                  <div className={styles.assetCardMetaRow}><b>Note:</b> {highlightText(audit.note || '-', search || '')}</div>
                  <div className={styles.assetCardMetaRow}><b>Auditor:</b> {highlightText(audit.user_name || '-', search || '')}</div>
                  <div className={styles.assetCardMetaRow}><b>Department:</b> {highlightText(audit.department_name || '-', search || '')}</div>
                  <div className={styles.assetCardMetaRow}><b>Date:</b> {highlightText(formatDate(audit.checked_at) || '-', search || '')}</div>
                  <div className={styles.assetCardMetaRow}><b>Verification:</b> <span style={{ background: audit.confirmed ? '#22c55e' : '#facc15', color: '#fff', borderRadius: 8, padding: '0.2em 0.8em', fontWeight: 500, fontSize: '0.95em' }}>{highlightText((audit.confirmed ? 'Approved' : 'Pending'), search || '')}</span></div>
                  <div className={styles.assetCardMetaRow} style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                    <ThreeDotsMenu onHistory={() => { setPopupAssetId(audit.asset_id); setShowPopup(true); }} />
                  </div>
                  {(verificationFilter !== 'approved') && !audit.confirmed && (
                    <div style={{ marginTop: 8 }}>
                      <input
                        type="checkbox"
                        checked={selected.includes(audit.id)}
                        onChange={e => { e.stopPropagation(); toggleSelect(audit.id); }}
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
        </div>
      ) : (
        <>
          {/* --- DESKTOP filter row --- */}
          <div className={styles.assetsControls} style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'nowrap' }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <div className={styles.dropdownWrapper}>
                <select
                  className={styles.departmentDropdown}
                  value={verificationFilter}
                  onChange={e => setVerificationFilter(e.target.value as 'all' | 'pending' | 'approved')}
                >
                  <option value="all">ทั้งหมด</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                </select>
              </div>
              <div className={styles.dropdownWrapper}>
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
              </div>
            </div>
            {/* Right: date picker + export */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
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
                    height: '51px', // << เพิ่มบรรทัดนี้
                    width:'55px',
                    boxShadow: 'none',
                    cursor: 'pointer',
                    transition: 'border 0.2s',
                    outline: showPicker ? '2px solid #11998e' : 'none',
                  }}
                  title="เลือกช่วงวันที่"
                >
                  <AiOutlineCalendar style={{ fontSize: '1.35em', color: '#222' }} />
                </button>
                {range[0].startDate && range[0].endDate && (
                  <span style={{ marginLeft: 8, fontWeight: 500, color: '#11998e', fontSize: '1.05em' }}>
                    {`${format(range[0].startDate, 'dd MMM yy')} - ${format(range[0].endDate, 'dd MMM yy')}`}
                  </span>
                )}
                {showPicker && (
                  <div style={{ position: 'absolute', zIndex: 20, top: '110%', left: 0 ,border: '1.5px solid #e5e7eb'}}>
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
                    <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0.8rem 0.8rem',background: '#ffffff',}}>
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
              </div>
              <button className={styles.exportPdfButton} onClick={handleExportXLSX} style={{ marginLeft: 8 }}>
                <AiOutlineDownload style={{ fontSize: '1.3em' }} />
                Export XLSX
              </button>
            </div>
          </div>
          {/* Table: let columns auto-fit content */}
          <table className={styles.assetsTable} style={{ tableLayout: 'fixed', width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: 30 }}>
                  {/* Checkbox เฉพาะถ้า filter เป็น pending หรือ all */}
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
                <th style={{ width: 120 }}>Status</th>
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
                <tr key={audit.id} onClick={() => {
                  if (user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'superadmin') {
                    setDetailAsset(mapPendingAuditToAsset(audit));
                    setShowDetailPopup(true);
                  }
                }}>
                  <td>
                    {/* แสดง checkbox เฉพาะถ้ายังไม่ approved */}
                    {!audit.confirmed && (
                      <input
                        type="checkbox"
                        checked={selected.includes(audit.id)}
                        onChange={() => toggleSelect(audit.id)}
                        onClick={e => e.stopPropagation()} // ป้องกันเปิด popup เมื่อคลิก checkbox
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
                  <td>{highlightText(audit.inventory_number || '', search || '')}</td>
                  <td>{highlightText(audit.asset_name || '', search || '')}</td>
                  <td>
                    <span style={{
                      background: (statusOptions.find(opt => opt.value === audit.status)?.color) || '#adb5bd',
                      color: '#fff',
                      borderRadius: 8,
                      padding: '0.2em 0.8em',
                      fontWeight: 500,
                      fontSize: '0.95em'
                    }}>
                      {highlightText(statusLabels[audit.status] || audit.status, search || '')}
                    </span>
                  </td>
                  <td>{highlightText(audit.note || '', search || '')}</td>
                  <td>{highlightText(audit.user_name || '', search || '')}</td>
                  <td>{highlightText(audit.department_name || '', search || '')}</td>
                  <td>{highlightText(formatDate(audit.checked_at) || '', search || '')}</td>
                  <td
                    style={{ textAlign: 'center', verticalAlign: 'middle', height: 48 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                      <span style={{ background: audit.confirmed ? '#22c55e' : '#facc15', color: '#fff', borderRadius: 8, padding: '0.2em 0.8em', fontWeight: 500, fontSize: '0.95em', display: 'inline-block' }}>
                        {highlightText(audit.confirmed ? 'Approved' : 'Pending', search || '')}
                      </span>
                    </div>
                  </td>
                  <td style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <ThreeDotsMenu onHistory={() => { setPopupAssetId(audit.asset_id); setShowPopup(true); }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Confirm button above pagination */}
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
        </>
      )}
      {showPopup && popupAssetId && (
        <AssetAuditHistoryPopup
          assetId={popupAssetId}
          open={showPopup}
          onClose={() => setShowPopup(false)}
        />
      )}
      {showDetailPopup && detailAsset && (
        <AssetDetailPopup
          asset={detailAsset}
          isOpen={showDetailPopup}
          onClose={() => setShowDetailPopup(false)}
          isAdmin={false}
          isCreating={false}
          showUserEdit={false}
        />
      )}
    </>
  );
};

export default AssetVerificationTable; 