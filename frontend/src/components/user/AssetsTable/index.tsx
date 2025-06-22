import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { AiOutlineCalendar, AiOutlineDown } from 'react-icons/ai';
import styles from './AssetsTable.module.css';
import Pagination from '../../common/Pagination';
import AssetDetailPopup from '../../common/AssetDetailPopup';
import { useAssets } from '../../../contexts/AssetContext';
import { formatDate } from '../../../lib/utils';

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
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isPopupOpen, setIsPopupOpen] = useState<boolean>(false);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

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
            <h2>Assets</h2>
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
          <div className={styles.rightControls}>
            <button className={styles.iconButton}>
              <AiOutlineCalendar />
            </button>
            <button className={styles.filterDropdown}>
              Filter <AiOutlineDown className={styles.dropdownIcon} />
            </button>
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