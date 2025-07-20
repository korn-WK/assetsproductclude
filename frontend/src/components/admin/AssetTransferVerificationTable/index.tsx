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

  // Filter by date range + from department
  const filteredTransfers = transfers.filter(t => {
    // filter by date
    const startDate = range[0].startDate;
    const endDate = range[0].endDate;
    let dateOk = true;
    if (startDate && endDate) {
      const reqDate = t.requested_at ? parse(t.requested_at, 'yyyy-MM-dd HH:mm:ss', new Date()) : undefined;
      const start = new Date(startDate); start.setHours(0,0,0,0);
      const end = new Date(endDate); end.setHours(23,59,59,999);
      dateOk = reqDate && (isAfter(reqDate, start) || isEqual(reqDate, start)) && (isBefore(reqDate, end) || isEqual(reqDate, end));
    }
    // filter by from department (เฉพาะ superadmin)
    let fromOk = true;
    if (isSuperAdmin) {
      fromOk = fromDepartment === 'all' || t.from_department_id === fromDepartment;
    }
    return dateOk && fromOk;
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

  const handleAssetClick = async (asset: AssetTransfer) => {
    setSelectedAsset(asset);
    setShowHistoryPopup(true);
    const res = await fetch(`/api/assets/${asset.asset_id || asset.id}/transfer-logs`, { credentials: 'include' });
    const logs = await res.json();
    setTransferLogs(logs);
  };

  // Export XLSX
  const handleExportXLSX = async () => {
    if (filteredTransfers.length === 0) return;
    const rows = filteredTransfers.map(t => ([
      t.asset_name || t.asset_id,
      t.from_department_name || t.from_department_id,
      t.to_department_name || t.to_department_id,
      statusLabels[t.status] || t.status,
      t.requested_by_name || t.requested_by,
      t.requested_at,
    ]));
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Asset Transfers');
    worksheet.addRow([
      'Asset', 'From Department', 'To Department', 'Status', 'Requested By', 'Requested At'
    ]);
    rows.forEach(row => worksheet.addRow(row));
    // Auto width columns
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
    <div className={styles.assetsTableContainer}>
      <div className={styles.assetsControls} style={{ marginBottom: 16, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
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
          {isSuperAdmin ? (
            <div className={styles.statusFilters}>
              {TABS.map(t => (
                <button
                  key={t.key}
                  className={`${styles.filterButton} ${tab === t.key ? styles.active : ''}`}
                  onClick={() => setTab(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          ) : (
            <div style={{ position: 'relative', minWidth: 70 }}>
              <button
                className={styles.filterButton}
                onClick={() => setShowStatusDropdown(v => !v)}
                style={{ minWidth: 70, height: 44 }}
              >
                {TABS.find(t => t.key === tab)?.label || 'สถานะ'} <AiOutlineDown style={{ marginLeft: 4 }} />
              </button>
              {showStatusDropdown && (
                <div style={{ position: 'absolute', top: '110%', left: 0, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', zIndex: 10, minWidth: 70 }}>
                  {TABS.map(t => (
                    <div
                      key={t.key}
                      style={{ padding: '0.6rem 1rem', cursor: 'pointer', color: tab === t.key ? '#6366f1' : '#222', background: tab === t.key ? '#f3f4f6' : 'transparent' }}
                      onClick={() => {
                        setTab(t.key);
                        setShowStatusDropdown(false);
                      }}
                    >
                      {t.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {isSuperAdmin && (
            <div className={styles.dropdownWrapper}>
              <select
                className={styles.departmentDropdown}
                value={fromDepartment}
                onChange={e => setFromDepartment(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              >
                <option value="all">All Departments</option>
                {/* departments state ต้องมีข้อมูล department ทั้งหมด */}
                {Array.isArray(transfers) && transfers.length > 0 && Array.from(new Set(transfers.map(t => t.from_department_id && t.from_department_name ? JSON.stringify({id: t.from_department_id, name: t.from_department_name}) : null).filter(Boolean))).map(depStr => {
                  const dep = JSON.parse(depStr);
                  return <option key={dep.id} value={dep.id}>{dep.name}</option>;
                })}
              </select>
              <span className={styles.dropdownIcon}>▼</span>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', position: 'relative' }}>
          <button className={styles.iconButton} onClick={() => setShowPicker(v => !v)}>
            <AiOutlineCalendar />
          </button>
          {showPicker && (
            <div style={{ position: 'absolute', zIndex: 20, top: '110%', left: 0, border: '1.5px solid #e5e7eb', background: '#fff' }}>
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
          <button className={styles.exportPdfButton} onClick={handleExportXLSX} style={{ marginLeft: 8 }}>
            <AiOutlineDownload style={{ fontSize: '1.3em' }} />
            Export XLSX
          </button>
        </div>
      </div>
      <table className={styles.assetsTable}>
        <thead>
          <tr>
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
            <tr><td colSpan={8} style={{ textAlign: 'center' }}>Loading...</td></tr>
          ) : paginatedTransfers.length === 0 ? (
            <tr><td colSpan={8} className={styles.noResults}>No data</td></tr>
          ) : paginatedTransfers.map(t => (
            <tr key={t.id} onClick={() => handleAssetClick(t)} style={{ cursor: 'pointer' }}>
              <td style={{ textAlign: 'center' }}>
                <img
                  src={t.image_url || '/file.svg'}
                  alt={t.asset_name || t.asset_id}
                  width={60}
                  height={60}
                  style={{ objectFit: 'cover', borderRadius: 8 }}
                  onError={e => { e.currentTarget.src = '/file.svg'; }}
                />
              </td>
              <td>{t.asset_name || t.asset_id}</td>
              <td>{t.from_department_name || t.from_department_id}</td>
              <td>{t.to_department_name || t.to_department_id}</td>
              <td>
                <span
                  className={styles.statusBadge}
                  style={{ background: statusColors[t.status] || '#e5e7eb', fontWeight: 600 }}
                >
                  {statusLabels[t.status] || t.status}
                </span>
              </td>
              <td>{t.requested_by_name ? t.requested_by_name : (typeof t.requested_by === 'string' ? t.requested_by : t.requested_by?.toString() || '')}</td>
              <td>{t.requested_at}</td>
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
      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
      {showHistoryPopup && selectedAsset && (
        <AssetAuditHistoryPopup
          open={showHistoryPopup}
          onClose={() => setShowHistoryPopup(false)}
          assetId={selectedAsset.asset_id}
          logs={transferLogs}
          type="transfer"
        />
      )}
    </div>
  );
};

export default AssetTransferVerificationTable; 