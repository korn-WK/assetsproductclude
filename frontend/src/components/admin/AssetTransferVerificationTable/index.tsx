import React, { useEffect, useState } from 'react';
import styles from '../../user/AssetsTable/AssetsTable.module.css';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { DateRange } from 'react-date-range';
import { format, parse, isAfter, isBefore, isEqual } from 'date-fns';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { AiOutlineDown, AiOutlineDownload, AiOutlineCalendar } from 'react-icons/ai';
import { useAuth } from '../../../contexts/AuthContext';
import Swal from 'sweetalert2';
import AssetAuditHistoryPopup from '../../common/AssetAuditHistoryPopup';
import Pagination from '../../common/Pagination';
import DepartmentSelector from '../../common/DepartmentSelector';
import { useDropdown } from '../../../contexts/DropdownContext';
import AssetDetailPopup from '../../common/AssetDetailPopup';

const statusColors: Record<string, string> = {
  pending: '#facc15',
  approved: '#22c55e',
  rejected: '#ef4444',
};
const statusLabels: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

const VIEW_MODES = [
  { key: 'in', label: 'Transfer In' },
  { key: 'out', label: 'Transfer Out' },
];

const rowsPerPage = 5;

interface AssetTransfer {
  id: number;
  asset_id: number;
  asset_name?: string;
  image_url?: string | null;
  from_department_id?: number;
  from_department_name?: string;
  to_department_id?: number;
  to_department_name?: string;
  status: string;
  requested_by?: number | string;
  requested_by_name?: string;
  requested_at?: string;
}

interface AssetTransferVerificationTableProps {
  isSuperAdmin?: boolean;
  departmentFilter?: number | 'all';
  onDepartmentChange?: (value: number | 'all') => void;
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

const AssetTransferVerificationTable: React.FC<AssetTransferVerificationTableProps> = ({ isSuperAdmin = false, departmentFilter = 'all', onDepartmentChange }) => {
  const { user } = useAuth();
  const [tab, setTab] = useState('all');
  const [viewMode, setViewMode] = useState<'in' | 'out'>('in');
  const [transfers, setTransfers] = useState<AssetTransfer[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [range, setRange] = useState([
    { startDate: undefined, endDate: undefined, key: 'selection' },
  ]);
  const [showPicker, setShowPicker] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetTransfer | null>(null);
  const [showHistoryPopup, setShowHistoryPopup] = useState(false);
  const [transferLogs, setTransferLogs] = useState([]);
  // เพิ่ม state สำหรับ from department (ลบ toDepartment)
  const [fromDepartment, setFromDepartment] = useState<'all' | number>('all');
  const { departments, loading: dropdownLoading } = useDropdown();
  const [isMobile, setIsMobile] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  // เพิ่ม state สำหรับการเลือกหลายรายการ
  const [selected, setSelected] = useState<number[]>([]);
  // --- เพิ่ม state สำหรับ asset detail ---
  const [assetDetail, setAssetDetail] = useState<any>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 600);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchTransfers = () => {
    setLoading(true);
    let url = '/api/asset-transfers';
    const params: string[] = [];
    if (tab !== 'all') params.push(`status=${tab}`);
    if (isSuperAdmin && departmentFilter !== 'all') params.push(`department_id=${departmentFilter}`);
    if (!isSuperAdmin) {
      const forVerification = viewMode === 'in' ? '1' : 'history';
      params.push(`forVerification=${forVerification}`);
    }
    if (params.length > 0) url += '?' + params.join('&');
    fetch(url, { credentials: 'include' })
      .then(res => res.json())
      .then(data => setTransfers(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTransfers();
    // eslint-disable-next-line
  }, [tab, viewMode, isSuperAdmin, departmentFilter]);

  // Filter by date range + from department + search
  const filteredTransfers = transfers.filter(t => {
    // filter by date
    const startDate = range[0].startDate;
    const endDate = range[0].endDate;
    let dateOk = true;
    if (startDate && endDate) {
      const reqDate = t.requested_at ? parse(t.requested_at, 'yyyy-MM-dd HH:mm:ss', new Date()) : undefined;
      const start = new Date(startDate); start.setHours(0,0,0,0);
      const end = new Date(endDate); end.setHours(23,59,59,999);
      dateOk = !!reqDate && (isAfter(reqDate, start) || isEqual(reqDate, start)) && (isBefore(reqDate, end) || isEqual(reqDate, end));
    }
    // filter by from department (เฉพาะ superadmin)
    let fromOk = true;
    if (isSuperAdmin) {
      fromOk = fromDepartment === 'all' || t.from_department_id === fromDepartment;
    }
    // filter by search term เฉพาะคอลัมน์ที่ต้องการ
    const q = searchTerm.toLowerCase();
    let searchOk = true;
    if (q) {
      searchOk = (
        (typeof t.asset_name === 'string' ? t.asset_name : String(t.asset_id)).toLowerCase().includes(q) ||
        (typeof t.from_department_name === 'string' ? t.from_department_name : String(t.from_department_id ?? '')).toLowerCase().includes(q) ||
        (typeof t.to_department_name === 'string' ? t.to_department_name : String(t.to_department_id ?? '')).toLowerCase().includes(q) ||
        (statusLabels[t.status] || t.status).toLowerCase().includes(q) ||
        (t.requested_by_name ? t.requested_by_name : (typeof t.requested_by === 'string' ? t.requested_by : t.requested_by?.toString() || '')).toLowerCase().includes(q) ||
        (t.requested_at || '').toLowerCase().includes(q)
      );
    }
    return dateOk && fromOk && searchOk;
  });

  // Pagination
  const totalPages = Math.ceil(filteredTransfers.length / rowsPerPage);
  const paginatedTransfers = filteredTransfers.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage) as AssetTransfer[];

  useEffect(() => { setCurrentPage(1); }, [tab, transfers, range]);

  const handleApprove = async (id: number) => {
    const result = await Swal.fire({
      title: 'Approve Transfer?',
      text: 'Are you sure you want to approve this asset transfer?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Approve',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
    });
    if (result.isConfirmed) {
      await fetch(`/api/asset-transfers/${id}/approve`, { method: 'PATCH', credentials: 'include' });
      fetchTransfers();
      Swal.fire('Approved!', 'The asset transfer has been approved.', 'success');
    }
  };
  const handleReject = async (id: number) => {
    const result = await Swal.fire({
      title: 'Reject Transfer?',
      text: 'Are you sure you want to reject this asset transfer?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Reject',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
    });
    if (result.isConfirmed) {
      await fetch(`/api/asset-transfers/${id}/reject`, { method: 'PATCH', credentials: 'include' });
      fetchTransfers();
      Swal.fire('Rejected!', 'The asset transfer has been rejected.', 'success');
    }
  };

  // --- MOBILE/desktop: handleAssetClick ---
  const handleAssetClick = async (asset: AssetTransfer) => {
    setSelectedAsset(asset);
    setShowHistoryPopup(true);
    setAssetDetail(null); // reset ก่อน fetch ใหม่
    try {
      const res = await fetch(`/api/assets/${asset.asset_id || asset.id}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setAssetDetail(data);
      } else {
        setAssetDetail(null);
      }
    } catch {
      setAssetDetail(null);
    }
  };

  // เพิ่มฟังก์ชัน toggleSelect/selectAll
  const toggleSelect = (id: number) => {
    setSelected(sel => sel.includes(id) ? sel.filter(i => i !== id) : [...sel, id]);
  };
  const selectAll = () => {
    const ids = paginatedTransfers.filter(t => t.status === 'pending').map(t => t.id);
    if (selected.length === ids.length) setSelected([]);
    else setSelected(ids);
  };

  // เพิ่มฟังก์ชัน approve/reject หลายรายการ
  const handleApproveSelected = async () => {
    if (selected.length === 0) return;
    const result = await Swal.fire({
      title: `Approve ${selected.length} transfers?`,
      text: 'Are you sure you want to approve the selected asset transfers?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Approve',
      cancelButtonText: 'Cancel',
      reverseButtons: false, // ปุ่ม Approve ซ้าย Cancel ขวา
    });
    if (!result.isConfirmed) return;
    await Promise.all(selected.map(id => fetch(`/api/asset-transfers/${id}/approve`, { method: 'PATCH', credentials: 'include' })));
    fetchTransfers();
    setSelected([]);
    Swal.fire('Approved!', 'Selected asset transfers have been approved.', 'success');
  };
  const handleRejectSelected = async () => {
    if (selected.length === 0) return;
    const result = await Swal.fire({
      title: `Reject ${selected.length} transfers?`,
      text: 'Are you sure you want to reject the selected asset transfers?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Reject',
      cancelButtonText: 'Cancel',
      reverseButtons: false, // ปุ่ม Reject ซ้าย Cancel ขวา
    });
    if (!result.isConfirmed) return;
    await Promise.all(selected.map(id => fetch(`/api/asset-transfers/${id}/reject`, { method: 'PATCH', credentials: 'include' })));
    fetchTransfers();
    setSelected([]);
    Swal.fire('Rejected!', 'Selected asset transfers have been rejected.', 'success');
  };

  // Export XLSX logic (reuse from ReportAssetsTable)
  const handleExportXLSX = async () => {
    if (!filteredTransfers || filteredTransfers.length === 0) return;
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Asset Transfers');
    worksheet.addRow([
      'Asset', 'From Department', 'To Department', 'Status', 'Requested By', 'Requested At'
    ]);
    filteredTransfers.forEach(t => {
      worksheet.addRow([
        t.asset_name || t.asset_id,
        t.from_department_name || t.from_department_id,
        t.to_department_name || t.to_department_id,
        statusLabels[t.status] || t.status,
        t.requested_by_name || t.requested_by,
        t.requested_at,
      ]);
    });
    worksheet.columns.forEach((column, i) => {
      let maxLength = 10;
      column.eachCell?.({ includeEmpty: true }, (cell) => {
        const cellValue = cell.value ? cell.value.toString() : '';
        maxLength = Math.max(maxLength, cellValue.length + 2);
      });
      column.width = maxLength;
    });
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
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
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'asset_transfers.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {isMobile ? (
        <>
          {/* Row 1: All Department */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '0 0.5rem 0.3rem 0.5rem', marginBottom: 8, marginTop: 40 }}>
            <select
              className={styles.filterDropdown}
              value={fromDepartment}
              onChange={e => setFromDepartment(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              style={{ width: '100%', background: '#fafbfc', border: '1.5px solid #e5e7eb', borderRadius: 12, height: 44, fontSize: '1rem', color: '#222', fontWeight: 500 }}
            >
              <option value="all">All Departments</option>
              {departments.map(dep => (
                <option key={dep.id} value={dep.id}>{dep.name_th}</option>
              ))}
            </select>
          </div>
          {/* Row 2: Status, Calendar, Export */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0 0.5rem', marginBottom: 8, position: 'relative' }}>
            <select
              className={styles.filterDropdown}
              value={tab}
              onChange={e => setTab(e.target.value)}
              style={{ flex: 1, background: '#fafbfc', border: '1.5px solid #e5e7eb', borderRadius: 10, height: 44, fontSize: '1rem', color: '#222', fontWeight: 500 }}
            >
              {TABS.map(t => (
                <option key={t.key} value={t.key}>{t.label}</option>
              ))}
            </select>
            <button
              style={{ background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 10, width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
              onClick={() => setShowPicker(v => !v)}
              type="button"
            >
              <AiOutlineCalendar style={{ fontSize: '1.3rem', color: '#222' }} />
            </button>
            {showPicker && (
              <div style={{ position: 'absolute', zIndex: 20, top: 50,  right: 0, background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 12 }}>
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
            <button className={styles.exportXlsxButtonSmall} style={{ background: 'linear-gradient(135deg, #5768D2 0%, #EB9CED 100%)', color: '#fff', border: 'none', borderRadius: 10, padding: '0.5rem 1.2rem', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, height: 44, boxShadow: 'var(--shadow-md)' }} onClick={handleExportXLSX}>
              <AiOutlineDownload style={{ fontSize: '1.3em' }} />
              Export
            </button>
          </div>
          {/* Row 3: search box */}
          <div style={{padding: '0 0.5rem 0.5rem 0.5rem'}}>
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{width: '100%', borderRadius: 10, border: '1.5px solid #e5e7eb', height: 44, fontSize: '1rem', background: '#fff', color: '#222', marginTop: 0, marginBottom: 0}}
            />
          </div>
          {/* Card view */}
          <div className={styles.assetCardList}>
            {paginatedTransfers.map(t => (
              <div className={styles.assetCard} key={t.id} onClick={() => handleAssetClick(t)} style={{ cursor: 'pointer' }}>
                <img
                  src={t.image_url || '/file.svg'}
                  alt={typeof t.asset_name === 'string' ? t.asset_name : String(t.asset_id)}
                  className={styles.assetCardImage}
                  onError={e => { (e.target as HTMLImageElement).src = '/file.svg'; }}
                />
                <div className={styles.assetCardContent}>
                  <div className={styles.assetCardTitle}>{highlightText(typeof t.asset_name === 'string' ? t.asset_name : String(t.asset_id), searchTerm)}</div>
                  <div className={styles.assetCardMetaRow}><b>From:</b> {highlightText(typeof t.from_department_name === 'string' ? t.from_department_name : String(t.from_department_id ?? ''), searchTerm)}</div>
                  <div className={styles.assetCardMetaRow}><b>To:</b> {highlightText(typeof t.to_department_name === 'string' ? t.to_department_name : String(t.to_department_id ?? ''), searchTerm)}</div>
                  <div className={styles.assetCardMetaRow}>
                    <b>Status:</b> <span className={
                      `${styles.statusBadge} ` +
                      (t.status === 'approved' ? styles.statusApproved : t.status === 'rejected' ? styles.statusRejected : t.status === 'pending' ? styles.statusPending : '')
                    }>
                      {highlightText(statusLabels[t.status] || t.status, searchTerm)}
                    </span>
                  </div>
                  <div className={styles.assetCardMetaRow}><b>Requested By:</b> {highlightText(t.requested_by_name ? t.requested_by_name : (typeof t.requested_by === 'string' ? t.requested_by : t.requested_by?.toString() || ''), searchTerm)}</div>
                  <div className={styles.assetCardMetaRow}><b>Requested At:</b> {highlightText(t.requested_at || '', searchTerm)}</div>
                  {/* ปุ่ม approve/reject (mobile) */}
                  {t.status === 'pending' && (
                    <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                      <button
                        className={styles.actionButton}
                        style={{ background: '#22c55e', color: '#fff', flex: 1 }}
                        onClick={e => { e.stopPropagation(); handleApprove(t.id); }}
                      >
                        Approve
                      </button>
                      <button
                        className={styles.actionButton}
                        style={{ background: '#ef4444', color: '#fff', flex: 1 }}
                        onClick={e => { e.stopPropagation(); handleReject(t.id); }}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                  {/* เพิ่ม checkbox สำหรับแต่ละรายการ (mobile) */}
                  {t.status === 'pending' && (
                    <div style={{ marginTop: 8 }}>
                      <input
                        type="checkbox"
                        checked={selected.includes(t.id)}
                        onChange={e => { e.stopPropagation(); toggleSelect(t.id); }}
                        style={{ marginRight: 8 }}
                      /> Select
                    </div>
                  )}
                </div>
              </div>
            ))}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </div>
          {/* ปุ่ม Approve/Reject หลายรายการ (mobile) */}
          <div style={{ margin: '16px 0', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              className={styles.actionButton}
              disabled={selected.length === 0}
              onClick={handleApproveSelected}
              style={{ background: '#22c55e', color: '#fff' }}
            >
              Approve Selected
            </button>
            <button
              className={styles.actionButton}
              disabled={selected.length === 0}
              onClick={handleRejectSelected}
              style={{ background: '#ef4444', color: '#fff' }}
            >
              Reject Selected
            </button>
          </div>
        </>
      ) : (
        <div className={styles.assetsTableContainer}>
          <div className={styles.assetsControls} style={{ marginBottom: 16, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              {!isSuperAdmin && VIEW_MODES.map(vm => (
                <button
                  key={vm.key}
                  className={styles.filterButton + (viewMode === vm.key ? ' ' + styles.active : '')}
                  onClick={() => setViewMode(vm.key as 'in' | 'out')}
                  style={{ height: 44, minWidth: 110 }}
                >
                  {vm.label}
                </button>
              ))}
              {/* Status filter: superadmin = ปุ่ม, user = dropdown */}
              {isSuperAdmin && (
                <>
                  <div className={styles.dropdownWrapper}>
                    <select
                      className={styles.departmentDropdown}
                      value={tab}
                      onChange={e => setTab(e.target.value)}
                    >
                      {TABS.map(t => (
                        <option key={t.key} value={t.key}>{t.label}</option>
                      ))}
                    </select>
                    <span className={styles.caretIcon}><AiOutlineDown /></span>
                  </div>
                  <div className={styles.dropdownWrapper}>
                    <select
                      className={styles.departmentDropdown}
                      value={fromDepartment}
                      onChange={e => setFromDepartment(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                    >
                      <option value="all">All Departments</option>
                      {departments.map(dep => (
                        <option key={dep.id} value={dep.id}>{dep.name_th}</option>
                      ))}
                    </select>
                    <span className={styles.caretIcon}><AiOutlineDown /></span>
                  </div>
                </>
              )}
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', position: 'relative' }}>
              <button className={styles.iconButton} onClick={() => setShowPicker(v => !v)}>
                <AiOutlineCalendar />
              </button>
              {showPicker && (
                <div style={{
                  position: 'absolute',
                  zIndex: 20,
                  top: '110%',
                  right: 20,
                  border: '1.5px solid #e5e7eb',
                  background: '#fff',
                }}>
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
                  <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0.8rem 0.8rem', background: '#ffffff' }}>
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
              <button className={styles.exportPdfButton} onClick={handleExportXLSX} style={{
                marginLeft: 8,
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
              }}>
                <AiOutlineDownload style={{ fontSize: '1.3em' }} />
                Export XLSX
              </button>
            </div>
          </div>
          <table className={styles.assetsTable}>
            <thead>
              <tr>
                {/* เพิ่ม checkbox select all (desktop) */}
                <th style={{ width: 30 }}>
                  <input
                    type="checkbox"
                    checked={paginatedTransfers.filter(t => t.status === 'pending').length > 0 && selected.length === paginatedTransfers.filter(t => t.status === 'pending').length}
                    onChange={selectAll}
                  />
                </th>
                <th style={{ width: 60, minWidth: 60, maxWidth: 60 }}>Image</th>
                <th style={{ width: 120 }}>Asset</th>
                <th style={{ width: 120 }}>From Department</th>
                <th style={{ width: 120 }}>To Department</th>
                <th style={{ width: 100 }}>Status</th>
                <th style={{ width: 120 }}>Requested By</th>
                <th style={{ width: 140 }}>Requested At</th>
                <th style={{ width: 120 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ textAlign: 'center' }}>Loading...</td></tr>
              ) : paginatedTransfers.length === 0 ? (
                <tr><td colSpan={9} className={styles.noResults}>No data</td></tr>
              ) : paginatedTransfers.map(t => (
                <tr key={t.id} onClick={() => handleAssetClick(t)} style={{ cursor: 'pointer' }}>
                  {/* เพิ่ม checkbox สำหรับแต่ละรายการ (desktop) */}
                  <td>
                    {t.status === 'pending' && (
                      <input
                        type="checkbox"
                        checked={selected.includes(t.id)}
                        onChange={e => { e.stopPropagation(); toggleSelect(t.id); }}
                        onClick={e => e.stopPropagation()}
                      />
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <img
                      src={t.image_url || '/file.svg'}
                      alt={typeof t.asset_name === 'string' ? t.asset_name : String(t.asset_id)}
                      width={60}
                      height={60}
                      style={{ objectFit: 'cover', borderRadius: 8 }}
                      onError={e => { e.currentTarget.src = '/file.svg'; }}
                    />
                  </td>
                  <td>{highlightText(typeof t.asset_name === 'string' ? t.asset_name : String(t.asset_id), searchTerm)}</td>
                  <td>{highlightText(typeof t.from_department_name === 'string' ? t.from_department_name : String(t.from_department_id ?? ''), searchTerm)}</td>
                  <td>{highlightText(typeof t.to_department_name === 'string' ? t.to_department_name : String(t.to_department_id ?? ''), searchTerm)}</td>
                  <td>
                    <span
                      className={styles.statusBadge}
                      style={{ background: statusColors[t.status] || '#e5e7eb', fontWeight: 600 }}
                    >
                      {highlightText(statusLabels[t.status] || t.status, searchTerm)}
                    </span>
                  </td>
                  <td>{highlightText(t.requested_by_name ? t.requested_by_name : (typeof t.requested_by === 'string' ? t.requested_by : t.requested_by?.toString() || ''), searchTerm)}</td>
                  <td>{highlightText(t.requested_at || '', searchTerm)}</td>
                  <td>
                    {/* ให้ superadmin หรือ admin ที่เกี่ยวข้อง approve/reject ได้ถ้า pending */}
                    {t.status === 'pending' && (
                      (isSuperAdmin || (user && t.to_department_id === user.department_id)) ? (
                        <div className={styles.actionButtons}>
                          <button
                            className={styles.actionButton}
                            style={{ background: '#22c55e', color: '#fff' }}
                            onClick={e => { e.stopPropagation(); handleApprove(t.id); }}
                          >
                            Approve
                          </button>
                          <button
                            className={styles.actionButton}
                            style={{ background: '#ef4444', color: '#fff', marginLeft: 8 }}
                            onClick={e => { e.stopPropagation(); handleReject(t.id); }}
                          >
                            Reject
                          </button>
                        </div>
                      ) : null
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* ปุ่ม Approve/Reject หลายรายการ (desktop) */}
          <div style={{ marginTop: 16, textAlign: 'right' }}>
            <button
              className={styles.actionButton}
              disabled={selected.length === 0}
              onClick={handleApproveSelected}
              style={{ background: '#22c55e', color: '#fff', marginRight: 8 }}
            >
              Approve Selected
            </button>
            <button
              className={styles.actionButton}
              disabled={selected.length === 0}
              onClick={handleRejectSelected}
              style={{ background: '#ef4444', color: '#fff' }}
            >
              Reject Selected
            </button>
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
          {showHistoryPopup && selectedAsset && (
            <AssetDetailPopup
              asset={assetDetail ? {
                ...assetDetail,
                // fallback: ถ้า field ไหนไม่มีใน assetDetail ให้ใช้ placeholder จาก selectedAsset
                id: String(assetDetail.id || assetDetail.asset_id || selectedAsset.asset_id || selectedAsset.id),
                asset_code: assetDetail.asset_code || '',
                inventory_number: assetDetail.inventory_number || '',
                serial_number: assetDetail.serial_number || '',
                name: assetDetail.name || selectedAsset.asset_name || '',
                description: assetDetail.description || '',
                location_id: assetDetail.location_id || '',
                location: assetDetail.location || '',
                room: assetDetail.room || '',
                department: assetDetail.department || selectedAsset.from_department_name || '',
                department_id: assetDetail.department_id || '',
                owner: assetDetail.owner || selectedAsset.requested_by_name || '',
                status: assetDetail.status || selectedAsset.status,
                image_url: assetDetail.image_url || selectedAsset.image_url || '',
                acquired_date: assetDetail.acquired_date || selectedAsset.requested_at || '',
                created_at: assetDetail.created_at || '',
                updated_at: assetDetail.updated_at || '',
              } : {
                id: String(selectedAsset.asset_id || selectedAsset.id),
                asset_code: '',
                inventory_number: '',
                serial_number: '',
                name: selectedAsset.asset_name || '',
                description: '',
                location_id: '',
                location: '',
                room: '',
                department: selectedAsset.from_department_name || '',
                department_id: '',
                owner: selectedAsset.requested_by_name || '',
                status: selectedAsset.status,
                image_url: selectedAsset.image_url || '',
                acquired_date: selectedAsset.requested_at || '',
                created_at: '',
                updated_at: '',
              }}
              isOpen={showHistoryPopup}
              onClose={() => setShowHistoryPopup(false)}
              isAdmin={false}
              isCreating={false}
            />
          )}
        </div>
      )}
    </>
  );
};

export default AssetTransferVerificationTable; 