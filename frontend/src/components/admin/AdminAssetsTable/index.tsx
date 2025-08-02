import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { AiOutlineCalendar, AiOutlinePlus, AiOutlineSearch, AiOutlineDown, AiOutlineCamera, AiOutlineDownload } from 'react-icons/ai';
import Swal from 'sweetalert2';
import styles from './AdminAssetsTable.module.css';
import Pagination from '../../common/Pagination';
import AssetDetailPopup from '../../common/AssetDetailPopup';
import { useAssets } from '../../../contexts/AssetContext';
import { formatDate } from '../../../lib/utils';
import dayjs from 'dayjs';
import { useDropdown } from '../../../contexts/DropdownContext';
import DateRangeFilterButton from '../../common/DateRangeFilterButton';
import { useStatusOptions } from '../../../lib/statusOptions';
import ExcelJS from 'exceljs';
import { highlightText } from '../../common/highlightText';
import { Asset } from '../../../common/types/asset';
import { printBulkLabels } from '../../../common/printUtils';
import statusBadgeStyles from '../../common/statusBadge.module.css';

interface AdminAssetsTableProps {
  onScanBarcodeClick?: () => void;
  searchTerm: string;
  onSearch: (value: string) => void;
  initialStatusFilter?: string; // Added prop
}

const AdminAssetsTable: React.FC<AdminAssetsTableProps> = ({ onScanBarcodeClick, searchTerm, onSearch, initialStatusFilter }) => {
  const { assets, loading, error, fetchAssets, updateAsset, refreshAssets, pauseAutoRefresh, resumeAutoRefresh } = useAssets();
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isPopupOpen, setIsPopupOpen] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const itemsPerPage = 5; // Admin can see more items per page
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('All');
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 180 });
  const { options: statusOptions, loading: statusLoading } = useStatusOptions();
  const statusLabels = Object.fromEntries(statusOptions.map(opt => [opt.value, opt.label]));
  const { departments, loading: dropdownLoading, error: dropdownError, fetchDropdownData } = useDropdown();
  const [dateRange, setDateRange] = useState<{ startDate?: Date; endDate?: Date }>({});
  const [pendingTransfers, setPendingTransfers] = useState<{ [assetId: string]: any }>({});
  
  // Multi-select states
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printType, setPrintType] = useState<'barcode' | 'qrcode'>('barcode');

  // Auto-refresh states
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date());
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const focusRefreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle initialStatusFilter prop
  useEffect(() => {
    if (initialStatusFilter) {
      setActiveFilter(initialStatusFilter);
    }
  }, [initialStatusFilter]);



  // Fetch assets from context when the component mounts
  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // ฟังก์ชันสำหรับ refresh pending data
  const refreshPendingData = useCallback(async () => {
    if (!assets || assets.length === 0) return;
    
    // Refresh pending transfers
    const fetchTransfers = async () => {
      const res = await fetch('/api/asset-transfers?status=pending', { credentials: 'include' });
      const data = await res.json();
      const map: { [assetId: string]: any } = {};
      for (const t of data) {
        map[String(t.asset_id)] = t;
      }
      setPendingTransfers(map);
    };
    
    // Refresh pending audits
    const fetchAudits = async () => {
      try {
        const res = await fetch('/api/assets/audits/list', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          const auditMap: { [assetId: string]: any } = {};
          for (const audit of data) {
            if (!audit.confirmed && audit.asset_id) {
              auditMap[String(audit.asset_id)] = audit;
            }
          }
          // Note: We don't have pendingAudits state in AdminAssetsTable, but we can add it if needed
        }
      } catch (error) {
        console.error('Error fetching pending audits:', error);
      }
    };
    
    await Promise.all([fetchTransfers(), fetchAudits()]);
  }, [assets]);

  // Auto-refresh only when data changes (using polling with longer interval)
  useEffect(() => {
    const startAutoRefresh = () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
      
      // Check for updates every 10 minutes instead of frequent polling
      autoRefreshIntervalRef.current = setInterval(async () => {
        if (isPageVisible) {
          try {
            // Only refresh if there might be updates (reduced frequency)
            await refreshAssets();
            await refreshPendingData();
            setLastRefreshTime(new Date());
          } catch (error) {
            console.error('❌ Auto-refresh error:', error);
            // Don't show error to user for auto-refresh failures
          }
        }
      }, 600000); // 10 minutes - production setting
    };

    startAutoRefresh();

    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
    };
  }, [isPageVisible, refreshAssets, refreshPendingData]);

  // Manual refresh trigger when user performs actions
  const triggerManualRefresh = useCallback(async () => {
    try {
      await refreshAssets();
      await refreshPendingData();
      setLastRefreshTime(new Date());
    } catch (error) {
      console.error('Manual refresh error:', error);
    }
  }, [refreshAssets, refreshPendingData]);

  // Focus/Visibility Detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      setIsPageVisible(isVisible);
      
      if (isVisible) {
        // Clear any existing timeout
        if (focusRefreshTimeoutRef.current) {
          clearTimeout(focusRefreshTimeoutRef.current);
        }
        
        // Refresh data immediately when tab becomes visible
        refreshAssets();
        refreshPendingData();
        setLastRefreshTime(new Date());
        
        // Also refresh after a short delay to ensure we get the latest data
        focusRefreshTimeoutRef.current = setTimeout(() => {
          refreshAssets();
          refreshPendingData();
        }, 1000);
      }
    };

    const handleFocus = () => {
      if (isPageVisible) {
        // Only refresh if popup is not open to prevent refresh loops
        if (!isPopupOpen) {
          refreshAssets();
          refreshPendingData();
          setLastRefreshTime(new Date());
        }
      }
    };

    // Disable focus refresh when popup is open
    const handleFocusWithPopupCheck = () => {
      if (isPageVisible && !isPopupOpen) {
        refreshAssets();
        refreshPendingData();
        setLastRefreshTime(new Date());
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (focusRefreshTimeoutRef.current) {
        clearTimeout(focusRefreshTimeoutRef.current);
      }
    };
  }, [isPageVisible, refreshAssets, refreshPendingData]);

  // Temporarily disable focus refresh to prevent loops
  // useEffect(() => {
  //   if (!isPopupOpen) {
  //     console.log('🔍 Adding focus listener - popup closed');
  //     window.addEventListener('focus', handleFocusWithPopupCheck);
  //   } else {
  //     console.log('⏸️ Removing focus listener - popup open');
  //     window.removeEventListener('focus', handleFocusWithPopupCheck);
  //   }

  //   return () => {
  //     window.removeEventListener('focus', handleFocusWithPopupCheck);
  //   };
  // }, [isPopupOpen, handleFocusWithPopupCheck]);

  // ดึง transfer pending ทั้งหมด (superadmin เห็นทุก transfer)
  useEffect(() => {
    if (!assets || assets.length === 0) return;
    const fetchTransfers = async () => {
      const res = await fetch('/api/asset-transfers?status=pending', { credentials: 'include' });
      const data = await res.json();
      const map: { [assetId: string]: any } = {};
      for (const t of data) {
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
    fetchDropdownData();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (selectedDepartment === 'All') {
      if (selectedDate) {
        fetchAssets({ acquired_date: selectedDate });
      } else {
        fetchAssets({});
      }
    } else {
      if (selectedDate) {
        fetchAssets({ department: selectedDepartment, acquired_date: selectedDate });
      } else {
        fetchAssets({ department: selectedDepartment });
      }
    }
    setCurrentPage(1);
    // eslint-disable-next-line
  }, [selectedDepartment]);

  useEffect(() => {
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

  // Patch assets to always have inventory_number and room as string
  const patchedAssets = assets.map(asset => {
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

  const filteredAssets = patchedAssets.filter(asset => {
    // Fix: Use statusLabels to map from label to value for filtering
    const matchesStatus = activeFilter === 'All' || asset.status === activeFilter;
    
    // console.log('AdminAssetsTable: Filtering asset:', asset.name, 'status:', asset.status, 'activeFilter:', activeFilter, 'matchesStatus:', matchesStatus);
    
    const matchesDepartment = selectedDepartment === 'All' || asset.department === selectedDepartment;
    // Filter by createdAt (ช่วงวันที่)
    let matchesDate = true;
    if (dateRange.startDate && dateRange.endDate && (asset as any).created_at) {
      const created = new Date((asset as any).created_at);
      const start = new Date(dateRange.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(dateRange.endDate);
      end.setHours(23, 59, 59, 999);
      matchesDate = created >= start && created <= end;
    }
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch = !q ||
      asset.asset_code.toLowerCase().includes(q) ||
      (asset.inventory_number || '').toLowerCase().includes(q) ||
      asset.name.toLowerCase().includes(q) ||
      (asset.department?.toLowerCase() || '').includes(q) ||
              (asset.location?.toLowerCase() || '').includes(q);
    return matchesStatus && matchesDepartment && matchesDate && matchesSearch;
  });

  const totalPages = Math.ceil(filteredAssets.length / itemsPerPage);
  const currentAssets = filteredAssets.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // ปรับ getStatusClass และ getStatusDisplay ให้รองรับ transferring แบบ virtual
  const getStatusClass = (status: string, hasPending: boolean, hasPendingTransfer: boolean) => {
    if (hasPendingTransfer) return styles.statusTransferring;
    if (hasPending) return styles.statusPending;
    switch (status) {
      case 'active': return styles.statusActive;
      case 'transferring': return styles.statusTransferring;
      case 'audited': return styles.statusAudited;
      case 'missing': return styles.statusMissing;
      case 'broken': return styles.statusBroken;
      case 'disposed': return styles.statusDisposed;
      case 'no_longer_required': return styles.statusDisposed; // ใช้สีเทา
      default: return '';
    }
  };
  // ใช้ statusLabels ในการแสดงผล status
  const getStatusDisplay = (status: string, hasPending: boolean, pendingStatus?: string, hasPendingTransfer?: boolean) => {
    if (hasPendingTransfer) return 'Transferring';
    if (hasPending && pendingStatus) return 'Pending';
    return statusLabels[status] || status;
  };

  const handleAssetClick = (asset: Asset) => {
    // Pause auto-refresh immediately when clicking to open popup
    pauseAutoRefresh();
    
    setIsCreating(false);
    setSelectedAsset({
      ...asset,
      inventory_number: asset.inventory_number || '',
      room: asset.room || '',
    });
    setIsPopupOpen(true);
  };

  const handleClosePopup = () => {
    setIsPopupOpen(false);
    setSelectedAsset(null);
    setIsCreating(false);
    
    // Resume auto-refresh when closing popup
    resumeAutoRefresh();
  };

  const handleAssetUpdate = (updatedAsset: Asset) => {
    // Update the asset in context immediately
    updateAsset(updatedAsset);
    
    // Update the selected asset with the updated data
    setSelectedAsset(updatedAsset);
    
    // Close the popup
    handleClosePopup();
    
    // Show success message
    Swal.fire({
      title: 'Updated!',
      text: 'Asset has been updated successfully.',
      icon: 'success',
      timer: 1500,
      showConfirmButton: false
    });
  };

  const handleDeleteAsset = async (assetId: string) => {
    try {
      const response = await fetch(`/api/assets/${assetId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        Swal.fire({
          title: 'Deleted!',
          text: 'The asset has been deleted.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
        refreshAssets(); // Refresh the list using context
        refreshPendingData(); // Refresh pending data
        handleClosePopup(); // Close the popup after successful deletion
      } else {
        Swal.fire({
          title: 'Error!',
          text: 'Failed to delete asset.',
          icon: 'error'
        });
      }
    } catch (error) {
      console.error('Error deleting asset:', error);
      Swal.fire({
        title: 'Error!',
        text: 'Failed to delete asset.',
        icon: 'error'
      });
    }
  };

  const handleCreateAsset = () => {
    // Generates a local datetime string in the "YYYY-MM-DDTHH:mm" format,
    // which is required by the datetime-local input.
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const initialAcquiredDate = `${year}-${month}-${day}T${hours}:${minutes}`;

    setSelectedAsset({
      id: '',
      asset_code: '',
      inventory_number: '',
      name: '',
      description: '',
      location: '',
      room: '',
      department: '',
      owner_id: '',
      owner: '',
      status: 'active',
      image_url: null,
      acquired_date: initialAcquiredDate,
      created_at: '',
      updated_at: '',
    });
    setIsCreating(true);
    setIsPopupOpen(true);
  };

  const handleAssetCreate = (newAsset: Asset) => {
    // Trigger manual refresh to get latest data
    triggerManualRefresh();
    
    // Close the popup
    handleClosePopup();
    
    // Show success message
    Swal.fire({
      title: 'Created!',
      text: 'Asset has been created successfully.',
      icon: 'success',
      timer: 1500,
      showConfirmButton: false
    });
  };

  const handleSearch = () => {
    // Implement search functionality
    // console.log('Searching for:', searchTerm);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

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

  // Export XLSX logic (reuse from ReportAssetsTable)
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
      worksheet.addRow([
        asset.asset_code || '-',
        asset.inventory_number || '-',
        asset.name || '-',
        asset.description || '-',
        asset.location && asset.room ? `${asset.location} ${asset.room}`.trim() : (asset.location || asset.room || '-'),
        asset.department || '-',
        statusLabels[asset.status || ''] || asset.status || '-',
        asset.acquired_date || '-',
        asset.created_at || '-',
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
    a.download = 'assets_management.xlsx';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Multi-select functions
  const handleSelectAsset = (assetId: string) => {
    const newSelected = new Set(selectedAssets);
    if (newSelected.has(assetId)) {
      newSelected.delete(assetId);
    } else {
      newSelected.add(assetId);
    }
    setSelectedAssets(newSelected);
  };

  const handleSelectAll = () => {
    // Check if all filtered assets are selected
    const allFilteredAssetIds = new Set(filteredAssets.map(asset => asset.id));
    const allSelected = filteredAssets.every(asset => selectedAssets.has(asset.id));
    
    if (allSelected) {
      // Deselect all filtered assets
      const newSelectedAssets = new Set(selectedAssets);
      filteredAssets.forEach(asset => newSelectedAssets.delete(asset.id));
      setSelectedAssets(newSelectedAssets);
    } else {
      // Select all filtered assets
      setSelectedAssets(new Set([...selectedAssets, ...filteredAssets.map(asset => asset.id)]));
    }
  };

  const handlePrintSelected = () => {
    if (selectedAssets.size === 0) {
      Swal.fire({
        title: 'No Assets Selected',
        text: 'Please select at least one asset to print.',
        icon: 'warning'
      });
      return;
    }
    setShowPrintModal(true);
  };

  const handlePrintBulk = async () => {
    const selectedAssetList = filteredAssets.filter(asset => selectedAssets.has(asset.id));
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
          <h2>Admin Assets</h2>
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
          <h2>Admin Assets</h2>
        </div>
        <div className={styles.errorState}>
          <p>Error: {error}</p>
        </div>
      </section>
    );
  }

  const selectedDepartmentLabel = selectedDepartment === 'All'
    ? 'Filter'
    : (() => {
        const name = departments.find(d => d.name_th === selectedDepartment)?.name_th || selectedDepartment;
        return name.length > 13? name.slice(0, 13) + '...' : name;
      })();

  return (
    <>
      <section className={styles.assetsSection}>
        {isMobile ? (
          <>
            <div style={{padding: '0.5rem 0.5rem 0 0.5rem'}}>
              <p className={styles.totalAssets}>Total {assets.length} assets</p>
              <p className={styles.listOfEquipment}>Complete asset management for administrators</p>
            </div>
            {/* Row 1: calendar, status, filter */}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0 0.5rem 0.3rem 0.5rem', marginBottom: 4 }}>
              <DateRangeFilterButton
                value={dateRange}
                onChange={setDateRange}
                label=""
              />
              <div style={{ position: 'relative', flex: 1 }}>
                <button
                  className={styles.filterDropdown}
                  onClick={() => setShowStatusDropdown(v => !v)}
                  style={{ minWidth: 0, width: '100%' }}
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
              <div style={{ position: 'relative', flex: 1 }}>
                <button
                  className={styles.filterDropdown}
                  onClick={handleShowDropdown}
                  ref={filterButtonRef}
                  style={{minWidth: 0, width: '100%'}}>
                  {selectedDepartmentLabel}
                  <AiOutlineDown className={styles.dropdownIcon} />
                </button>
                {showDepartmentDropdown && (
                  <div className={styles.customDropdown} style={{ position: 'absolute', top: '110%', left: 0, right: 0, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', zIndex: 10 }}>
                    <div
                      style={{ padding: '0.6rem 1rem', cursor: 'pointer', color: selectedDepartment === 'All' ? '#6366f1' : '#222', background: selectedDepartment === 'All' ? '#f3f4f6' : 'transparent' }}
                      onClick={() => {
                        setSelectedDepartment('All');
                        setShowDepartmentDropdown(false);
                        setCurrentPage(1);
                      }}
                    >
                      All Departments
                    </div>
                    {departments.map(dep => (
                      <div
                        key={dep.id}
                        style={{ padding: '0.6rem 1rem', cursor: 'pointer', color: selectedDepartment === dep.name_th ? '#6366f1' : '#222', background: selectedDepartment === dep.name_th ? '#f3f4f6' : 'transparent' }}
                        onClick={() => {
                          setSelectedDepartment(dep.name_th);
                          setShowDepartmentDropdown(false);
                          setCurrentPage(1);
                        }}
                      >
                        {dep.name_th}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {/* Row 2: export, add new, camera */}
            {selectedAssets.size > 0 && (
              <div style={{ 
                marginBottom: '8px', 
                fontSize: '11px', 
                color: '#6b7280',
                textAlign: 'center',
                fontStyle: 'italic',
                padding: '0 0.5rem'
              }}>
                {selectedAssets.size} asset{selectedAssets.size !== 1 ? 's' : ''} selected across all pages
              </div>
            )}
            <div className={styles.mobileActionRow}>
              <button className={styles.exportXlsxButtonSmall + ' ' + styles.mobileFull} onClick={handleExportXLSX}>
                <AiOutlineDownload style={{ fontSize: '1.3em' }} />
                Export
              </button>
                            <button
                className={styles.printButtonSmall + ' ' + styles.mobileFull}
                onClick={handlePrintSelected}
                disabled={selectedAssets.size === 0}
              >
                Print ({selectedAssets.size})
              </button>
              <button
                className={styles.createButton + ' ' + styles.mobileFull}
                onClick={handleCreateAsset}
              >
                <AiOutlinePlus style={{ fontSize: '1.3em' }} />
                Add New
              </button>
              {onScanBarcodeClick && (
                <button
                  className={styles.iconButton + ' ' + styles.mobileFull}
                  onClick={onScanBarcodeClick}
                  title="สแกนบาร์โค้ด"
                >
                  <AiOutlineCamera style={{ fontSize: '1.3em' }} />
                </button>
              )}
            </div>
            {/* Row 3: search box */}
            <div style={{padding: '0 0.5rem 0.5rem 0.5rem'}}>
              <input
                type="text"
                placeholder="Search assets..."
                className={styles.mobileSearchInput}
                value={searchTerm}
                onChange={e => onSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                style={{width: '100%'}} />
            </div>
            <div className={styles.assetCardList}>
              {currentAssets.map(asset => (
                <div 
                  className={styles.assetCard} 
                  key={asset.id}
                  onClick={() => handleAssetClick(asset)}
                  style={{ cursor: 'pointer' }}
                >
                  <div style={{ 
                    position: 'absolute', 
                    top: '10px', 
                    right: '10px', 
                    zIndex: 10 
                  }}>
                    <input
                      type="checkbox"
                      checked={selectedAssets.has(asset.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleSelectAsset(asset.id);
                      }}
                      onClick={e => e.stopPropagation()}
                      style={{ width: '16px', height: '16px' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', width: '100%', alignItems: 'center' }}>
                    <div style={{ flexShrink: 0 }}>
                      <img 
                        src={asset.image_url || '/522733693_1501063091226628_5759500172344140771_n.jpg'} 
                        alt={asset.name} 
                        className={styles.assetCardImage}
                        style={{ marginTop: 0, marginRight: 0 }}
                      />
                    </div>
                    <div className={styles.assetCardContent} style={{ flex: 1, paddingRight: '2rem' }}>
                      <div className={styles.assetCardTitle}>{highlightText(asset.name, searchTerm || '')}</div>
                      <div className={styles.assetCardMetaRow}>
                        <span className={styles.assetId}><b>Asset Code:</b> {highlightText(asset.asset_code, searchTerm || '')}</span>
                      </div>
                      <div className={styles.assetCardMetaRow}>
                        <span><b>Inventory No.:</b> {highlightText(asset.inventory_number || '-', searchTerm || '')}</span>
                      </div>
                      <div className={styles.assetCardMetaRow}>
                        <span><b>Location:</b> {highlightText(asset.location && (asset.room || '') ? `${asset.location} ${asset.room || ''}`.trim() : asset.location || asset.room || '-', searchTerm || '')}</span>
                      </div>
                      <div className={styles.assetCardMetaRow}>
                        <span><b>Department:</b> {highlightText(asset.department || '', searchTerm || '')}</span>
                      </div>
                      <div className={styles.assetCardMetaRow}>
                        <span><b>Status:</b> 
                          {asset.has_pending_transfer ? (
                            <span className={`${statusBadgeStyles.statusBadge} compact`} style={{ background: '#facc15', color: '#fff' }}>
                              {getStatusDisplay(asset.status || '', false, undefined, true)}
                            </span>
                          ) : asset.has_pending_audit ? (
                            <span className={`${statusBadgeStyles.statusBadge} compact`} style={{ background: '#facc15', color: '#fff' }}>
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
                        </span>
                      </div>
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
                <p className={styles.listOfEquipment}>Complete asset management for administrators</p>
              </div>
              
            </div>

            <div className={styles.assetsControls}>
              <div className={styles.searchAndFilters}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <div className={styles.dropdownWrapper}>
                    <select
                      className={styles.departmentDropdown}
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
                  <div className={styles.dropdownWrapper}>
                    <select
                      className={styles.departmentDropdown}
                      value={selectedDepartment}
                      onChange={e => {
                        setSelectedDepartment(e.target.value);
                        setCurrentPage(1);
                      }}
                    >
                      <option value="All">All Departments</option>
                      {departments.map(dep => (
                        <option key={dep.id} value={dep.name_th}>{dep.name_th}{dep.name_en ? ` (${dep.name_en})` : ''}</option>
                      ))}
                    </select>
                    <span className={styles.caretIcon}><AiOutlineDown /></span>
                  </div>
                </div>
              </div>
              <div className={styles.rightControls}>
                <DateRangeFilterButton
                  value={dateRange}
                  onChange={setDateRange}
                  label="เลือกช่วงวันที่"
                />
                {selectedDate && (
                  <button
                    className={styles.iconButton}
                    style={{
                      height: '40px',
                      fontSize: '1.1rem',
                      padding: '0.8rem 1.2rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                    }}
                    onClick={() => setSelectedDate(null)}
                    title="Clear date filter"
                  >
                    Clear
                  </button>
                )}
                {onScanBarcodeClick && (
                  <button
                    className={styles.iconButton}
                    onClick={onScanBarcodeClick}
                    title="สแกนบาร์โค้ด"
                    style={{ display: 'inline-flex', alignItems: 'center', height: '44px', fontSize: '1.1rem', padding: '0.8rem 1.2rem' }}
                  >
                    <AiOutlineCamera />
                  </button>
                )}
                <button 
                  className={styles.printButton} 
                  onClick={handlePrintSelected}
                  disabled={selectedAssets.size === 0}
                >
                  Print ({selectedAssets.size})
                </button>
                <button className={styles.exportXlsxButton} onClick={handleExportXLSX}>
                  <AiOutlineDownload style={{ fontSize: '1.3em', marginRight: 8 }} />
                  Export XLSX
                </button>
                <button className={styles.createButton} onClick={handleCreateAsset}>
                  <AiOutlinePlus /> Add New 
                </button>
              </div>
            </div>
            
            <div className={styles.assetsTableContainer}>
              {selectedAssets.size > 0 && (
                <div style={{ 
                  marginBottom: '8px', 
                  fontSize: '12px', 
                  color: '#6b7280',
                  textAlign: 'center',
                  fontStyle: 'italic'
                }}>
                  {selectedAssets.size} asset{selectedAssets.size !== 1 ? 's' : ''} selected across all pages
                </div>
              )}
              <table className={`${styles.assetsTable} compact`}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'center', width: '50px' }}>
                      <input
                        type="checkbox"
                        checked={filteredAssets.every(asset => selectedAssets.has(asset.id)) && filteredAssets.length > 0}
                        onChange={e => { 
                          e.stopPropagation(); 
                          handleSelectAll(); 
                        }}
                        onClick={e => e.stopPropagation()}
                        style={{ width: '16px', height: '16px' }}
                      />
                    </th>
                    <th style={{ textAlign: 'center' }}>Image</th>
                    <th style={{ textAlign: 'center' }}>Asset Code</th>
                    <th style={{ textAlign: 'center' }}>Inventory No.</th>
                    <th style={{ textAlign: 'center' }}>Name</th>
                    <th style={{ textAlign: 'center' }}>Location</th>
                    <th style={{ textAlign: 'center' }}>Department</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {currentAssets.map(asset => (
                    <tr 
                      key={asset.id} 
                      className={styles.clickableRow}
                      onClick={() => handleAssetClick(asset)}
                    >
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={selectedAssets.has(asset.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleSelectAsset(asset.id);
                          }}
                          onClick={e => e.stopPropagation()}
                          style={{ width: '16px', height: '16px' }}
                        />
                      </td>
                      <td 
                        data-label="Image" 
                        style={{ textAlign: 'center' }}
                      >
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
                      <td data-label="Asset Code" style={{ textAlign: 'center' }}>{highlightText(asset.asset_code, searchTerm || '')}</td>
                      <td data-label="Inventory No." style={{ textAlign: 'center' }}>{highlightText(asset.inventory_number || '-', searchTerm || '')}</td>
                      <td data-label="Name">{/* left-aligned for readability */}
                        <div className={styles.assetName}>{highlightText(asset.name, searchTerm || '')}</div>
                        <div className={styles.assetDescription}>{asset.description}</div>
                      </td>
                      <td data-label="Location" style={{ textAlign: 'center' }}>
                        {highlightText((asset.location && (asset.room || '') ? `${asset.location} ${asset.room || ''}`.trim() : asset.location || asset.room || '-'), searchTerm || '')}
                      </td>
                      <td data-label="Department">{highlightText(asset.department || '-', searchTerm || '')}</td>
                      <td data-label="Status" style={{ textAlign: 'center' }}>
                        {asset.has_pending_transfer ? (
                          <span className={`${statusBadgeStyles.statusBadge} compact`} style={{ background: '#facc15', color: '#fff' }}>
                            {getStatusDisplay(asset.status || '', false, undefined, true)}
                          </span>
                        ) : asset.has_pending_audit ? (
                          <span className={`${statusBadgeStyles.statusBadge} compact`} style={{ background: '#facc15', color: '#fff' }}>
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
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </section>

      <AssetDetailPopup
        asset={selectedAsset}
        isOpen={isPopupOpen}
        onClose={handleClosePopup}
        onUpdate={isCreating ? handleAssetCreate : handleAssetUpdate}
        onDelete={handleDeleteAsset}
        isAdmin={true}
        isCreating={isCreating}
        showUserEdit={true}
      />

      {/* Print Modal */}
      {showPrintModal && (
        <div className={styles.printModalOverlay}>
          <div className={styles.printModal}>
            {/* Header */}
            <div className={styles.printModalHeader}>
              <h3 className={styles.printModalTitle}>
                Print Labels
                <span className={styles.printModalBadge}>
                  {selectedAssets.size}
                </span>
              </h3>
              <button
                onClick={() => setShowPrintModal(false)}
                className={styles.printModalClose}
              >
                ×
              </button>
            </div>
            
            {/* Selected Assets Section */}
            <div className={styles.printModalSection}>
              <h4 className={styles.printModalSectionTitle}>
                <span className={`${styles.printModalSectionBadge} ${styles.selected}`}>
                  Selected
                </span>
                Assets:
              </h4>
              <div className={styles.printModalAssets}>
                <div className={styles.printModalAssetsGrid}>
                  {filteredAssets.filter(asset => selectedAssets.has(asset.id)).map(asset => (
                    <div key={asset.id} className={styles.printModalAssetCard}>
                      <div className={styles.printModalAssetName}>
                        {asset.name}
                      </div>
                      <div className={styles.printModalAssetNumber}>
                        {asset.inventory_number || 'No inventory number'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Print Type Section */}
            <div className={styles.printModalSection}>
              <h4 className={styles.printModalSectionTitle}>
                <span className={`${styles.printModalSectionBadge} ${styles.type}`}>
                  Type
                </span>
                Print Type:
              </h4>
              <div className={styles.printModalType}>
                <label className={`${styles.printModalTypeLabel} ${printType === 'barcode' ? styles.selected : ''}`}>
                  <input
                    type="radio"
                    name="printType"
                    value="barcode"
                    checked={printType === 'barcode'}
                    onChange={(e) => setPrintType(e.target.value as 'barcode' | 'qrcode')}
                    className={styles.printModalTypeRadio}
                  />
                  <div className={styles.printModalTypeContent}>
                    <div className={styles.printModalTypeTitle}>Barcode Labels</div>
                    <div className={styles.printModalTypeDescription}>Traditional barcode format</div>
                  </div>
                </label>
                <label className={`${styles.printModalTypeLabel} ${printType === 'qrcode' ? styles.selected : ''}`}>
                  <input
                    type="radio"
                    name="printType"
                    value="qrcode"
                    checked={printType === 'qrcode'}
                    onChange={(e) => setPrintType(e.target.value as 'barcode' | 'qrcode')}
                    className={styles.printModalTypeRadio}
                  />
                  <div className={styles.printModalTypeContent}>
                    <div className={styles.printModalTypeTitle}>QR Code Labels</div>
                    <div className={styles.printModalTypeDescription}>Modern QR code format</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className={styles.printModalActions}>
              <button
                onClick={() => handlePrintBulk()}
                className={`${styles.printModalButton} ${styles.primary}`}
              >
                <span className={styles.printModalIcon}></span>
                Print Labels
              </button>
              <button
                onClick={() => setShowPrintModal(false)}
                className={`${styles.printModalButton} ${styles.secondary}`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminAssetsTable;