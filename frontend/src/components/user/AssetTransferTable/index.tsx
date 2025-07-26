import React, { useEffect, useState } from 'react';
import styles from '../AssetsTable/AssetsTable.module.css';
import { DateRange } from 'react-date-range';
import { format, parse, isAfter, isBefore, isEqual } from 'date-fns';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { AiOutlineDown, AiOutlineDownload, AiOutlineCalendar } from 'react-icons/ai';
import Swal from 'sweetalert2';
import Pagination from '../../common/Pagination';
import ExcelJS from 'exceljs';
import AssetAuditHistoryPopup from '../../common/AssetAuditHistoryPopup';
import DepartmentSelector from '../../common/DepartmentSelector';
import { useDropdown } from '../../../contexts/DropdownContext';

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
  from_department?: string;
  from_department_name?: string;
  to_department?: string;
  to_department_name?: string;
  status: string;
  requested_by_name?: string;
  requested_at?: string;
}

interface AssetTransferTableProps {
  searchTerm?: string;
}

function highlightText(text: string, keyword: string) {
  if (!keyword) return text;
  const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')})`, 'gi');
  return text.split(regex).map((part, i) =>
    part.toLowerCase() === keyword.toLowerCase() ? <mark key={i} style={{ background: '#ffe066', color: '#222', padding: 0 }}>{part}</mark> : part
  );
}

const AssetTransferTable: React.FC<AssetTransferTableProps> = ({ searchTerm }) => {
  const [tab, setTab] = useState('all');
  const [transfers, setTransfers] = useState<AssetTransfer[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [range, setRange] = useState([
    { startDate: undefined, endDate: undefined, key: 'selection' },
  ]);
  const [showPicker, setShowPicker] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchTerm || '');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [viewMode, setViewMode] = useState<'in' | 'out'>('in');
  const [selectedAsset, setSelectedAsset] = useState<AssetTransfer | null>(null);
  const [showHistoryPopup, setShowHistoryPopup] = useState(false);
  const [transferLogs, setTransferLogs] = useState<any[]>([]);
  const { departments, loading: dropdownLoading } = useDropdown();
  const [selectedDepartment, setSelectedDepartment] = useState<'all' | number>('all');

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
    params.push(`forVerification=${viewMode === 'in' ? '1' : 'history'}`);
    if (selectedDepartment !== 'all') params.push(`department_id=${selectedDepartment}`);
    if (params.length > 0) url += '?' + params.join('&');
    fetch(url)
      .then(res => res.json())
      .then(data => setTransfers(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTransfers();
    // eslint-disable-next-line
  }, [tab, viewMode, selectedDepartment]);

  // Filter by date range + search + department
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
    // filter by department
    let departmentOk = true;
    if (selectedDepartment !== 'all') {
      departmentOk = t.from_department === departments.find(d => d.id === selectedDepartment)?.name_th || t.from_department_name === departments.find(d => d.id === selectedDepartment)?.name_th;
    }
    // filter by search term
    const q = localSearch.toLowerCase();
    let searchOk = true;
    if (q) {
      searchOk = (
        (typeof t.asset_name === 'string' ? t.asset_name : String(t.asset_id)).toLowerCase().includes(q) ||
        (typeof t.from_department === 'string' ? t.from_department : '').toLowerCase().includes(q) ||
        (typeof t.to_department === 'string' ? t.to_department : '').toLowerCase().includes(q) ||
        (statusLabels[t.status] || t.status).toLowerCase().includes(q) ||
        (t.requested_by_name || '').toLowerCase().includes(q) ||
        (t.requested_at || '').toLowerCase().includes(q)
      );
    }
    return dateOk && departmentOk && searchOk;
  });

  // Pagination
  const totalPages = Math.ceil(filteredTransfers.length / rowsPerPage);
  const paginatedTransfers = filteredTransfers.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage) as AssetTransfer[];

  useEffect(() => { setCurrentPage(1); }, [tab, transfers, range, selectedDepartment]);

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
      await fetch(`/api/asset-transfers/${id}/approve`, { method: 'PATCH' });
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
      await fetch(`/api/asset-transfers/${id}/reject`, { method: 'PATCH' });
      fetchTransfers();
      Swal.fire('Rejected!', 'The asset transfer has been rejected.', 'success');
    }
  };

  const handleExportXLSX = async () => {
    if (!filteredTransfers || filteredTransfers.length === 0) return;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Asset Transfers');
    worksheet.addRow([
      'Asset', 'From Department', 'To Department', 'Status', 'Requested By', 'Requested At'
    ]);
    filteredTransfers.forEach(t => {
      worksheet.addRow([
        t.asset_name || t.asset_id,
        t.from_department || '',
        t.to_department || '',
        statusLabels[t.status] || t.status,
        t.requested_by_name || '',
        t.requested_at || '',
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

  const handleAssetClick = async (asset: AssetTransfer) => {
    setSelectedAsset(asset);
    setShowHistoryPopup(true);
    const res = await fetch(`/api/assets/${asset.asset_id || asset.id}/transfer-logs`);
    const logs = await res.json();
    setTransferLogs(logs);
  };

  return (
    <>
      {isMobile ? (
        <>
          {/* Row 0: Transfer In/Out */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '0 0.5rem', marginTop: isMobile ? 50 : 16, marginBottom: 8 }}>
            {VIEW_MODES.map(vm => (
              <button
                key={vm.key}
                className={styles.filterButton + (viewMode === vm.key ? ' ' + styles.active : '')}
                onClick={() => setViewMode(vm.key as 'in' | 'out')}
                style={{ height: 44, minWidth: 110 }}
              >
                {vm.label}
              </button>
            ))}
          </div>
          {/* Row 1: Status, Calendar */}
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center',
            padding: '0 0.5rem',
            marginBottom: 8,
            marginTop: isMobile ? 10 : 40,
            position: 'relative'
          }}>
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
              <div style={{ position: 'absolute', zIndex: 20, top: 50, right: 0, background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 12 }}>
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
            {/* Export XLSX button (mobile) */}
            {filteredTransfers.length > 0 && (
              <button className={styles.exportXlsxButtonSmall} style={{ background: 'linear-gradient(135deg, #5768D2 0%, #EB9CED 100%)', color: '#fff', border: 'none', borderRadius: 10, padding: '0.5rem 1.2rem', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, height: 44, boxShadow: 'var(--shadow-md)' }} onClick={handleExportXLSX}>
                <AiOutlineDownload style={{ fontSize: '1.3em' }} />
                Export
              </button>
            )}
          </div>
          {/* Row 2: search box */}
          <div style={{padding: '0 0.5rem 0.5rem 0.5rem'}}>
            <input
              type="text"
              placeholder="Search..."
              value={localSearch}
              onChange={e => setLocalSearch(e.target.value)}
              className={styles.mobileSearchInput}
            />
          </div>
          {/* Card view */}
          <div className={styles.assetCardList}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 24 }}>Loading...</div>
            ) : filteredTransfers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 24 }}>No data</div>
            ) : (
              filteredTransfers.map(t => (
                <div className={styles.assetCard} key={t.id}>
                  <img
                    src={t.image_url || '/file.svg'}
                    alt={typeof t.asset_name === 'string' ? t.asset_name : String(t.asset_id)}
                    className={styles.assetCardImage}
                    onError={e => { (e.target as HTMLImageElement).src = '/file.svg'; }}
                  />
                  <div className={styles.assetCardContent}>
                    <div className={styles.assetCardTitle} onClick={() => handleAssetClick(t)} style={{ cursor: 'pointer' }}>
                      {highlightText(typeof t.asset_name === 'string' ? t.asset_name : String(t.asset_id), localSearch)}
                    </div>
                    <div className={styles.assetCardMetaRow}><b>From:</b> {highlightText(t.from_department_name || t.from_department || '', localSearch)}</div>
                    <div className={styles.assetCardMetaRow}><b>To:</b> {highlightText(t.to_department_name || t.to_department || '', localSearch)}</div>
                    <div className={styles.assetCardMetaRow}>
                      <b>Status:</b> <span className={
                        `${styles.statusBadge} ` +
                        (t.status === 'approved' ? styles.statusApproved : t.status === 'rejected' ? styles.statusRejected : t.status === 'pending' ? styles.statusPending : '')
                      }>
                        {highlightText(statusLabels[t.status] || t.status, localSearch)}
                      </span>
                    </div>
                    <div className={styles.assetCardMetaRow}><b>Requested By:</b> {highlightText(t.requested_by_name || '', localSearch)}</div>
                    <div className={styles.assetCardMetaRow}><b>Requested At:</b> {highlightText(t.requested_at || '', localSearch)}</div>
                    {/* ปุ่ม approve/reject (mobile) */}
                    {viewMode === 'in' && t.status === 'pending' && (
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
                  </div>
                </div>
              ))
            )}
          </div>
          {/* Pagination (mobile) */}
          {totalPages > 1 && (
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center' }}>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </>
      ) : (
        <div className={styles.assetsTableContainer}>
          <div className={styles.assetsControls} style={{ marginBottom: 16, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              {/* Transfer In/Out buttons */}
              {VIEW_MODES.map(vm => (
                <button
                  key={vm.key}
                  className={styles.filterButton + (viewMode === vm.key ? ' ' + styles.active : '')}
                  onClick={() => setViewMode(vm.key as 'in' | 'out')}
                  style={{ height: 44, minWidth: 110 }}
                >
                  {vm.label}
                </button>
              ))}
              {/* Status dropdown */}
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
              {/* Department dropdown */}
              <div className={styles.dropdownWrapper}>
                <select
                  className={styles.departmentDropdown}
                  value={selectedDepartment}
                  onChange={e => setSelectedDepartment(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                >
                  <option value="all">All Departments</option>
                  {departments.map(dep => (
                    <option key={dep.id} value={dep.id}>{dep.name_th}</option>
                  ))}
                </select>
                <span className={styles.caretIcon}><AiOutlineDown /></span>
              </div>
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
              {/* Export XLSX button (desktop) */}
              {filteredTransfers.length > 0 && (
                <button className={styles.exportXlsxButtonSmall} style={{ background: 'linear-gradient(135deg, #5768D2 0%, #EB9CED 100%)', color: '#fff', border: 'none', borderRadius: 10, padding: '0.5rem 1.2rem', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, height: 44, boxShadow: 'var(--shadow-md)' }} onClick={handleExportXLSX}>
                  <AiOutlineDownload style={{ fontSize: '1.3em' }} />
                  Export
                </button>
              )}
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
                {viewMode === 'in' && <th style={{ width: 120 }}>Action</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={viewMode === 'in' ? 8 : 7} style={{ textAlign: 'center' }}>Loading...</td></tr>
              ) : paginatedTransfers.length === 0 ? (
                <tr><td colSpan={viewMode === 'in' ? 8 : 7} className={styles.noResults}>No data</td></tr>
              ) : paginatedTransfers.map(t => (
                <tr key={t.id}>
                  <td style={{ textAlign: 'center' }}>
                    <img
                      src={t.image_url || '/file.svg'}
                      alt={typeof t.asset_name === 'string' ? t.asset_name : String(t.asset_id)}
                      width={60}
                      height={60}
                      style={{ objectFit: 'cover', borderRadius: 8 }}
                      onError={e => { (e.target as HTMLImageElement).src = '/file.svg'; }}
                    />
                  </td>
                  <td onClick={() => handleAssetClick(t)} style={{ cursor: 'pointer' }}>
                    {highlightText(typeof t.asset_name === 'string' ? t.asset_name : String(t.asset_id), localSearch)}
                  </td>
                  <td>{highlightText(t.from_department_name || t.from_department || '', localSearch)}</td>
                  <td>{highlightText(t.to_department_name || t.to_department || '', localSearch)}</td>
                  <td>
                    <span
                      className={styles.statusBadge}
                      style={{ background: statusColors[t.status] || '#e5e7eb', fontWeight: 600 }}
                    >
                      {highlightText(statusLabels[t.status] || t.status, localSearch)}
                    </span>
                  </td>
                  <td>{highlightText(t.requested_by_name || '', localSearch)}</td>
                  <td>{highlightText(t.requested_at || '', localSearch)}</td>
                  {viewMode === 'in' && (
                    <td>
                      {t.status === 'pending' && (
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
                      )}
                    </td>
                  )}
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
        </div>
      )}
      {/* Popup ประวัติการโอน */}
      {showHistoryPopup && selectedAsset && (
        <AssetAuditHistoryPopup
          open={showHistoryPopup}
          onClose={() => setShowHistoryPopup(false)}
          assetId={selectedAsset.asset_id}
          logs={transferLogs}
          type="transfer"
        />
      )}
    </>
  );
};

export default AssetTransferTable; 