import React from 'react';
import styles from './AssetSearchResult.module.css';
import { Asset } from '../../common/types/asset';

interface AssetSearchResultProps {
  asset: Asset | null;
  isLoading: boolean;
  error: string | null;
  onClose?: () => void;
}

const AssetSearchResult: React.FC<AssetSearchResultProps> = ({
  asset,
  isLoading,
  error,
  onClose = () => {}
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return styles.statusActive;
      case 'transferring':
        return styles.statusTransferring;
      case 'audited':
        return styles.statusAudited;
      case 'missing':
        return styles.statusMissing;
      case 'broken':
        return styles.statusBroken;
      case 'disposed':
        return styles.statusDisposed;
      default:
        return styles.statusDefault;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'ใช้งานได้';
      case 'transferring':
        return 'กำลังโอนย้าย';
      case 'audited':
        return 'ตรวจสอบแล้ว';
      case 'missing':
        return 'สูญหาย';
      case 'broken':
        return 'ชำรุด';
      case 'disposed':
        return 'จำหน่ายแล้ว';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'ไม่ระบุ';
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className={styles.resultContainer}>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>กำลังค้นหาคุรุภัณฑ์...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.resultContainer}>
        <div className={styles.errorContainer}>
          <div className={styles.errorIcon}>⚠️</div>
          <h3>ไม่พบคุรุภัณฑ์</h3>
          <p>{error}</p>
          {onClose && (
            <button 
              className={styles.retryButton}
              onClick={onClose}
              type="button"
            >
              ลองใหม่
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!asset) {
    return null;
  }

  return (
    <div className={styles.resultContainer}>
      <div className={styles.resultHeader}>
        <h3>ผลการค้นหาคุรุภัณฑ์</h3>
        {onClose && (
          <button 
            className={styles.closeButton}
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        )}
      </div>

      <div className={styles.assetCard}>
        <div className={styles.assetImage}>
          {asset.image_url ? (
            <img 
              src={asset.image_url} 
              alt={asset.name}
              onError={(e) => {
                e.currentTarget.src = '/522733693_1501063091226628_5759500172344140771_n.jpg';
              }}
            />
          ) : (
            <div className={styles.noImage}>
              <span>ไม่มีรูปภาพ</span>
            </div>
          )}
        </div>

        <div className={styles.assetInfo}>
          <div className={styles.assetHeader}>
            <h4>{asset.name}</h4>
            <span className={`${styles.status} ${getStatusColor(asset.status)}`}>
              {getStatusText(asset.status)}
            </span>
          </div>

          <div className={styles.assetDetails}>
            <div className={styles.detailRow}>
              <span className={styles.label}>รหัสคุรุภัณฑ์:</span>
              <span className={styles.value}>{asset.asset_code}</span>
            </div>

            {asset.description && (
              <div className={styles.detailRow}>
                <span className={styles.label}>รายละเอียด:</span>
                <span className={styles.value}>{asset.description}</span>
              </div>
            )}

            <div className={styles.detailRow}>
              <span className={styles.label}>สถานที่:</span>
              <span className={styles.value}>{asset.location}</span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.label}>แผนก:</span>
              <span className={styles.value}>{asset.department}</span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.label}>ผู้รับผิดชอบ:</span>
              <span className={styles.value}>{asset.owner}</span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.label}>วันที่ได้มา:</span>
              <span className={styles.value}>{formatDate(asset.acquired_date)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetSearchResult; 