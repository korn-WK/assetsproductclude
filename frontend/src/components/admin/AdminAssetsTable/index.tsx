import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { AiOutlineCalendar, AiOutlinePlus } from 'react-icons/ai';
import Swal from 'sweetalert2';
import styles from './AdminAssetsTable.module.css';
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
  const itemsPerPage = 10; // Admin can see more items per page

  // Fetch assets from context when the component mounts
  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // Filter assets based on status filter only (search is handled by Navbar)
  const filteredAssets = assets.filter(asset => {
    const matchesStatus = activeFilter === 'All' || 
      (activeFilter === 'Active' && asset.status === 'active') ||
      (activeFilter === 'Transferring' && asset.status === 'transferring') ||
      (activeFilter === 'Audited' && asset.status === 'audited') ||
      (activeFilter === 'Missing' && asset.status === 'missing') ||
      (activeFilter === 'Broken' && asset.status === 'broken') ||
      (activeFilter === 'Disposed' && asset.status === 'disposed');

    return matchesStatus;
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
        <div className={styles.assetsHeader}>
          <div>
            <h2>Admin Assets</h2>
            <p className={styles.totalAssets}>Total {assets.length} assets</p>
            <p className={styles.listOfEquipment}>Complete asset management for administrators</p>
          </div>
          <button className={styles.createButton} onClick={handleCreateAsset}>
            <AiOutlinePlus /> Add New Asset
          </button>
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
            <button className={styles.iconButton}>
              <AiOutlineCalendar />
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
                  <td>{asset.asset_code}</td>
                  <td>
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
                  <td>
                    <div className={styles.assetName}>{asset.name}</div>
                    <div className={styles.assetDescription}>{asset.description}</div>
                  </td>
                  <td>{asset.location}</td>
                  <td>{asset.department}</td>
                  <td>{asset.owner}</td>
                  <td>{formatDate(asset.acquired_date)}</td>
                  <td>
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