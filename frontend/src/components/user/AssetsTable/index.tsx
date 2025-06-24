import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import Image from 'next/image';
import { AiOutlineCalendar, AiOutlineDown, AiOutlineClose } from 'react-icons/ai';
import styles from './AssetsTable.module.css';
import Pagination from '../../common/Pagination';
import AssetDetailPopup from '../../common/AssetDetailPopup';
import { useAssets } from '../../../contexts/AssetContext';
import { formatDate } from '../../../lib/utils';
import { useDropdown } from '../../../contexts/DropdownContext';
import Swal from 'sweetalert2';
import dayjs from 'dayjs';

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
}

const AssetsTable: React.FC = () => {
  const { assets, loading, error, fetchAssets } = useAssets();
  const { departments, loading: dropdownLoading, error: dropdownError, fetchDropdownData } = useDropdown();
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isPopupOpen, setIsPopupOpen] = useState<boolean>(false);
  const itemsPerPage = 5;
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('All');
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 180 });

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

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
    if (selectedDate) {
      fetchAssets({ acquired_date: selectedDate });
    } else {
      fetchAssets({});
    }
    // eslint-disable-next-line
  }, [selectedDate]);

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

  const filteredAssets = activeFilter === 'All'
    ? assets
    : assets.filter(asset => {
        switch (activeFilter) {
          case 'Active': return asset.status === 'active';
          case 'Transferring': return asset.status === 'transferring';
          case 'Audited': return asset.status === 'audited';
          case 'Missing': return asset.status === 'missing';
          case 'Broken': return asset.status === 'broken';
          case 'Disposed': return asset.status === 'disposed';
          default: return true;
        }
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
    setSelectedAsset(asset);
    setIsPopupOpen(true);
  };

  const handleClosePopup = () => {
    setIsPopupOpen(false);
    setSelectedAsset(null);
  };

  const handleAssetUpdate = (updatedAsset: Asset) => {
    setSelectedAsset(updatedAsset);
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
        <div className={styles.assetsHeader}>
          <div>
            <p className={styles.totalAssets}>Total {assets.length} assets</p>
          </div>
        </div>

        <div className={styles.assetsControls}>
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
          <div className={styles.rightControls} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 0 }}>
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
                      + `<input id="swal-date" type="date" value="${selectedDate || ''}" style="padding:0.7rem 1.2rem;font-size:1.1rem;border-radius:8px;border:1.5px solid #a5b4fc;width:220px;outline:none;box-shadow:0 2px 8px rgba(99,102,241,0.07)">`
                      + `<div style='font-size:0.95rem;color:#6b7280;'>กรุณาเลือกวัน/เดือน/ปี ที่ต้องการค้นหา</div>`
                      + `</div>`,
                    showCancelButton: true,
                    focusConfirm: false,
                    confirmButtonText: '<span style="font-size:1.1rem;font-weight:500;">เลือก</span>',
                    cancelButtonText: '<span style="font-size:1.1rem;">ยกเลิก</span>',
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
            </div>
            <button
              className={styles.filterDropdown}
              onClick={handleShowDropdown}
              ref={filterButtonRef}
              style={{ position: 'relative' }}
            >
              {selectedDepartment === 'All' ? 'Filter' : departments.find(d => d.name_th === selectedDepartment)?.name_th || selectedDepartment}
              <AiOutlineDown className={styles.dropdownIcon} />
            </button>
            {showDepartmentDropdown &&
              ReactDOM.createPortal(
                <div
                  ref={dropdownRef}
                  style={{
                    position: 'absolute',
                    top: dropdownPosition.top,
                    left: dropdownPosition.left,
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                    padding: 8,
                    zIndex: 9999,
                    minWidth: dropdownPosition.width,
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
                </div>,
                document.body
              )
            }
          </div>
        </div>

        <div className={styles.assetsTableContainer}>
          <table className={styles.assetsTable}>
            <thead>
              <tr>
                <th>Asset Name</th>
                <th>Asset Code</th>
                <th>Location</th>
                <th>Department</th>
                <th>Acquired Date</th>
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
                  <td data-label="Asset Name">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
                      <div>
                        <div className={styles.assetName}>{asset.name}</div>
                        <div className={styles.assetDescription}>{asset.description}</div>
                      </div>
                    </div>
                  </td>
                  <td data-label="Asset Code">{asset.asset_code}</td>
                  <td data-label="Location">{asset.location}</td>
                  <td data-label="Department">{asset.department}</td>
                  <td data-label="Acquired Date">{formatDate(asset.acquired_date)}</td>
                  <td data-label="Status">
                    <span className={`${styles.statusBadge} ${getStatusClass(asset.status)}`}>
                      {getStatusDisplay(asset.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {currentAssets.length === 0 && (
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
      </section>

      {isPopupOpen && selectedAsset && (
        <AssetDetailPopup
          asset={selectedAsset}
          isOpen={isPopupOpen}
          onClose={handleClosePopup}
          onUpdate={handleAssetUpdate}
        />
      )}
    </>
  );
};

export default AssetsTable;