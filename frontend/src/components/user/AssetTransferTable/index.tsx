import React, { useEffect, useState } from 'react';
import styles from '../AssetsTable/AssetsTable.module.css';
import statusBadgeStyles from '../../common/statusBadge.module.css';
import AssetDetailPopup from '../../common/AssetDetailPopup';
import AssetAuditHistoryPopup from '../../common/AssetAuditHistoryPopup';
import { DateRange } from 'react-date-range';
import { format, parse, isAfter, isBefore, isEqual } from 'date-fns';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { AiOutlineDown, AiOutlineDownload, AiOutlineCalendar, AiOutlineEye } from 'react-icons/ai';
import Swal from 'sweetalert2';
import Pagination from '../../common/Pagination';
import ExcelJS from 'exceljs';
import { highlightText } from '../../common/highlightText';



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
  onSearch?: (value: string) => void;
}


const AssetTransferTable: React.FC<AssetTransferTableProps> = ({ searchTerm, onSearch }) => {
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

  // Sync localSearch with searchTerm prop
  useEffect(() => {
    if (searchTerm !== undefined) {
      setLocalSearch(searchTerm);
    }
  }, [searchTerm]);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [viewMode, setViewMode] = useState<'in' | 'out'>('in');
  const [selectedAsset, setSelectedAsset] = useState<AssetTransfer | null>(null);
  const [showHistoryPopup, setShowHistoryPopup] = useState(false);
  const [transferLogs, setTransferLogs] = useState<any[]>([]);
  const [assetDetail, setAssetDetail] = useState<any>(null);
  const [selected, setSelected] = useState<number[]>([]);



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
    if (params.length > 0) url += '?' + params.join('&');
    fetch(url)
      .then(res => res.json())
      .then(data => setTransfers(data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTransfers();
    // eslint-disable-next-line
  }, [tab, viewMode]);

  // Filter by date range + search
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
    // filter by search term
    const q = localSearch.toLowerCase();
    let searchOk = true;
    if (q) {
      searchOk = (
        (typeof t.asset_name === 'string' ? t.asset_name : String(t.asset_id)).toLowerCase().includes(q) ||
        (t.from_department_name || t.from_department || '').toLowerCase().includes(q) ||
        (t.to_department_name || t.to_department || '').toLowerCase().includes(q) ||
        (statusLabels[t.status] || t.status).toLowerCase().includes(q) ||
        (t.requested_by_name || '').toLowerCase().includes(q) ||
        (t.requested_at || '').toLowerCase().includes(q) ||
        String(t.asset_id).toLowerCase().includes(q)
      );
    }
    return dateOk && searchOk;
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
    // Add header row
    const headers = [
      'Asset', 
      'From Department', 
      'To Department', 
      'Status', 
      'Requested By', 
      'Requested At'
    ];
    worksheet.addRow(headers);
    
    // Add data rows
    const dataRows = filteredTransfers.map(t => [
      t.asset_name || t.asset_id,
      t.from_department_name || t.from_department || '',
      t.to_department_name || t.to_department || '',
      statusLabels[t.status] || t.status,
      t.requested_by_name || '',
      t.requested_at || '',
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

  const handleHistoryClick = async (asset: AssetTransfer) => {
    setSelectedAsset(asset);
    setShowHistoryPopup(true);
    // Fetch transfer history
    try {
      const res = await fetch(`/api/asset-transfers/history/${asset.asset_id || asset.id}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setTransferLogs(data);
      } else {
        setTransferLogs([]);
      }
    } catch {
      setTransferLogs([]);
    }
  };

  // เพิ่มฟังก์ชัน toggleSelect/selectAll
  const toggleSelect = (id: number) => {
    setSelected(sel => sel.includes(id) ? sel.filter(i => i !== id) : [...sel, id]);
  };

  const selectAll = () => {
    const pendingIds = paginatedTransfers.filter(t => t.status === 'pending').map(t => t.id);
    if (selected.length === pendingIds.length) {
      setSelected([]);
    } else {
      setSelected(pendingIds);
    }
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
      reverseButtons: false,
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
      reverseButtons: false,
    });
    if (!result.isConfirmed) return;
    await Promise.all(selected.map(id => fetch(`/api/asset-transfers/${id}/reject`, { method: 'PATCH', credentials: 'include' })));
    fetchTransfers();
    setSelected([]);
    Swal.fire('Rejected!', 'Selected asset transfers have been rejected.', 'success');
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
            <div style={{ position: 'relative', flex: 1 }}>
            <select
              className={styles.filterDropdown}
              value={tab}
              onChange={e => setTab(e.target.value)}
                style={{ width: '100%', background: '#fafbfc', border: '1.5px solid #e5e7eb', borderRadius: 10, height: 44, fontSize: '1rem', color: '#222', fontWeight: 500, paddingRight: '2rem' }}
            >
              {TABS.map(t => (
                <option key={t.key} value={t.key}>{t.label}</option>
              ))}
            </select>
              <span className={styles.caretIcon}><AiOutlineDown /></span>
            </div>
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
              onChange={e => {
                const value = e.target.value;
                setLocalSearch(value);
                if (onSearch) {
                  onSearch(value);
                }
              }}
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
                <div className={styles.assetCard} key={t.id} style={{ position: 'relative', cursor: 'pointer' }} onClick={(e) => {
                  // ป้องกันการ click เมื่อคลิกที่ checkbox หรือปุ่ม
                  if ((e.target as HTMLElement).closest('[data-select-checkbox]') || 
                      (e.target as HTMLElement).closest('button') ||
                      (e.target as HTMLElement).closest('[data-history-button]')) {
                    return;
                  }
                  handleAssetClick(t);
                }}>
                  {/* ไอคอนตาและ checkbox ในมุมขวาบน - เฉพาะ Transfer In */}
                  {viewMode === 'in' && (
                    <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
                      <div data-history-button>
                        <button
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, borderRadius: 4, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          onClick={async (e) => { 
                            e.stopPropagation(); 
                            handleHistoryClick(t);
                          }}
                          aria-label="View transfer history"
                          title="ดูประวัติการโอนย้าย"
                        >
                          <AiOutlineEye size={20} />
                        </button>
                      </div>
                      {t.status === 'pending' && (
                        <div data-select-checkbox>
                          <input
                            type="checkbox"
                            checked={selected.includes(t.id)}
                            onChange={e => { e.stopPropagation(); toggleSelect(t.id); }}
                            style={{ width: 20, height: 20, cursor: 'pointer', margin: 0 }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* รูป asset ตรงกลาง */}
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 16, padding: '16px 0', marginTop: viewMode === 'in' ? 45 : 16 }}>
                  <img
                    src={t.image_url || '/522733693_1501063091226628_5759500172344140771_n.jpg'}
                    alt={typeof t.asset_name === 'string' ? t.asset_name : String(t.asset_id)}
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
                    <div className={styles.assetCardTitle}>
                      {highlightText(typeof t.asset_name === 'string' ? t.asset_name : String(t.asset_id), localSearch)}
                    </div>
                    <div className={styles.assetCardMetaRow}><b>From:</b> {highlightText(t.from_department_name || t.from_department || '', localSearch)}</div>
                    <div className={styles.assetCardMetaRow}><b>To:</b> {highlightText(t.to_department_name || t.to_department || '', localSearch)}</div>
                    <div className={styles.assetCardMetaRow}><b>Asset ID:</b> {highlightText(String(t.asset_id), localSearch)}</div>
                    <div className={styles.assetCardMetaRow}>
                      <b>Status:</b> <span className={`${statusBadgeStyles.statusBadge} ${t.status === 'approved' ? statusBadgeStyles.approved : t.status === 'rejected' ? statusBadgeStyles.rejected : t.status === 'pending' ? statusBadgeStyles.pending : ''}`}>
                        {highlightText(statusLabels[t.status] || t.status, localSearch)}
                      </span>
                    </div>
                    <div className={styles.assetCardMetaRow}><b>Requested By:</b> {highlightText(t.requested_by_name || '', localSearch)}</div>
                    <div className={styles.assetCardMetaRow}><b>Requested At:</b> {highlightText(t.requested_at || '', localSearch)}</div>
                    {/* ปุ่ม approve/reject (mobile) - เฉพาะ Transfer In */}
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
          {/* ปุ่ม Approve/Reject หลายรายการ (mobile) - เฉพาะ Transfer In */}
          {viewMode === 'in' && (
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
          )}
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
                  style={{ height: 44, minWidth: 140 }}
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
                {/* เพิ่ม checkbox select all (desktop) - เฉพาะ Transfer In */}
                {viewMode === 'in' && (
                  <th style={{ width: 30 }}>
                    <input
                      type="checkbox"
                      checked={paginatedTransfers.filter(t => t.status === 'pending').length > 0 && selected.length === paginatedTransfers.filter(t => t.status === 'pending').length}
                      onChange={selectAll}
                    />
                  </th>
                )}
                <th style={{ width: 60, minWidth: 60, maxWidth: 60 }}>Image</th>
                <th style={{ width: 140 }}>Asset</th>
                <th style={{ width: 180 }}>From Department</th>
                <th style={{ width: 140 }}>To Department</th>
                <th style={{ width: 100 }}>Status</th>
                <th style={{ width: 120 }}>Requested By</th>
                <th style={{ width: 140 }}>Requested At</th>
                <th style={{ width: 80, textAlign: 'center' }}>History</th>
                {viewMode === 'in' && <th style={{ width: 150 }}>Action</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={viewMode === 'in' ? 10 : 9} style={{ textAlign: 'center' }}>Loading...</td></tr>
              ) : paginatedTransfers.length === 0 ? (
                <tr><td colSpan={viewMode === 'in' ? 10 : 9} className={styles.noResults}>No data</td></tr>
              ) : paginatedTransfers.map(t => (
                <tr key={t.id} onClick={() => handleAssetClick(t)} style={{ cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}>
                  {/* เพิ่ม checkbox สำหรับแต่ละรายการ (desktop) - เฉพาะ Transfer In */}
                  {viewMode === 'in' && (
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
                  )}
                  <td style={{ textAlign: 'center' }}>
                    <img
                      src={t.image_url || '/522733693_1501063091226628_5759500172344140771_n.jpg'}
                      alt={typeof t.asset_name === 'string' ? t.asset_name : String(t.asset_id)}
                      width={60}
                      height={60}
                      style={{ objectFit: 'cover', borderRadius: 8 }}
                      onError={e => { (e.target as HTMLImageElement).src = '/522733693_1501063091226628_5759500172344140771_n.jpg'; }}
                    />
                  </td>
                  <td>
                    {highlightText(typeof t.asset_name === 'string' ? t.asset_name : String(t.asset_id), localSearch)}
                  </td>
                  <td>{highlightText(t.from_department_name || t.from_department || '', localSearch)}</td>
                  <td>{highlightText(t.to_department_name || t.to_department || '', localSearch)}</td>
                  <td>
                    <span className={`${statusBadgeStyles.statusBadge} ${t.status === 'approved' ? statusBadgeStyles.approved : t.status === 'rejected' ? statusBadgeStyles.rejected : t.status === 'pending' ? statusBadgeStyles.pending : ''}`}>
                      {highlightText(statusLabels[t.status] || t.status, localSearch)}
                    </span>
                  </td>
                  <td>{highlightText(t.requested_by_name || '', localSearch)}</td>
                  <td>{highlightText(t.requested_at || '', localSearch)}</td>
                  <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                      <button
                        style={{ 
                          background: 'none', 
                          border: 'none', 
                          cursor: 'pointer', 
                          padding: 4, 
                          borderRadius: 4,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        onClick={e => { e.stopPropagation(); handleHistoryClick(t); }}
                        title="ดูประวัติการโอนย้าย"
                      >
                        <AiOutlineEye size={18} />
                      </button>
                    </div>
                  </td>
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
          {/* ปุ่ม Approve/Reject หลายรายการ (desktop) - เฉพาะ Transfer In */}
          {viewMode === 'in' && (
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
          )}
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
      {/* AssetDetailPopup - แสดงรายละเอียด asset */}
      {selectedAsset && assetDetail && (
        <AssetDetailPopup
          asset={assetDetail}
          isOpen={!!assetDetail}
          onClose={() => {
            setSelectedAsset(null);
            setAssetDetail(null);
          }}
          isAdmin={false}
          isCreating={false}
          showUserEdit={true}
        />
      )}

      {/* AssetAuditHistoryPopup - แสดงประวัติการโอนย้าย */}
      {showHistoryPopup && selectedAsset && (
        <AssetAuditHistoryPopup
          assetId={selectedAsset.asset_id || selectedAsset.id}
          open={showHistoryPopup}
          onClose={() => setShowHistoryPopup(false)}
          type="transfer"
          logs={transferLogs}
          asset={selectedAsset}
        />
      )}
    </>
  );
};

export default AssetTransferTable; 