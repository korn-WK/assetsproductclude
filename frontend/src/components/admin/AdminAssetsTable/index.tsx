import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { AiOutlineCalendar, AiOutlinePlus, AiOutlineSearch, AiOutlineDown, AiOutlineCamera } from 'react-icons/ai';
import Swal from 'sweetalert2';
import styles from './AdminAssetsTable.module.css';
import Pagination from '../../common/Pagination';
import AssetDetailPopup from '../../common/AssetDetailPopup';
import { useAssets } from '../../../contexts/AssetContext';
import { formatDate } from '../../../lib/utils';
import dayjs from 'dayjs';
import { useDropdown } from '../../../contexts/DropdownContext';
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
  created_at: string;
  updated_at?: string;
  has_pending_audit?: boolean;
  pending_status?: string | null;
  has_pending_transfer?: boolean;
}

interface AdminAssetsTableProps {
  onScanBarcodeClick?: () => void;
  searchTerm?: string; // เพิ่ม prop searchTerm
}

// ฟังก์ชันสำหรับ highlight ข้อความที่ตรงกับ searchTerm
function highlightText(text: string, keyword: string) {
  if (!keyword) return text;
  const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.split(regex).map((part, i) =>
    part.toLowerCase() === keyword.toLowerCase() ? <mark key={i} style={{ background: '#ffe066', color: '#222', padding: 0 }}>{part}</mark> : part
  );
}

const AdminAssetsTable: React.FC<AdminAssetsTableProps> = ({ onScanBarcodeClick, searchTerm }) => {
  const { assets, loading, error, fetchAssets } = useAssets();
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isPopupOpen, setIsPopupOpen] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const itemsPerPage = 5; // Admin can see more items per page
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('All');
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 180 });
  const statusColors = {
    active: '#22c55e',
    missing: '#f97316',
    broken: '#ef4444',
    no_longer_required: '#6b7280',
  };
  const statusLabels = {
    active: 'Active',
    missing: 'Missing',
    broken: 'Broken',
    no_longer_required: 'No Longer Required',
  };
  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'missing', label: 'Missing' },
    { value: 'broken', label: 'Broken' },
    { value: 'no_longer_required', label: 'No Longer Required' },
  ];
  const { departments, loading: dropdownLoading, error: dropdownError, fetchDropdownData } = useDropdown();
  const [dateRange, setDateRange] = useState<{ startDate?: Date; endDate?: Date }>({});
  const [pendingTransfers, setPendingTransfers] = useState<{ [assetId: string]: any }>({});

  // Fetch assets from context when the component mounts
  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

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
    const matchesStatus = activeFilter === 'All' || asset.status === activeFilter;
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
    const q = (typeof searchTerm === 'string' ? searchTerm : searchQuery).trim().toLowerCase();
    const matchesSearch = !q ||
      asset.asset_code.toLowerCase().includes(q) ||
      (asset.inventory_number || '').toLowerCase().includes(q) ||
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
  const getStatusDisplay = (status: string, hasPending: boolean, pendingStatus?: string, hasPendingTransfer?: boolean) => {
    if (hasPendingTransfer) return 'Transferring';
    if (hasPending && pendingStatus) return 'Pending';
    switch (status) {
      case 'active': return 'Active';
      case 'transferring': return 'Transferring';
      case 'audited': return 'Audited';
      case 'missing': return 'Missing';
      case 'broken': return 'Broken';
      case 'disposed': return 'Disposed';
      case 'no_longer_required': return 'No Longer Required';
      default: return status;
    }
  };

  const handleAssetClick = (asset: Asset) => {
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
  };

  const handleAssetUpdate = () => {
    fetchAssets();
    handleClosePopup();
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
        fetchAssets(); // Refresh the list
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
        text: 'An error occurred while deleting the asset.',
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

  const handleSearch = () => {
    // Implement search functionality
    console.log('Searching for:', searchQuery);
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
            <div style={{display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0 0.5rem 0.5rem 0.5rem'}}>
              {/* Filter buttons (date, status, department) */}
              <DateRangeFilterButton
                value={dateRange}
                onChange={setDateRange}
                label="เลือกช่วงวันที่"
              />
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
              <div style={{ position: 'relative' }}>
                <button
                  className={styles.filterDropdown}
                  onClick={handleShowDropdown}
                  ref={filterButtonRef}
                  style={{minWidth: 0}}
                >
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
              {/* กล้องอยู่ตรงกลาง */}
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
              {/* Add New อยู่ขวาสุด */}
              <button
                className={styles.createButton}
                onClick={handleCreateAsset}
                style={{minWidth: 0}}
              >
                <AiOutlinePlus /> Add New
              </button>
            </div>
            <div style={{padding: '0 0.5rem 0.5rem 0.5rem'}}>
              <input
                type="text"
                placeholder="Search assets..."
                className={styles.mobileSearchInput}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                style={{width: '100%'}}
              />
            </div>
            <div className={styles.assetCardList}>
              {currentAssets.map(asset => (
                <div className={styles.assetCard} key={asset.id} onClick={() => handleAssetClick(asset)}>
                  <img src={asset.image_url || '/file.svg'} alt={asset.name} className={styles.assetCardImage} />
                  <div className={styles.assetCardContent}>
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
                      <span><b>Department:</b> {highlightText(asset.department, searchTerm || '')}</span>
                    </div>
                    <div className={styles.assetCardMetaRow}>
                      <span><b>Status:</b> <span className={`${styles.statusBadge} ${getStatusClass(asset.status, asset.has_pending_audit || false, asset.has_pending_transfer || false)}`}>{getStatusDisplay(asset.status, asset.has_pending_audit || false, asset.pending_status || undefined, asset.has_pending_transfer || false)}</span></span>
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
                <div className={styles.statusFilters}>
                  {statusOptions.map(opt => (
                    <button
                      key={opt.value}
                      className={`${styles.filterButton} ${activeFilter === opt.value ? styles.active : ''}`}
                      onClick={() => setActiveFilter(opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div className={styles.departmentFilterWrapper} style={{ position: 'relative', display: 'inline-block' }}>
                  <select
                    className={styles.filterDropdown}
                    value={selectedDepartment}
                    onChange={e => {
                      setSelectedDepartment(e.target.value);
                      setCurrentPage(1);
                    }}
                  >
                    <option value="All">All Departments</option>
                    {departments.map(dep => (
                      <option key={dep.id} value={dep.name_th}>{dep.name_th}</option>
                    ))}
                  </select>
                  <span className={styles.caretIcon}><AiOutlineDown /></span>
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
                <button className={styles.createButton} onClick={handleCreateAsset}>
                <AiOutlinePlus /> Add New 
              </button>
              </div>
            </div>
            
            <div className={styles.assetsTableContainer}>
              <table className={`${styles.assetsTable} compact`}>
                <thead>
                  <tr>
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
                      <td data-label="Asset Code" style={{ textAlign: 'center' }}>{highlightText(asset.asset_code, searchTerm || '')}</td>
                      <td data-label="Inventory No." style={{ textAlign: 'center' }}>{highlightText(asset.inventory_number || '-', searchTerm || '')}</td>
                      <td data-label="Name">{/* left-aligned for readability */}
                        <div className={styles.assetName}>{highlightText(asset.name, searchTerm || '')}</div>
                        <div className={styles.assetDescription}>{asset.description}</div>
                      </td>
                      <td data-label="Location" style={{ textAlign: 'center' }}>
                        {highlightText(asset.location && (asset.room || '') ? `${asset.location} ${asset.room || ''}`.trim() : asset.location || asset.room || '-', searchTerm || '')}
                      </td>
                      <td data-label="Department">{highlightText(asset.department || '-', searchTerm || '')}</td>
                      <td data-label="Status" style={{ textAlign: 'center' }}>
                        <span className={`${styles.statusBadge} compact ${getStatusClass(asset.status, asset.has_pending_audit || false, asset.has_pending_transfer || false)}`}>
                          {getStatusDisplay(asset.status, asset.has_pending_audit || false, asset.pending_status || undefined, asset.has_pending_transfer || false)}
                        </span>
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
        onUpdate={handleAssetUpdate}
        onDelete={handleDeleteAsset}
        isAdmin={true}
        isCreating={isCreating}
      />
    </>
  );
};

export default AdminAssetsTable;