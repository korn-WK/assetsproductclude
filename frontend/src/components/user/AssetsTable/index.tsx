import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import Image from 'next/image';
import { AiOutlineCalendar, AiOutlineDown, AiOutlineClose, AiOutlineCamera, AiOutlineDownload } from 'react-icons/ai';
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
import { useEffect as useEffectOrig, useState as useStateOrig } from 'react';
import { useStatusOptions } from '../../../lib/statusOptions';
import ExcelJS from 'exceljs';

interface Asset {
  id: string;
  asset_code: string;
  inventory_number: string;
  name: string;
  description: string;
  location: string;
  room: string;
  department: string;
  owner_id?: string;
  owner: string;
  status: string;
  image_url: string | null;
  acquired_date: string;
  created_at: string; // เพิ่ม field นี้
  updated_at?: string;
  has_pending_audit?: boolean; // เพิ่ม field นี้
  pending_status?: string; // เพิ่ม field นี้
  has_pending_transfer?: boolean; // เพิ่ม field นี้เพื่อแก้ลินเตอร์
}

interface AssetsTableProps {
  onScanBarcodeClick?: () => void;
  searchTerm?: string;
}

function highlightText(text: string, keyword: string) {
  if (!keyword) return text;
  const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.split(regex).map((part, i) =>
    part.toLowerCase() === keyword.toLowerCase() ? <mark key={i} style={{ background: '#ffe066', color: '#222', padding: 0 }}>{part}</mark> : part
  );
}

const AssetsTable: React.FC<AssetsTableProps> = ({ onScanBarcodeClick, searchTerm }) => {
  const { assets, loading, error, fetchAssets } = useAssets();
  const { departments, loading: dropdownLoading, error: dropdownError, fetchDropdownData } = useDropdown();
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isPopupOpen, setIsPopupOpen] = useState<boolean>(false);
  const itemsPerPage = 5;
  const [dateRange, setDateRange] = useState<{ startDate?: Date; endDate?: Date }>({});
  const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('All');
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 180 });
  const [isMobile, setIsMobile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const { options: statusOptions, loading: statusLoading } = useStatusOptions();
  const statusLabels = Object.fromEntries(statusOptions.map(opt => [opt.value, opt.label]));
  // Remove any hardcoded statusColors object

  const [showViewOnlyNotice, setShowViewOnlyNotice] = useState(true);
  const [pendingAudits, setPendingAudits] = useState<{ [assetId: string]: { status: string; note: string } | null }>({});
  // เพิ่ม hook สำหรับดึง asset_transfers pending ที่เกี่ยวข้องกับ asset ทั้งหมด
  const [pendingTransfers, setPendingTransfers] = useStateOrig<{ [assetId: string]: any }>({});

  // Check if user can edit (user with department)
  const canEdit = user && user.department_id !== null;

  // Check if user can only view (user without department)
  const canOnlyView = user && user.department_id === null;

  useEffectOrig(() => {
    fetchAssets();
  }, [fetchAssets]);

  useEffectOrig(() => {
    fetchDropdownData();
    // eslint-disable-next-line
  }, []);

  useEffectOrig(() => {
    if (selectedDepartment === 'All') {
      if (dateRange.startDate && dateRange.endDate) {
        fetchAssets({
          created_at_start: dateRange.startDate.toISOString(),
          created_at_end: dateRange.endDate.toISOString(),
        });
      } else {
        fetchAssets({});
      }
    } else {
      if (dateRange.startDate && dateRange.endDate) {
        fetchAssets({
          department: selectedDepartment,
          created_at_start: dateRange.startDate.toISOString(),
          created_at_end: dateRange.endDate.toISOString(),
        });
      } else {
        fetchAssets({ department: selectedDepartment });
      }
    }
    setCurrentPage(1);
    // eslint-disable-next-line
  }, [selectedDepartment, dateRange]);

  useEffectOrig(() => {
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
  useEffectOrig(() => {
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
  useEffectOrig(() => {
    if (!assets || assets.length === 0) return;
    const fetchTransfers = async () => {
      const res = await fetch('/api/asset-transfers?status=pending', { credentials: 'include' });
      const data = await res.json();
      console.log('DEBUG transfer API response:', data); // เพิ่ม log ตรงนี้
      // map asset_id เป็น key (string)
      const map: { [assetId: string]: any } = {};
      for (const t of data) {
        // handle asset_id เป็น number หรือ string
        map[String(t.asset_id)] = t;
      }
      console.log('DEBUG asset_transfers pending:', map); // <-- debug log
      setPendingTransfers(map);
    };
    fetchTransfers();
  }, [assets]);

  // Close dropdown when clicking outside
  useEffectOrig(() => {
    if (!showDepartmentDropdown) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        filterButtonRef.current &&
        !filterButtonRef.current.contains(event.target as Node)
      ) {
        setShowDepartmentDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDepartmentDropdown]);

  useEffectOrig(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 600);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffectOrig(() => {
    if (canOnlyView) {
      setShowViewOnlyNotice(true);
      const timer = setTimeout(() => setShowViewOnlyNotice(false), 10000);
      return () => clearTimeout(timer);
    }
  }, [canOnlyView]);

  const filteredAssets = assets.filter(asset => {
    const matchesStatus = activeFilter === 'All' || asset.status === activeFilter;
    const matchesDepartment = selectedDepartment === 'All' || asset.department === selectedDepartment;
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
      (asset.inventory_number || '').toLowerCase().includes(q) ||
      asset.name.toLowerCase().includes(q) ||
      asset.department.toLowerCase().includes(q) ||
      asset.location.toLowerCase().includes(q) ||
      (statusLabels[asset.status] || asset.status).toLowerCase().includes(q);
    return matchesStatus && matchesDepartment && matchesDate && matchesSearch;
  });

  const totalPages = Math.ceil(filteredAssets.length / itemsPerPage);
  const currentAssets = filteredAssets.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Patch assets to always have inventory_number and room as string
  const patchedAssets = currentAssets.map(asset => {
    const hasTransfer = !!pendingTransfers[String(asset.id)];
    if (hasTransfer) {
      console.log('DEBUG asset transferring:', asset.id, asset.name);
    }
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
    if (hasPendingTransfer) return styles.statusTransferring;
    if (hasPending) return styles.statusPending;
    switch (status) {
      case 'พร้อมใช้งาน': return styles.statusActive;
      case 'รอใช้งาน': return styles.statusPending;
      case 'รอตัดจำหน่าย': return styles.statusPending;
      case 'ชำรุด': return styles.statusBroken;
      case 'รอซ่อม': return styles.statusPending;
      case 'ระหว่างการปรับปรุง': return styles.statusPending;
      case 'ไม่มีความจำเป็นต้องใช้': return styles.statusDisposed;
      case 'สูญหาย': return styles.statusMissing;
      case 'รอแลกเปลี่ยน': return styles.statusPending;
      case 'แลกเปลี่ยน': return styles.statusPending;
      case 'มีกรรมสิทธิ์ภายใต้สัญญาเช่า': return styles.statusPending;
      case 'รอโอนย้าย': return styles.statusPending;
      case 'รอโอนกรรมสิทธิ์': return styles.statusPending;
      case 'ชั่วคราว': return styles.statusPending;
      case 'ขาย': return styles.statusDisposed;
      case 'แปรสภาพ': return styles.statusPending;
      case 'ทำลาย': return styles.statusDisposed;
      case 'สอบข้อเท็จจริง': return styles.statusPending;
      case 'เงินชดเชยที่ดินและอาสิน': return styles.statusDisposed;
      case 'ระหว่างทาง': return styles.statusPending;
      default: return '';
    }
  };
  const getStatusDisplay = (status: string, hasPending: boolean, pendingStatus?: string, hasPendingTransfer?: boolean) => {
    if (hasPendingTransfer) return 'Transferring';
    if (hasPending && pendingStatus) return 'Pending';
    switch (status) {
      case 'พร้อมใช้งาน': return 'พร้อมใช้งาน';
      case 'รอใช้งาน': return 'รอใช้งาน';
      case 'รอตัดจำหน่าย': return 'รอตัดจำหน่าย';
      case 'ชำรุด': return 'ชำรุด';
      case 'รอซ่อม': return 'รอซ่อม';
      case 'ระหว่างการปรับปรุง': return 'ระหว่างการปรับปรุง';
      case 'ไม่มีความจำเป็นต้องใช้': return 'ไม่มีความจำเป็นต้องใช้';
      case 'สูญหาย': return 'สูญหาย';
      case 'รอแลกเปลี่ยน': return 'รอแลกเปลี่ยน';
      case 'แลกเปลี่ยน': return 'แลกเปลี่ยน';
      case 'มีกรรมสิทธิ์ภายใต้สัญญาเช่า': return 'มีกรรมสิทธิ์ภายใต้สัญญาเช่า';
      case 'รอโอนย้าย': return 'รอโอนย้าย';
      case 'รอโอนกรรมสิทธิ์': return 'รอโอนกรรมสิทธิ์';
      case 'ชั่วคราว': return 'ชั่วคราว';
      case 'ขาย': return 'ขาย';
      case 'แปรสภาพ': return 'แปรสภาพ';
      case 'ทำลาย': return 'ทำลาย';
      case 'สอบข้อเท็จจริง': return 'สอบข้อเท็จจริง';
      case 'เงินชดเชยที่ดินและอาสิน': return 'เงินชดเชยที่ดินและอาสิน';
      case 'ระหว่างทาง': return 'ระหว่างทาง';
      default: return status;
    }
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

  // Show dropdown below the button using portal
  const handleShowDropdown = () => {
    if (filterButtonRef.current) {
      const rect = filterButtonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
    setShowDepartmentDropdown((prev) => !prev);
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

  // เพิ่มฟังก์ชัน export XLSX
  const handleExportXLSX = async () => {
    if (!filteredAssets || filteredAssets.length === 0) return;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Assets');
    worksheet.addRow([
      'Asset Code',
      'Inventory No.',
      'Name',
      'Description',
      'Location',
      'Department',
      'Status',
      'Acquired Date',
      'Created At',
    ]);
    filteredAssets.forEach(asset => {
      const a = asset as Asset;
      worksheet.addRow([
        a.asset_code || '-',
        a.inventory_number || '-',
        a.name || '-',
        a.description || '-',
        a.location && a.room ? `${a.location} ${a.room}`.trim() : (a.location || a.room || '-'),
        a.department || '-',
        statusLabels[a.status] || a.status || '-',
        a.acquired_date || '-',
        a.created_at || '-',
      ]);
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
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'assets_browser.xlsx';
    a.click();
    window.URL.revokeObjectURL(url);
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
      <section
        className={styles.assetsSection}
        style={isMobile ? { padding: '1rem', marginTop: 40 } : { padding: '2rem' }}
      >
        {isMobile ? (
          <>
            <div className="filterRow" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0 0.5rem 0.5rem 0.5rem' }}>
              <DateRangeFilterButton
                value={dateRange}
                onChange={setDateRange}
                label="เลือกช่วงวันที่"
              />
              <div style={{ position: 'relative' }}>
                <button
                  className={styles.filterDropdown + ' ' + styles.statusDropdown}
                  onClick={() => setShowStatusDropdown(v => !v)}
                  style={{ minWidth: 120, width: 120 }}
                >
                  {statusOptions.find(opt => opt.value === activeFilter)?.label || 'Status'}
                  <AiOutlineDown className={styles.dropdownIcon} />
                </button>
                {showStatusDropdown && (
                  <div className={styles.customDropdown} style={{ position: 'absolute', top: '110%', left: 0, right: 0, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', zIndex: 10 }}>
                    {statusOptions.map(opt => (
                      <div
                        key={opt.value}
                        style={{ padding: '0.6rem 1rem', cursor: 'pointer', color: activeFilter === opt.value ? '#6366f1' : '#222', background: activeFilter === opt.value ? '#f3f4f6' : 'transparent' }}
                        onClick={() => {
                          setActiveFilter(opt.value);
                          setShowStatusDropdown(false);
                          setCurrentPage(1);
                        }}
                      >
                        {opt.label}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {(user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'superadmin') && (
                <button
                  className={styles.exportXlsxButtonSmall}
                  style={{ minWidth: 44, width: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}
                  onClick={handleExportXLSX}
                  title="Export XLSX"
                >
                  <AiOutlineDownload style={{ fontSize: '1.2em' }} />
                  Export
                </button>
              )}
              {onScanBarcodeClick && (
                <button
                  className={styles.iconButton}
                  onClick={onScanBarcodeClick}
                  title="สแกนบาร์โค้ด"
                  style={{ minWidth: 44, width: 44 }}
                >
                  <AiOutlineCamera />
                </button>
              )}
            </div>
            <div style={{ padding: '0 0.5rem 0.5rem 0.5rem' }}>
              <input
                type="text"
                placeholder="Search assets..."
                className={styles.mobileSearchInput}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <div className={styles.assetCardList}>
              {patchedAssets.map(asset => (
                <div className={styles.assetCard} key={asset.id} onClick={() => handleAssetClick(asset)}>
                  <img src={asset.image_url || '/file.svg'} alt={asset.name} className={styles.assetCardImage} />
                  <div className={styles.assetCardContent}>
                    <div className={styles.assetCardTitle}>{highlightText(asset.name, searchQuery || '')}</div>
                    <div className={styles.assetCardMetaRow}>
                      <span className={styles.assetId}><b>ID:</b> {highlightText(asset.asset_code, searchQuery || '')}</span>
                    </div>
                    <div className={styles.assetCardMetaRow}>
                      <span><b>Location:</b> {highlightText(asset.location && (asset.room || '') ? `${asset.location} ${asset.room || ''}`.trim() : asset.location || asset.room || '-', searchQuery || '')}</span>
                    </div>
                    <div className={styles.assetCardMetaRow}>
                      <span><b>Department:</b> {highlightText(asset.department, searchQuery || '')}</span>
                    </div>
                    <div className={styles.assetCardMetaRow}>
                      <span><b>Status:</b> <span className={`${styles.statusBadge} ${getStatusClass(asset.status, asset.has_pending_audit || false, !!asset.has_pending_transfer)}`}>{highlightText(getStatusDisplay(asset.status, asset.has_pending_audit || false, asset.pending_status, !!asset.has_pending_transfer), searchQuery || '')}</span></span>
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
            <div className={styles.assetsHeader}>
              <div>
                <p className={styles.totalAssets}>Total {assets.length} assets</p>
              </div>
            </div>

            <div className={styles.assetsControls}>
              <div className={styles.searchAndFilters}>
                {!isMobile && (
                  <div className={styles.statusFilters}>
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <select
                        className={styles.filterDropdown}
                        value={activeFilter}
                        onChange={e => {
                          setActiveFilter(e.target.value);
                          setCurrentPage(1);
                        }}
                      >
                        <option value="All">All Status</option>
                        {statusOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <span className={styles.caretIcon}><AiOutlineDown /></span>
                    </div>
                  </div>
                )}
              </div>
              <div className={styles.rightControls} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <DateRangeFilterButton
                  value={dateRange}
                  onChange={setDateRange}
                  label="เลือกช่วงวันที่"
                />
                {(user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'superadmin') && (
                  <button
                    className={styles.exportXlsxButton}
                    style={{ marginLeft: 8, display: 'flex', alignItems: 'center', gap: 8 }}
                    onClick={handleExportXLSX}
                    title="Export XLSX"
                  >
                    <AiOutlineDownload style={{ fontSize: '1.3em' }} />
                    Export XLSX
                  </button>
                )}
                {onScanBarcodeClick && (
                  <button
                    className={styles.iconButton}
                    onClick={onScanBarcodeClick}
                    title="สแกนบาร์โค้ด"
                    style={{minWidth: 0, marginLeft: 8}}
                  >
                    <AiOutlineCamera />
                  </button>
                )}
              </div>
            </div>

            <div className={styles.assetsTableContainer}>
              <table className={`${styles.assetsTable} compact`}>
                <thead>
                  <tr>
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
                              target.src = '/file.svg';
                            }}
                          />
                        ) : (
                          <Image
                            src="/file.svg"
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
                      <td data-label="Location" style={{ textAlign: 'center' }}>{highlightText(asset.location && (asset.room || '') ? `${asset.location} ${asset.room || ''}`.trim() : asset.location || asset.room || '-', searchTerm || '')}</td>
                      <td data-label="Department">{highlightText(asset.department || '', searchTerm || '')}</td>
                      <td data-label="Status" style={{ textAlign: 'center' }}>
                        {asset.has_pending_transfer ? (
                          <span className={`${styles.statusBadge} compact`} style={{ background: '#facc15', color: '#fff' }}>
                            {highlightText(getStatusDisplay(asset.status, false, undefined, true), searchTerm || '')}
                          </span>
                        ) : pendingAudits[asset.id] ? (
                          <span className={`${styles.statusBadge} compact`} style={{ background: '#facc15', color: '#fff' }}>
                            {highlightText('Pending', searchTerm || '')}
                          </span>
                        ) : (
                          <span className={`${styles.statusBadge} compact`} style={{ background: (statusOptions.find(opt => opt.value === asset.status)?.color) || '#adb5bd' }}>
                            {highlightText(getStatusDisplay(asset.status, asset.has_pending_audit || false, asset.pending_status || undefined, !!asset.has_pending_transfer), searchTerm || '')}
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
    </>
  );
};

export default AssetsTable;