import React from 'react';
import styles from '../admin/AdminAssetsTable/AdminAssetsTable.module.css';
import { Asset } from '../../common/types/asset';

interface PrintLabelsModalProps {
  open: boolean;
  assets: Asset[];
  selectedAssetIds: string[];
  onClose: () => void;
  onPrint: () => void;
  printType: 'barcode' | 'qrcode';
  setPrintType: (type: 'barcode' | 'qrcode') => void;
  className?: string;
  style?: React.CSSProperties;
}

const PrintLabelsModal: React.FC<PrintLabelsModalProps> = ({ open, assets, selectedAssetIds, onClose, onPrint, printType, setPrintType, className, style }) => {
  if (!open) return null;
  const selectedAssets = assets.filter(asset => selectedAssetIds.includes(asset.id));
  return (
    <div className={className || styles.printModalOverlay} style={style}>
      <div className={styles.printModal}>
        {/* Header */}
        <div className={styles.printModalHeader}>
          <h3 className={styles.printModalTitle}>
            Print Labels
            <span className={styles.printModalBadge}>
              {selectedAssets.length}
            </span>
          </h3>
          <button
            onClick={onClose}
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
              {selectedAssets.map(asset => (
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
                onChange={() => setPrintType('barcode')}
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
                onChange={() => setPrintType('qrcode')}
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
            onClick={onPrint}
            className={`${styles.printModalButton} ${styles.primary}`}
          >
            <span className={styles.printModalIcon}></span>
            Print Labels
          </button>
          <button
            onClick={onClose}
            className={`${styles.printModalButton} ${styles.secondary}`}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrintLabelsModal; 