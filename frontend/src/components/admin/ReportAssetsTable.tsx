import React, { useState } from 'react';
import Image from 'next/image';
import styles from './AdminAssetsTable/AdminAssetsTable.module.css';
import Pagination from '../common/Pagination';
import ExcelJS from 'exceljs';
import { AiOutlineDownload } from 'react-icons/ai';

interface Asset {
  id: string;
  asset_code: string;
  inventory_number: string;
  name: string;
  description: string;
  location: string;
  room: string;
  department: string;
  status: string;
  image_url: string | null;
  acquired_date: string;
  created_at: string;
}

interface ReportAssetsTableProps {
  assets: Asset[];
  loading?: boolean;
  error?: string | null;
  pageSize?: number;
  onExport?: (assets: Asset[]) => void;
  showExportButton?: boolean;
}

const statusLabels: Record<string, string> = {
  active: 'Active',
  missing: 'Missing',
  broken: 'Broken',
  no_longer_required: 'No Longer Required',
};

// ฟังก์ชัน highlightText
function highlightText(text: string, keyword: string) {
  if (!keyword) return text;
  const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.split(regex).map((part, i) =>
    part.toLowerCase() === keyword.toLowerCase() ? <mark key={i} style={{ background: '#ffe066', color: '#222', padding: 0 }}>{part}</mark> : part
  );
}

const ReportAssetsTable: React.FC<ReportAssetsTableProps & { searchTerm?: string }> = ({ assets, loading, error, pageSize = 5, onExport, showExportButton = true, searchTerm = '' }) => {
  const [currentPage, setCurrentPage] = useState(1);
  // filter เฉพาะ columnที่ต้องการ
  const filteredAssets = assets.filter(asset => {
    const q = searchTerm.toLowerCase();
    return (
      asset.asset_code.toLowerCase().includes(q) ||
      (asset.inventory_number || '').toLowerCase().includes(q) ||
      asset.name.toLowerCase().includes(q) ||
      asset.location.toLowerCase().includes(q) ||
      asset.department.toLowerCase().includes(q) ||
      (statusLabels[asset.status] || asset.status).toLowerCase().includes(q)
    );
  });
  const totalPages = Math.ceil(filteredAssets.length / pageSize);
  const currentAssets = filteredAssets.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleExportXLSX = async () => {
    if (!assets || assets.length === 0) return;
    const ExcelJS = (await import('exceljs')).default;
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
    assets.forEach(asset => {
      worksheet.addRow([
        asset.asset_code || '-',
        asset.inventory_number || '-',
        asset.name || '-',
        asset.description || '-',
        asset.location && asset.room ? `${asset.location} ${asset.room}`.trim() : (asset.location || asset.room || '-'),
        asset.department || '-',
        statusLabels[asset.status] || asset.status || '-',
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
    a.download = 'assets_report.xlsx';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className={styles.loadingState}>Loading assets...</div>;
  }
  if (error) {
    return <div className={styles.errorState}>Error: {error}</div>;
  }

  return (
    <div>
      {showExportButton && (
        <div style={{ textAlign: 'right', marginBottom: 8 }}>
          <button className={styles.exportXlsxButton} onClick={() => onExport ? onExport(assets) : handleExportXLSX()}>
            <AiOutlineDownload style={{ fontSize: '1.3em', marginRight: 8 }} />
            Export XLSX
          </button>
        </div>
      )}
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
              <tr key={asset.id}>
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
                <td data-label="Asset Code" style={{ textAlign: 'center' }}>{highlightText(asset.asset_code, searchTerm)}</td>
                <td data-label="Inventory No." style={{ textAlign: 'center' }}>{highlightText(asset.inventory_number || '-', searchTerm)}</td>
                <td data-label="Name">
                  <div className={styles.assetName}>{highlightText(asset.name, searchTerm)}</div>
                  <div className={styles.assetDescription}>{asset.description}</div>
                </td>
                <td data-label="Location" style={{ textAlign: 'center' }}>
                  {highlightText(asset.location && asset.room ? `${asset.location} ${asset.room}`.trim() : asset.location || asset.room || '-', searchTerm)}
                </td>
                <td data-label="Department">{highlightText(asset.department || '-', searchTerm)}</td>
                <td data-label="Status" style={{ textAlign: 'center' }}>
                  <span className={`${styles.statusBadge} compact`}>
                    {highlightText(statusLabels[asset.status] || asset.status, searchTerm)}
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
    </div>
  );
};

export default ReportAssetsTable; 