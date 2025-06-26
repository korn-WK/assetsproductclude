import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { AiOutlineCalendar, AiOutlinePlus, AiOutlineSearch, AiOutlineDown } from 'react-icons/ai';
import Swal from 'sweetalert2';
import styles from './AdminAssetsTable.module.css';
import Pagination from '../../common/Pagination';
import AssetDetailPopup from '../../common/AssetDetailPopup';
import { useAssets } from '../../../contexts/AssetContext';
import { formatDate } from '../../../lib/utils';
import dayjs from 'dayjs';
import { useDropdown } from '../../../contexts/DropdownContext';

interface Asset {
  id: string;
  asset_code: string;
  name: string;
  description: string;
  location: string;
  department: string;
  owner: string;
  status: string;
  image_url: string | null;
  acquired_date: string;
  created_at?: string;
  updated_at?: string;
}

const AdminAssetsTable: React.FC = () => {
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
  const statusOptions = [
    { value: 'All', label: 'Status' },
    { value: 'Active', label: 'Active' },
    { value: 'Transferring', label: 'Transferring' },
    { value: 'Audited', label: 'Audited' },
    { value: 'Missing', label: 'Missing' },
    { value: 'Broken', label: 'Broken' },
    { value: 'Disposed', label: 'Disposed' },
  ];
  const { departments, loading: dropdownLoading, error: dropdownError, fetchDropdownData } = useDropdown();

  // Fetch assets from context when the component mounts
  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

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

  // Filter assets based on status, date, and search query
  const filteredAssets = assets.filter(asset => {
    const matchesStatus = activeFilter === 'All' || 
      (activeFilter === 'Active' && asset.status === 'active') ||
      (activeFilter === 'Transferring' && asset.status === 'transferring') ||
      (activeFilter === 'Audited' && asset.status === 'audited') ||
      (activeFilter === 'Missing' && asset.status === 'missing') ||
      (activeFilter === 'Broken' && asset.status === 'broken') ||
      (activeFilter === 'Disposed' && asset.status === 'disposed');

    const matchesDepartment = selectedDepartment === 'All' || asset.department === selectedDepartment;

    const matchesDate = !selectedDate ||
      (asset.acquired_date && asset.acquired_date.slice(0, 10) === selectedDate);

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

  const getStatusClass = (status: string) => {
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

  const getStatusDisplay = (status: string) => {
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
    setIsCreating(false);
    setSelectedAsset(asset);
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
      name: '',
      description: '',
      location: '',
      department: '',
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
              <button
                className={styles.iconButton}
                onClick={async () => {
                  const result = await Swal.fire({
                    title: `<div style='display:flex;align-items:center;gap:10px;justify-content:center;'>`
                      + `<span style='font-size:2rem;color:#6366f1;'><svg width='1.5em' height='1.5em' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect x='3' y='4' width='18' height='18' rx='4' ry='4'></rect><line x1='16' y1='2' x2='16' y2='6'></line><line x1='8' y1='2' x2='8' y2='6'></line><line x1='3' y1='10' x2='21' y2='10'></line></svg></span>`
                      + `</div>`
                      + (selectedDate ? `<div style='margin-top:10px;font-size:1rem;color:#6366f1;'>วันที่เลือก: <b>${dayjs(selectedDate).format('YYYY-MM-DD')}</b></div>` : ''),
                    html:
                      `<div style='display:flex;flex-direction:column;align-items:center;gap:12px;margin-top:10px;'>`
                      + `<input id=\"swal-date\" type=\"date\" value=\"${selectedDate || ''}\" style=\"padding:0.7rem 1.2rem;font-size:1.1rem;border-radius:8px;border:1.5px solid #a5b4fc;width:220px;outline:none;box-shadow:0 2px 8px rgba(99,102,241,0.07)\">`
                      + `<div style='font-size:0.95rem;color:#6b7280;'>กรุณาเลือกวัน/เดือน/ปี ที่ต้องการค้นหา</div>`
                      + `</div>`,
                    showCancelButton: true,
                    focusConfirm: false,
                    confirmButtonText: '<span style=\"font-size:1.1rem;font-weight:500;\">เลือก</span>',
                    cancelButtonText: '<span style=\"font-size:1.1rem;\">ยกเลิก</span>',
                    customClass: {
                      popup: 'swal2-calendar-popup',
                      confirmButton: 'swal2-calendar-confirm',
                      cancelButton: 'swal2-calendar-cancel',
                    },
                    preConfirm: () => {
                      // @ts-ignore
                      return (document.getElementById('swal-date') as HTMLInputElement)?.value;
                    },
                    didOpen: () => {
                      const input = document.getElementById('swal-date') as HTMLInputElement;
                      if (input) input.focus();
                    },
                    background: '#f8fafc',
                    width: 370,
                    padding: '2.2em 1.5em 1.5em 1.5em',
                  });
                  if (result.isConfirmed && result.value) {
                    setSelectedDate(result.value);
                  }
                }}
                title="Filter by date"
                style={{minWidth: 0}}
              >
                <AiOutlineCalendar />
                {selectedDate && (
                  <span style={{marginLeft: 4, fontSize: '0.9em'}}>{dayjs(selectedDate).format('YYYY-MM-DD')}</span>
                )}
              </button>
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
              <button
                className={styles.filterDropdown}
                onClick={handleShowDropdown}
                ref={filterButtonRef}
                style={{minWidth: 0}}
              >
                {selectedDepartment === 'All' ? 'Filter' : departments.find(d => d.name_th === selectedDepartment)?.name_th || selectedDepartment}
                <AiOutlineDown className={styles.dropdownIcon} />
              </button>
              {showDepartmentDropdown && (
                <div
                  ref={dropdownRef}
                  className={styles.customDropdown}
                  style={{
                    position: 'absolute',
                    top: dropdownPosition.top,
                    left: dropdownPosition.left,
                    width: dropdownPosition.width,
                    background: '#fff',
                    borderRadius: 8,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    zIndex: 10,
                    maxHeight: '200px',
                    overflowY: 'auto'
                  }}
                >
                  <div
                    style={{ padding: '0.6rem 1rem', cursor: 'pointer', color: selectedDepartment === 'All' ? '#6366f1' : '#222', background: selectedDepartment === 'All' ? '#f3f4f6' : 'transparent' }}
                    onClick={() => {
                      setSelectedDepartment('All');
                      setShowDepartmentDropdown(false);
                    }}
                  >
                    All Departments
                  </div>
                  {departments.map(dept => (
                    <div
                      key={dept.id}
                      style={{ padding: '0.6rem 1rem', cursor: 'pointer', color: selectedDepartment === dept.name_th ? '#6366f1' : '#222', background: selectedDepartment === dept.name_th ? '#f3f4f6' : 'transparent' }}
                      onClick={() => {
                        setSelectedDepartment(dept.name_th);
                        setShowDepartmentDropdown(false);
                      }}
                    >
                      {dept.name_th}
                    </div>
                  ))}
                </div>
              )}
              <button className={styles.createButton} onClick={handleCreateAsset} style={{flex: 1}}>
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
                    <div className={styles.assetCardTitle}>{asset.name}</div>
                    <div className={styles.assetCardMetaRow}>
                      <span className={styles.assetId}><b>ID:</b> {asset.asset_code}</span>
                    </div>
                    <div className={styles.assetCardMetaRow}>
                      <span><b>Location:</b> {asset.location}</span>
                    </div>
                    <div className={styles.assetCardMetaRow}>
                      <span><b>Department:</b> {asset.department}</span>
                    </div>
                    <div className={styles.assetCardMetaRow}>
                      <span><b>Status:</b> <span className={`${styles.statusBadge} ${getStatusClass(asset.status)}`}>{getStatusDisplay(asset.status)}</span></span>
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
              <div className={styles.rightControls}>
                <button
                  className={styles.iconButton}
                  onClick={async () => {
                    const result = await Swal.fire({
                      title: `<div style='display:flex;align-items:center;gap:10px;justify-content:center;'>`
                        + `<span style='font-size:2rem;color:#6366f1;'><svg width='1.5em' height='1.5em' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><rect x='3' y='4' width='18' height='18' rx='4' ry='4'></rect><line x1='16' y1='2' x2='16' y2='6'></line><line x1='8' y1='2' x2='8' y2='6'></line><line x1='3' y1='10' x2='21' y2='10'></line></svg></span>`
                        + `</div>`
                        + (selectedDate ? `<div style='margin-top:10px;font-size:1rem;color:#6366f1;'>วันที่เลือก: <b>${dayjs(selectedDate).format('YYYY-MM-DD')}</b></div>` : ''),
                      html:
                        `<div style='display:flex;flex-direction:column;align-items:center;gap:12px;margin-top:10px;'>`
                        + `<input id=\"swal-date\" type=\"date\" value=\"${selectedDate || ''}\" style=\"padding:0.7rem 1.2rem;font-size:1.1rem;border-radius:8px;border:1.5px solid #a5b4fc;width:220px;outline:none;box-shadow:0 2px 8px rgba(99,102,241,0.07)\">`
                        + `<div style='font-size:0.95rem;color:#6b7280;'>กรุณาเลือกวัน/เดือน/ปี ที่ต้องการค้นหา</div>`
                        + `</div>`,
                      showCancelButton: true,
                      focusConfirm: false,
                      confirmButtonText: '<span style=\"font-size:1.1rem;font-weight:500;\">เลือก</span>',
                      cancelButtonText: '<span style=\"font-size:1.1rem;\">ยกเลิก</span>',
                      customClass: {
                        popup: 'swal2-calendar-popup',
                        confirmButton: 'swal2-calendar-confirm',
                        cancelButton: 'swal2-calendar-cancel',
                      },
                      preConfirm: () => {
                        // @ts-ignore
                        return (document.getElementById('swal-date') as HTMLInputElement)?.value;
                      },
                      didOpen: () => {
                        const input = document.getElementById('swal-date') as HTMLInputElement;
                        if (input) input.focus();
                      },
                      background: '#f8fafc',
                      width: 370,
                      padding: '2.2em 1.5em 1.5em 1.5em',
                    });
                    if (result.isConfirmed && result.value) {
                      setSelectedDate(result.value);
                    }
                  }}
                  title="Filter by date"
                  style={{ display: 'inline-flex', alignItems: 'center', height: '40px', fontSize: '1.1rem', padding: '0.8rem 1.2rem' }}
                >
                  <AiOutlineCalendar />
                </button>
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
                <button className={styles.createButton} onClick={handleCreateAsset}>
                <AiOutlinePlus /> Add New 
              </button>
              </div>
            </div>
            
            <div className={styles.assetsTableContainer}>
              <table className={styles.assetsTable}>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Image</th>
                    <th>Name</th>
                    <th>Location</th>
                    <th>Department</th>
                    <th>Owner</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {currentAssets.map(asset => (
                    <tr 
                      key={asset.id} 
                      className={styles.clickableRow}
                      onClick={() => handleAssetClick(asset)}
                    >
                      <td data-label="ID">{asset.asset_code}</td>
                      <td data-label="Image">
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
                      <td data-label="Name">
                        <div className={styles.assetName}>{asset.name}</div>
                        <div className={styles.assetDescription}>{asset.description}</div>
                      </td>
                      <td data-label="Location">{asset.location}</td>
                      <td data-label="Department">{asset.department}</td>
                      <td data-label="Owner">{asset.owner}</td>
                      <td data-label="Date">{formatDate(asset.acquired_date)}</td>
                      <td data-label="Status">
                        <span className={`${styles.statusBadge} ${getStatusClass(asset.status)}`}>
                          {getStatusDisplay(asset.status)}
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