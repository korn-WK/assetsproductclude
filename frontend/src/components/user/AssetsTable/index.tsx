import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { AiOutlineCalendar, AiOutlineDown, AiOutlineClose, AiOutlineCamera, AiOutlinePrinter, AiOutlineDownload } from 'react-icons/ai';
import styles from './AssetsTable.module.css';
import Pagination from '../../common/Pagination';
import AssetDetailPopup from '../../common/AssetDetailPopup';
import { useAssets } from '../../../contexts/AssetContext';
import { formatDate } from '../../../lib/utils';
import { useDropdown } from '../../../contexts/DropdownContext';
import Swal from 'sweetalert2';
import dayjs from 'dayjs';
import { useAuth } from '../../../contexts/AuthContext';
import DateRangeFilterButton from '../../common/DateRangeFilterButton';
import ExcelJS from 'exceljs';
import { useStatusOptions } from '../../../lib/statusOptions';
import PrintLabelsModal from '../../common/PrintLabelsModal';
import adminStyles from '../../admin/AdminAssetsTable/AdminAssetsTable.module.css';
import { highlightText } from '../../common/highlightText';
import { Asset } from '../../../common/types/asset';
import { printBulkLabels } from '../../../common/printUtils';
import statusBadgeStyles from '../../common/statusBadge.module.css';

interface AssetsTableProps {
  onScanBarcodeClick?: () => void;
  searchTerm?: string;
  onSearch?: (value: string) => void;
  initialStatusFilter?: string;
}

const AssetsTable: React.FC<AssetsTableProps> = ({ onScanBarcodeClick, searchTerm, onSearch, initialStatusFilter }) => {
  const { assets, loading, error, fetchAssets } = useAssets();
  const { departments, loading: dropdownLoading, error: dropdownError, fetchDropdownData } = useDropdown();
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isPopupOpen, setIsPopupOpen] = useState<boolean>(false);
  const itemsPerPage = 5;
  const [dateRange, setDateRange] = useState<{ startDate?: Date; endDate?: Date }>({});
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);

  const [isMobile, setIsMobile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const { options: statusOptions, loading: statusLoading } = useStatusOptions();
  const statusLabels = Object.fromEntries(statusOptions.map(opt => [opt.value, opt.label]));
  const [showViewOnlyNotice, setShowViewOnlyNotice] = useState(true);
  const [pendingAudits, setPendingAudits] = useState<{ [assetId: string]: { status: string; note: string } | null }>({});
  // เพิ่ม hook สำหรับดึง asset_transfers pending ที่เกี่ยวข้องกับ asset ทั้งหมด
  const [pendingTransfers, setPendingTransfers] = useState<{ [assetId: string]: any }>({});
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printType, setPrintType] = useState<'barcode' | 'qrcode'>('barcode');

  // Check if user can edit (user with department)
  const canEdit = user && user.department_id !== null;

  // Check if user can only view (user without department)
  const canOnlyView = user && user.department_id === null;

  // Handle initial status filter from URL
  useEffect(() => {
    console.log('AssetsTable: initialStatusFilter received:', initialStatusFilter);
    if (initialStatusFilter) {
      console.log('AssetsTable: Setting activeFilter to:', initialStatusFilter);
      setActiveFilter(initialStatusFilter);
    }
  }, [initialStatusFilter]);

  useEffect(() => {
    console.log('AssetsTable: activeFilter changed to:', activeFilter);
  }, [activeFilter]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  useEffect(() => {
    fetchDropdownData();
    // eslint-disable-next-line
  }, []);



  useEffect(() => {
    if (dateRange.startDate && dateRange.endDate) {
      fetchAssets({
        created_at_start: dateRange.startDate.toISOString(),
        created_at_end: dateRange.endDate.toISOString(),
      });
    } else {
      fetchAssets({});
    }
    // eslint-disable-next-line
  }, [dateRange]);

  // ดึง pending audit log ของ assets ทั้งหมด (เฉพาะที่ยังไม่ approve)
  useEffect(() => {
    if (!assets || assets.length === 0) return;
    const fetchPendingAudits = async () => {
      const assetIds = assets.map(a => a.id);
      // ดึง audit log pending ของ asset ทั้งหมด
      const res = await fetch('/api/assets/audits/list');
      const audits = await res.json();
      // สร้าง map assetId -> audit (pending)
      const pendingMap: { [assetId: string]: { status: string; note: string } } = {};
      audits.forEach((audit: any) => {
        if (!audit.confirmed && audit.asset_id) {
          pendingMap[audit.asset_id] = { status: audit.status, note: audit.note };
        }
      });
      setPendingAudits(pendingMap);
    };
    fetchPendingAudits();
  }, [assets]);

  // ดึง transfer pending ทั้งหมดที่เกี่ยวข้องกับ asset ปัจจุบัน
  useEffect(() => {
    if (!assets || assets.length === 0) return;
    const fetchTransfers = async () => {
      const res = await fetch('/api/asset-transfers?status=pending', { credentials: 'include' });
      const data = await res.json();
      // map asset_id เป็น key (string)
      const map: { [assetId: string]: any } = {};
      for (const t of data) {
        // handle asset_id เป็น number หรือ string
        map[String(t.asset_id)] = t;
      }
      setPendingTransfers(map);
    };
    fetchTransfers();
  }, [assets]);



  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 600);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (canOnlyView) {
      setShowViewOnlyNotice(true);
      const timer = setTimeout(() => setShowViewOnlyNotice(false), 10000);
      return () => clearTimeout(timer);
    }
  }, [canOnlyView]);

  const filteredAssets = assets.filter(asset => {
    // Since Dashboard now passes Thai status values directly, we can simplify the matching
    const matchesStatus = activeFilter === 'All' || asset.status === activeFilter;
    
    console.log('AssetsTable: Filtering asset:', asset.name, 'status:', asset.status, 'activeFilter:', activeFilter, 'matchesStatus:', matchesStatus);
    
    let matchesDate = true;
    if (dateRange.startDate && dateRange.endDate && (asset as any).created_at) {
      const created = new Date((asset as any).created_at);
      const start = new Date(dateRange.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(dateRange.endDate);
      end.setHours(23, 59, 59, 999);
      matchesDate = created >= start && created <= end;
    }
    const q = (typeof searchTerm === 'string' ? searchTerm : '').trim().toLowerCase();
    const matchesSearch = !q ||
      asset.asset_code.toLowerCase().includes(q) ||
      ((asset as any).inventory_number || '').toLowerCase().includes(q) ||
      asset.name.toLowerCase().includes(q) ||
      (asset.department?.toLowerCase() || '').includes(q) ||
      (asset.location?.toLowerCase() || '').includes(q) ||
              (statusLabels[asset.status || ''] || asset.status || '').toLowerCase().includes(q);
    return matchesStatus && matchesDate && matchesSearch;
  });

  const totalPages = Math.ceil(filteredAssets.length / itemsPerPage);
  const currentAssets = filteredAssets.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Patch assets to always have inventory_number and room as string
  const patchedAssets = currentAssets.map(asset => {
    const hasTransfer = !!pendingTransfers[String(asset.id)];
    return {
    ...asset,
    inventory_number: (asset as any).inventory_number || '',
    room: (asset as any).room || '',
    created_at: (asset as any).created_at || '',
    has_pending_audit: (asset as any).has_pending_audit || false,
    pending_status: (asset as any).pending_status || null,
      has_pending_transfer: hasTransfer,
    } as Asset;
  });

  // ปรับ getStatusClass และ getStatusDisplay ให้รองรับ transferring แบบ virtual
  const getStatusClass = (status: string, hasPending: boolean, hasPendingTransfer: boolean) => {
    console.log('getStatusClass called with status:', status, 'hasPending:', hasPending, 'hasPendingTransfer:', hasPendingTransfer);
    if (hasPendingTransfer) return styles.statusTransferring;
    if (hasPending) return styles.statusPending;
    switch (status) {
      case 'active': return styles.statusActive;
      case 'missing': return styles.statusMissing;
      case 'broken': return styles.statusBroken;
      case 'no_longer_required': return styles.statusDisposed; // ใช้สีเทา
      case 'พร้อมใช้งาน': return styles.statusActive; // เพิ่ม case สำหรับภาษาไทย
      case 'สูญหาย': return styles.statusMissing; // เพิ่ม case สำหรับภาษาไทย
      case 'ชำรุด': return styles.statusBroken; // เพิ่ม case สำหรับภาษาไทย
      case 'ยกเลิก': return styles.statusDisposed; // เพิ่ม case สำหรับภาษาไทย
      default: 
        console.log('No matching status class for:', status);
        return '';
    }
  };
  // ใช้ statusLabels ในการแสดงผล status
  const getStatusDisplay = (status: string, hasPending: boolean, pendingStatus?: string, hasPendingTransfer?: boolean) => {
    if (hasPendingTransfer) return 'Transferring';
    if (hasPending && pendingStatus) return 'Pending';
    if (!status) return 'Unknown';
    return statusLabels[status] || status;
  };

  const handleAssetClick = (asset: Asset) => {
    setSelectedAsset({
      ...asset,
      inventory_number: asset.inventory_number || '',
      room: asset.room || '',
      created_at: asset.created_at || '',
    });
    setIsPopupOpen(true);
  };

  const handleClosePopup = () => {
    setIsPopupOpen(false);
    setSelectedAsset(null);
  };

  const handleAssetUpdate = (updatedAsset: Asset) => {
    setSelectedAsset({
      ...updatedAsset,
      inventory_number: updatedAsset.inventory_number || '',
      room: updatedAsset.room || '',
      created_at: updatedAsset.created_at || '',
    });
    fetchAssets();
  };



  const handleSearch = () => {
    // Implement search functionality
    console.log('Searching for:', searchQuery);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleExportXLSX = async () => {
    if (filteredAssets.length === 0) return;
    
    // Patch filtered assets to ensure all required fields are present
    const patchedFilteredAssets = filteredAssets.map(asset => ({
      ...asset,
      inventory_number: (asset as any).inventory_number || '',
      room: (asset as any).room || '',
      created_at: (asset as any).created_at || '',
      has_pending_audit: (asset as any).has_pending_audit || false,
      pending_status: (asset as any).pending_status || null,
      has_pending_transfer: !!pendingTransfers[String(asset.id)],
    } as Asset));
    
    const rows = patchedFilteredAssets.map(asset => ([
      asset.asset_code || '',
      asset.inventory_number || '',
      asset.name || '',
      asset.description || '',
      asset.location || '',
      asset.room || '',
      asset.department || '',
      statusLabels[asset.status || ''] || asset.status || '',
      asset.owner || '',
              formatDate(asset.acquired_date || '') || '',
        formatDate(asset.created_at || '') || '',
    ]));

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Assets');
    
    // Add header
    worksheet.addRow([
      'Asset Code',
      'Inventory Number',
      'Name',
      'Description',
      'Location',
      'Room',
      'Department',
      'Status',
      'Owner',
      'Acquired Date',
      'Created Date',
    ]);

    // Add data rows
    rows.forEach(row => {
      const fullRow = [
        row[0] || '',
        row[1] || '',
        row[2] || '',
        row[3] || '',
        row[4] || '',
        row[5] || '',
        row[6] || '',
        row[7] || '',
        row[8] || '',
        row[9] || '',
        row[10] || '',
      ];
      worksheet.addRow(fullRow);
    });

    // Set column widths
    worksheet.columns = [
      { width: 20 }, // Asset Code
      { width: 20 }, // Inventory Number
      { width: 30 }, // Name
      { width: 30 }, // Description
      { width: 20 }, // Location
      { width: 15 }, // Room
      { width: 20 }, // Department
      { width: 15 }, // Status
      { width: 20 }, // Owner
      { width: 15 }, // Acquired Date
      { width: 15 }, // Created Date
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

    // Center align and add border to all cells
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        // Asset Code and Inventory Number columns: force as text
        if ((colNumber === 1 || colNumber === 2) && rowNumber > 1) {
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
    a.download = `assets_${new Date().toISOString().split('T')[0]}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Checkbox handlers
  const handleSelectAsset = (id: string) => {
    setSelectedAssets(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };
  const handleSelectAll = () => {
    if (selectedAssets.length === filteredAssets.length) {
      setSelectedAssets([]);
    } else {
      setSelectedAssets(filteredAssets.map(a => a.id));
    }
  };
  const handlePrintSelected = () => {
    // Implement print logic (reuse admin logic if possible)
    // For now, just alert selected asset ids
    if (selectedAssets.length === 0) {
      Swal.fire('กรุณาเลือกคุรุภัณฑ์ที่ต้องการพิมพ์', '', 'info');
      return;
    }
    // TODO: Replace with real print logic
    Swal.fire('Print', `Assets: ${selectedAssets.join(', ')}`, 'success');
  };

  const handlePrintBulk = async () => {
    if (!selectedAssets || selectedAssets.length === 0) {
      Swal.fire({ title: 'No Assets Selected', text: 'Please select at least one asset to print.', icon: 'warning' });
      return;
    }
    // Patch selectedAssetList to always have inventory_number as string
    const selectedAssetList = filteredAssets
      .filter(asset => selectedAssets.includes(asset.id))
      .map(asset => ({ ...asset, inventory_number: (asset as any).inventory_number || '' }));
    
    await printBulkLabels({
      printType,
      selectedAssets: selectedAssetList
    });
    setShowPrintModal(false);
  };

  if (loading) {
    return (
      <section className={styles.assetsSection}>
        <div className={styles.assetsHeader}>
          <h2>Assets</h2>
        </div>
        <div className={styles.loadingState}>
          <p>Loading assets...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className={styles.assetsSection}>
        <div className={styles.assetsHeader}>
          <h2>Assets</h2>
        </div>
        <div className={styles.errorState}>
          <p>Error: {error}</p>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className={styles.assetsSection}>
        {isMobile ? (
          <>
            {/* Row 1: Export, Calendar, Camera */}
            <div className={adminStyles.mobileActionRow} style={{ marginTop: '2rem' }}>
              <button
                className={adminStyles.exportXlsxButtonSmall + ' ' + adminStyles.mobileFull}
                onClick={handleExportXLSX}
              >
                <AiOutlineDownload style={{ fontSize: '1.3em' }} />
                Export
              </button>
              <DateRangeFilterButton
                value={dateRange}
                onChange={setDateRange}
                label=""
              />
              {onScanBarcodeClick && (
                <button
                  className={adminStyles.iconButton + ' ' + adminStyles.mobileFull}
                  onClick={onScanBarcodeClick}
                  title="สแกนบาร์โค้ด"
                >
                  <AiOutlineCamera style={{ fontSize: '1.3em' }} />
                </button>
              )}
            </div>
            {/* Row 2: Filter dropdown (status), Print */}
            <div className={adminStyles.mobileActionRow}>
              <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
                <select
                  className={adminStyles.departmentDropdown}
                  value={activeFilter}
                  onChange={e => {
                    setActiveFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{ width: '100%', paddingRight: '2rem' }}
                >
                  <option value="All">ทุกสถานะ</option>
                  {statusOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <AiOutlineDown 
                  style={{ 
                    position: 'absolute', 
                    right: '0.5rem', 
                    top: '50%', 
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none',
                    color: '#9ca3af',
                    fontSize: '0.8rem'
                  }}
                />
              </div>
              <button
                className={adminStyles.printButtonSmall + ' ' + adminStyles.mobileFull}
                onClick={() => setShowPrintModal(true)}
                disabled={selectedAssets.length === 0}
              >
                Print ({selectedAssets.length})
              </button>
            </div>
            {/* Row 3: Search */}
            <div style={{padding: '0 0.5rem 0.5rem 0.5rem'}}>
              <input
                type="text"
                placeholder="Search assets..."
                className={adminStyles.mobileSearchInput}
                value={searchTerm || ''}
                onChange={e => {
                  const value = e.target.value;
                  if (onSearch) {
                    onSearch(value);
                  }
                  setSearchQuery(value);
                }}
                style={{width: '100%'}}
              />
            </div>
            {/* Asset Card List (ใช้ style admin) */}
            <div className={adminStyles.assetCardList}>
              {patchedAssets.map(asset => (
                <div className={adminStyles.assetCard} key={asset.id} onClick={() => handleAssetClick(asset)}>
                  <input
                    type="checkbox"
                    checked={selectedAssets.includes(asset.id)}
                    onChange={e => { 
                      e.stopPropagation(); 
                      handleSelectAsset(asset.id); 
                    }}
                    onClick={e => e.stopPropagation()}
                    style={{ position: 'absolute', top: 12, right: 12, zIndex: 2, width: 18, height: 18 }}
                  />
                  <img src={asset.image_url || '/file.svg'} alt={asset.name} className={adminStyles.assetCardImage} />
                  <div className={adminStyles.assetCardContent}>
                    <div className={adminStyles.assetCardTitle}>{highlightText(asset.name, searchTerm || '')}</div>
                    <div className={adminStyles.assetCardMetaRow}>
                      <span className={adminStyles.assetId}><b>ID:</b> {highlightText(asset.asset_code, searchTerm || '')}</span>
                    </div>
                    <div className={adminStyles.assetCardMetaRow}>
                      <span><b>Location:</b> {highlightText(asset.location && (asset.room || '') ? `${asset.location} ${asset.room || ''}`.trim() : asset.location || asset.room || '-', searchTerm || '')}</span>
                    </div>
                    <div className={adminStyles.assetCardMetaRow}>
                      <span><b>Department:</b> {highlightText(asset.department || '', searchTerm || '')}</span>
                    </div>
                    <div className={adminStyles.assetCardMetaRow}>
                      <span><b>Status:</b> 
                        <span
                          className={statusBadgeStyles.statusBadge}
                          style={asset.status_color ? { background: asset.status_color, color: '#fff' } : undefined}
                        >
                          {highlightText(getStatusDisplay(asset.status || '', asset.has_pending_audit || false, asset.pending_status || undefined, !!asset.has_pending_transfer), searchTerm || '')}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </>
        ) : (
          <>
            <div className={styles.assetsHeader} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p className={styles.totalAssets}>Total {assets.length} assets</p>
                {user?.role?.toLowerCase() === 'admin' ? (
                  <p className={styles.listOfEquipment}>Asset management for admin</p>
                ) : (
                  <p className={styles.listOfEquipment}>Asset management for user</p>
                )}
              </div>
            </div>

            <div className={styles.assetsControls} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, marginBottom: 24 }}>
              {/* Left: Filter Dropdown */}
              <div className={styles.searchAndFilters} style={{ flex: 1, minWidth: 180, maxWidth: 260 }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <div className={styles.dropdownWrapper} style={{ width: '100%' }}>
                    <select
                      className={styles.departmentDropdown}
                      value={activeFilter}
                      onChange={e => {
                        setActiveFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                    >
                      <option value="All">ทุกสถานะ</option>
                      {statusOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <span className={styles.caretIcon}><AiOutlineDown /></span>
                  </div>
                </div>
              </div>
              {/* Right: Calendar, Camera, Print, Export */}
              <div className={styles.rightControls} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <DateRangeFilterButton
                  value={dateRange}
                  onChange={setDateRange}
                  label="เลือกช่วงวันที่"
                />
                {onScanBarcodeClick && (
                  <button
                    className={adminStyles.iconButton}
                    onClick={onScanBarcodeClick}
                    title="สแกนบาร์โค้ด"
                    style={{ minWidth: 0, marginLeft: 0 }}
                  >
                    <AiOutlineCamera />
                  </button>
                )}
                <button
                  className={adminStyles.printButton}
                  onClick={() => setShowPrintModal(true)}
                  disabled={selectedAssets.length === 0}
                >
                  Print ({selectedAssets.length})
                </button>
                <button
                  className={adminStyles.exportXlsxButton}
                  onClick={handleExportXLSX}
                >
                  <AiOutlineDownload style={{ fontSize: '1.3em', marginRight: 8 }} />
                  Export XLSX
                </button>
              </div>
            </div>

            <div className={styles.assetsTableContainer}>
              <table className={`${styles.assetsTable} compact`}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'center', width: 36 }}>
                      <input
                        type="checkbox"
                        checked={selectedAssets.length === filteredAssets.length && filteredAssets.length > 0}
                        onChange={e => { 
                          e.stopPropagation(); 
                          handleSelectAll(); 
                        }}
                        onClick={e => e.stopPropagation()}
                      />
                    </th>
                    <th style={{textAlign: 'center' }}>Image</th>
                    <th style={{textAlign: 'center' }}>Asset Code</th>
                    <th style={{textAlign: 'center' }}>Inventory No.</th>
                    <th style={{textAlign: 'center' }}>Name</th>
                    <th style={{textAlign: 'center' }}>Location</th>
                    <th style={{textAlign: 'center' }}>Department</th>
                    <th style={{textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {patchedAssets.map(asset => (
                    <tr 
                      key={asset.id} 
                      className={styles.clickableRow}
                      onClick={() => handleAssetClick(asset)}
                    >
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={selectedAssets.includes(asset.id)}
                          onChange={e => { 
                            e.stopPropagation(); 
                            handleSelectAsset(asset.id); 
                          }}
                          onClick={e => e.stopPropagation()}
                        />
                      </td>
                      <td data-label="Image" style={{ textAlign: 'center' }}>
                        {asset.image_url ? (
                          <Image
                            src={asset.image_url}
                            alt={asset.name}
                            width={60}
                            height={60}
                            className={styles.assetImage}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = '/522733693_1501063091226628_5759500172344140771_n.jpg';
                            }}
                          />
                        ) : (
                          <Image
                            src="/522733693_1501063091226628_5759500172344140771_n.jpg"
                            alt="No image"
                            width={60}
                            height={60}
                            className={styles.assetImage}
                          />
                        )}
                      </td>
                      <td data-label="Asset Code" style={{ textAlign: 'center' }}>{highlightText(asset.asset_code || '', searchTerm || '')}</td>
                      <td data-label="Inventory No." style={{ textAlign: 'center' }}>{highlightText(asset.inventory_number || '', searchTerm || '')}</td>
                      <td data-label="Name">
                        <div className={styles.assetName}>{highlightText(asset.name || '', searchTerm || '')}</div>
                        <div className={styles.assetDescription}>{asset.description}</div>
                      </td>
                      <td data-label="Location" style={{ textAlign: 'center' }}>{highlightText((asset.location && (asset.room || '') ? `${asset.location} ${asset.room || ''}`.trim() : asset.location || asset.room || '-'), searchTerm || '')}</td>
                      <td data-label="Department">{highlightText(asset.department || '', searchTerm || '')}</td>
                      <td data-label="Status" style={{ textAlign: 'center' }}>
                        {asset.has_pending_transfer ? (
                          <span className={`${statusBadgeStyles.statusBadge} ${statusBadgeStyles.compact}`} style={{ background: '#facc15', color: '#fff' }}>
                            {getStatusDisplay(asset.status || '', false, undefined, true)}
                          </span>
                        ) : asset.has_pending_audit ? (
                          <span className={`${statusBadgeStyles.statusBadge} ${statusBadgeStyles.compact}`} style={{ background: '#facc15', color: '#fff' }}>
                            Pending
                          </span>
                        ) : (
                          <span className={`${statusBadgeStyles.statusBadge} compact`} style={{ 
                            background: asset.status_color ? `${asset.status_color}20` : '#f3f4f6', 
                            color: asset.status_color || '#6b7280' 
                          }}>
                            {getStatusDisplay(asset.status || '', asset.has_pending_audit || false, asset.pending_status || undefined, !!asset.has_pending_transfer)}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {patchedAssets.length === 0 && (
                <div className={styles.noResults}>
                  <p>No assets found</p>
                </div>
              )}
            </div>

            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            )}
          </>
        )}
      </section>

      {isPopupOpen && selectedAsset && (
        <AssetDetailPopup
          asset={selectedAsset}
          isOpen={isPopupOpen}
          onClose={handleClosePopup}
          onUpdate={handleAssetUpdate as any}
          isAdmin={false}
          isCreating={false}
        />
      )}
      {showViewOnlyNotice && canOnlyView && (
        <div className={styles.viewOnlyNotice}>
          <div className={styles.viewOnlyNoticeContent}>
            <button className={styles.noticeCloseBtn} onClick={() => setShowViewOnlyNotice(false)} title="Close notice">
              <AiOutlineClose />
            </button>
            <p><strong>View Only Mode:</strong> You can only view assets. Contact your administrator to assign a department for editing permissions.</p>
          </div>
        </div>
      )}
      <PrintLabelsModal
        open={showPrintModal}
        assets={filteredAssets}
        selectedAssetIds={selectedAssets}
        onClose={() => setShowPrintModal(false)}
        onPrint={handlePrintBulk}
        printType={printType}
        setPrintType={setPrintType}
        className={adminStyles.printModalOverlay}
      />
    </>
  );
};

export default AssetsTable;