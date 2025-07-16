import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import Image from 'next/image';
import { AiOutlineCalendar, AiOutlineDown, AiOutlineClose, AiOutlineCamera } from 'react-icons/ai';
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
}

interface AssetsTableProps {
  onScanBarcodeClick?: () => void;
}

const AssetsTable: React.FC<AssetsTableProps> = ({ onScanBarcodeClick }) => {
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
  const statusOptions = [
    { value: 'All', label: 'Status' },
    { value: 'Active', label: 'Active' },
    { value: 'Transferring', label: 'Transferring' },
    { value: 'Audited', label: 'Audited' },
    { value: 'Missing', label: 'Missing' },
    { value: 'Broken', label: 'Broken' },
    { value: 'Disposed', label: 'Disposed' },
  ];
  const [showViewOnlyNotice, setShowViewOnlyNotice] = useState(true);
  const [pendingAudits, setPendingAudits] = useState<{ [assetId: string]: { status: string; note: string } | null }>({});

  // Check if user can edit (user with department)
  const canEdit = user && user.department_id !== null;

  // Check if user can only view (user without department)
  const canOnlyView = user && user.department_id === null;

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  useEffect(() => {
    fetchDropdownData();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
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

  // Close dropdown when clicking outside
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
    const matchesStatus = activeFilter === 'All' || 
      (activeFilter === 'Active' && asset.status === 'active') ||
      (activeFilter === 'Transferring' && asset.status === 'transferring') ||
      (activeFilter === 'Audited' && asset.status === 'audited') ||
      (activeFilter === 'Missing' && asset.status === 'missing') ||
      (activeFilter === 'Broken' && asset.status === 'broken') ||
      (activeFilter === 'Disposed' && asset.status === 'disposed');

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

    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = !q ||
      asset.asset_code.toLowerCase().includes(q) ||
      asset.name.toLowerCase().includes(q) ||
      asset.department.toLowerCase().includes(q) ||
      asset.location.toLowerCase().includes(q);

    return matchesStatus && matchesDepartment && matchesDate && matchesSearch;
  });

  const totalPages = Math.ceil(filteredAssets.length / itemsPerPage);
  const currentAssets = filteredAssets.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Patch assets to always have inventory_number and room as string
  const patchedAssets = currentAssets.map(asset => ({
    ...asset,
    inventory_number: (asset as any).inventory_number || '',
    room: (asset as any).room || '',
    created_at: (asset as any).created_at || '',
    has_pending_audit: (asset as any).has_pending_audit || false,
    pending_status: (asset as any).pending_status || null,
  } as Asset));

  const getStatusClass = (status: string, hasPending: boolean) => {
    if (hasPending) return styles.statusPending;
    switch (status) {
      case 'active': return styles.statusActive;
      case 'transferring': return styles.statusTransferring;
      case 'audited': return styles.statusAudited;
      case 'missing': return styles.statusMissing;
      case 'broken': return styles.statusBroken;
      case 'disposed': return styles.statusDisposed;
      default: return '';
    }
  };

  const getStatusDisplay = (status: string, hasPending: boolean, pendingStatus?: string) => {
    if (hasPending && pendingStatus) return 'Pending';
    switch (status) {
      case 'active': return 'Active';
      case 'transferring': return 'Transferring';
      case 'audited': return 'Audited';
      case 'missing': return 'Missing';
      case 'broken': return 'Broken';
      case 'disposed': return 'Disposed';
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
            <div style={{padding: '0.5rem 0.5rem 0 0.5rem'}}>
              <p className={styles.totalAssets}>Total {assets.length} assets</p>
            </div>
            <div className="filterRow" style={{display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0 0.5rem 0.5rem 0.5rem'}}>
              <DateRangeFilterButton
                value={dateRange}
                onChange={setDateRange}
                label="เลือกช่วงวันที่"
              />
              {isMobile && (
                <div style={{ position: 'relative' }}>
                  <button
                    className={styles.filterDropdown}
                    onClick={() => setShowStatusDropdown(v => !v)}
                    style={{ minWidth: 0 }}
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
              )}
              {canOnlyView && (
              <button
                className={styles.filterDropdown}
                onClick={handleShowDropdown}
                ref={filterButtonRef}
                style={{minWidth: 0}}
              >
                {selectedDepartment === 'All' ? 'Filter' : departments.find(d => d.name_th === selectedDepartment)?.name_th || selectedDepartment}
                <AiOutlineDown className={styles.dropdownIcon} />
              </button>
              )}
              {onScanBarcodeClick && (
                <button
                  className={styles.iconButton}
                  onClick={onScanBarcodeClick}
                  title="สแกนบาร์โค้ด"
                  style={{minWidth: 0}}
                >
                  <AiOutlineCamera />
                </button>
              )}
            </div>
            <div style={{padding: '0 0.5rem 0.5rem 0.5rem'}}>
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
                    <div className={styles.assetCardTitle}>{asset.name}</div>
                    <div className={styles.assetCardMetaRow}>
                      <span className={styles.assetId}><b>ID:</b> {asset.asset_code}</span>
                    </div>
                    <div className={styles.assetCardMetaRow}>
                      <span><b>Location:</b> {asset.location && (asset.room || '') ? `${asset.location} ${asset.room || ''}`.trim() : asset.location || asset.room || '-'}</span>
                    </div>
                    <div className={styles.assetCardMetaRow}>
                      <span><b>Department:</b> {asset.department}</span>
                    </div>
                    <div className={styles.assetCardMetaRow}>
                      <span><b>Status:</b> <span className={`${styles.statusBadge} ${getStatusClass(asset.status, asset.has_pending_audit || false)}`}>{getStatusDisplay(asset.status, asset.has_pending_audit || false, asset.pending_status)}</span></span>
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
            {showDepartmentDropdown && (
              <div
                ref={dropdownRef}
                style={{
                  position: 'absolute',
                  top: filterButtonRef.current ? filterButtonRef.current.getBoundingClientRect().bottom + window.scrollY + 4 : 0,
                  left: filterButtonRef.current ? filterButtonRef.current.getBoundingClientRect().left + window.scrollX : 0,
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                  padding: 8,
                  zIndex: 9999,
                  minWidth: filterButtonRef.current ? filterButtonRef.current.offsetWidth : 120,
                  maxHeight: 300,
                  overflowY: 'auto',
                }}
              >
                <div
                  style={{
                    padding: '0.5rem 1rem',
                    cursor: 'pointer',
                    fontWeight: selectedDepartment === 'All' ? 600 : 400,
                    background: selectedDepartment === 'All' ? '#f3f4f6' : 'transparent',
                    borderRadius: 6,
                  }}
                  onClick={() => {
                    setSelectedDepartment('All');
                    setShowDepartmentDropdown(false);
                  }}
                >
                  ทุกแผนก (All Departments)
                </div>
                {departments.map(dep => (
                  <div
                    key={dep.id}
                    style={{
                      padding: '0.5rem 1rem',
                      cursor: 'pointer',
                      fontWeight: selectedDepartment === dep.name_th ? 600 : 400,
                      background: selectedDepartment === dep.name_th ? '#f3f4f6' : 'transparent',
                      borderRadius: 6,
                    }}
                    onClick={() => {
                      setSelectedDepartment(dep.name_th);
                      setShowDepartmentDropdown(false);
                    }}
                  >
                    {dep.name_th} {dep.name_en ? `(${dep.name_en})` : ''}
                  </div>
                ))}
              </div>
            )}
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
                
                <div className={styles.statusFilters}>
                  {['All', 'Active', 'Transferring', 'Audited', 'Missing', 'Broken', 'Disposed'].map(status => (
                    <button
                      key={status}
                      className={`${styles.filterButton} ${activeFilter === status ? styles.active : ''}`}
                      onClick={() => {
                        setActiveFilter(status);
                        setCurrentPage(1);
                      }}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.rightControls} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <DateRangeFilterButton
                  value={dateRange}
                  onChange={setDateRange}
                  label="เลือกช่วงวันที่"
                />
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
                      <td data-label="Asset Code" style={{ textAlign: 'center' }}>{asset.asset_code}</td>
                      <td data-label="Inventory No." style={{ textAlign: 'center' }}>{asset.inventory_number}</td>
                      <td data-label="Name">{/* left-aligned for readability */}
                        <div className={styles.assetName}>{asset.name}</div>
                        <div className={styles.assetDescription}>{asset.description}</div>
                      </td>
                      <td data-label="Location" style={{ textAlign: 'center' }}>{asset.location && (asset.room || '') ? `${asset.location} ${asset.room || ''}`.trim() : asset.location || asset.room || '-'}</td>
                      <td data-label="Department">{asset.department}</td>
                      <td data-label="Status" style={{ textAlign: 'center' }}>
                        {pendingAudits[asset.id] ? (
                          <span className={`${styles.statusBadge} compact`} style={{ background: '#facc15', color: '#fff' }}>
                            Pending
                          </span>
                        ) : (
                          <span className={`${styles.statusBadge} compact ${getStatusClass(asset.status, asset.has_pending_audit || false)}`}>
                            {getStatusDisplay(asset.status, asset.has_pending_audit || false, asset.pending_status || undefined)}
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
    </>
  );
};

export default AssetsTable;