import React, { useEffect, useState } from 'react';
import styles from '../AssetsTable/AssetsTable.module.css';
import { formatDate } from '../../../lib/utils';
import AssetAuditHistoryPopup from '../../common/AssetAuditHistoryPopup';
import { useAuth } from '../../../contexts/AuthContext';
import Image from 'next/image';
import Pagination from '../../common/Pagination';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { AiOutlineDownload, AiOutlineCalendar } from 'react-icons/ai';
// @ts-ignore
import { DateRange } from 'react-date-range';
import { format, parse, isAfter, isBefore, isEqual } from 'date-fns';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';

interface PendingAudit {
  id: number;
  asset_id: number;
  asset_code: string;
  asset_name: string;
  status: string;
  note: string;
  user_name: string;
  checked_at: string;
  confirmed?: number; // เพิ่ม confirmed เพื่อติดตามสถานะการยืนยัน
  image_url?: string; // เพิ่ม image_url เพื่อเก็บ URL ของรูปภาพ
  inventory_number?: string; // เพิ่ม inventory_number เพื่อเก็บหมายเลขสินค้า
  department_name?: string; // เพิ่ม department_name เพื่อเก็บชื่อแผนก
}

const statusColors: Record<string, string> = {
  pending: '#facc15',
  active: '#22c55e',
  broken: '#ef4444',
  missing: '#f97316',
  transferring: '#3b82f6',
  audited: '#6366f1',
  disposed: '#6b7280',
};

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  active: 'Active',
  broken: 'Broken',
  missing: 'Missing',
  transferring: 'Transferring',
  audited: 'Audited',
  disposed: 'Disposed',
};

interface AssetVerificationTableProps {
  searchTerm?: string;
}
function highlightText(text: string, keyword: string) {
  if (!keyword) return text;
  const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.split(regex).map((part, i) =>
    part.toLowerCase() === keyword.toLowerCase() ? <mark key={i} style={{ background: '#ffe066', color: '#222', padding: 0 }}>{part}</mark> : part
  );
}
const AssetVerificationTable: React.FC<AssetVerificationTableProps> = ({ searchTerm }) => {
  const [pendingAudits, setPendingAudits] = useState<PendingAudit[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [showPopup, setShowPopup] = useState(false);
  const [popupAssetId, setPopupAssetId] = useState<number | null>(null);
  const { user } = useAuth();
  const [verificationFilter, setVerificationFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const filterTabs = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
  ];
  const [currentPage, setCurrentPage] = React.useState(1);
  const rowsPerPage = 5;
  const [range, setRange] = useState<[{ startDate?: Date; endDate?: Date; key: string }]>([
    {
      startDate: undefined,
      endDate: undefined,
      key: 'selection',
    },
  ]);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    fetch('/api/assets/audits/list')
      .then(res => res.json())
      .then(data => setPendingAudits(data))
      .catch(() => setPendingAudits([]));
  }, []);

  // Filter audits by date range (using react-date-range)
  const filteredAudits = pendingAudits.filter(audit => {
    let pass = true;
    if (verificationFilter === 'all') pass = true;
    if (verificationFilter === 'pending') pass = !audit.confirmed;
    if (verificationFilter === 'approved') pass = !!audit.confirmed;
    // Date range filter
    const startDate = range[0].startDate;
    const endDate = range[0].endDate;
    if (startDate && endDate) {
      const checkedDate = audit.checked_at
        ? parse(audit.checked_at, 'yyyy-MM-dd HH:mm:ss', new Date())
        : undefined;
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      pass =
        pass &&
        !!checkedDate &&
        (isAfter(checkedDate, start) || isEqual(checkedDate, start)) &&
        (isBefore(checkedDate, end) || isEqual(checkedDate, end));
    }
    // Search filter
    const q = (typeof searchTerm === 'string' ? searchTerm : '').trim().toLowerCase();
    if (q) {
      pass = pass && (
        (audit.inventory_number || '').toLowerCase().includes(q) ||
        (audit.asset_name || '').toLowerCase().includes(q) ||
        (statusLabels[audit.status] || audit.status || '').toLowerCase().includes(q) ||
        (audit.note || '').toLowerCase().includes(q) ||
        (audit.user_name || '').toLowerCase().includes(q) ||
        (audit.department_name || '').toLowerCase().includes(q) ||
        (formatDate(audit.checked_at) || '').toLowerCase().includes(q) ||
        (audit.confirmed ? 'approved' : 'pending').includes(q)
      );
    }
    return pass;
  });

  // Reset to first page when filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [verificationFilter, pendingAudits]);

  const totalPages = Math.ceil(filteredAudits.length / rowsPerPage);
  const paginatedAudits = filteredAudits.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const toggleSelect = (id: number) => {
    setSelected(sel => sel.includes(id) ? sel.filter(i => i !== id) : [...sel, id]);
  };

  const selectAll = () => {
    // เลือกเฉพาะ pending เท่านั้น
    const pendingIds = filteredAudits.filter(a => !a.confirmed).map(a => a.id);
    if (selected.length === pendingIds.length) setSelected([]);
    else setSelected(pendingIds);
  };

  const confirmSelected = async () => {
    if (selected.length === 0) return;
    await fetch('/api/assets/audits/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: selected }),
    });
    // อัปเดตสถานะใน state เป็น approved แทนการลบแถว
    setPendingAudits(audits => audits.map(a => selected.includes(a.id) ? { ...a, confirmed: 1 } : a));
    setSelected([]);
  };

  const openHistoryPopup = (assetId: number) => {
    setPopupAssetId(assetId);
    setShowPopup(true);
  };

  const handleExport = () => {
    if (filteredAudits.length === 0) return;
    const rows = filteredAudits.map(audit => ({
      'Inventory Number': `\t${audit.inventory_number || ''}`,
      'Name': audit.asset_name,
      'Status': statusLabels[audit.status] || audit.status,
      'Note': audit.note,
      'Auditor': audit.user_name,
      'Date': formatDate(audit.checked_at),
      'Verification Status': audit.confirmed ? 'Approved' : 'Pending',
    }));
    const csv = [
      Object.keys(rows[0]).join(','),
      ...rows.map(row => Object.values(row).map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');
    // Add UTF-8 BOM to fix Thai/Unicode in Excel
    const csvWithBom = '\uFEFF' + csv;
    const blob = new Blob([csvWithBom], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'asset_verification.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportXLSX = async () => {
    if (filteredAudits.length === 0) return;
    const rows = filteredAudits.map(audit => ([
      audit.inventory_number || '',
      audit.asset_name,
      statusLabels[audit.status] || audit.status,
      audit.note,
      audit.user_name,
      audit.department_name || '',
      formatDate(audit.checked_at),
      audit.confirmed ? 'Approved' : 'Pending',
    ]));
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Asset Verification');
    // Add header
    worksheet.addRow([
      'Inventory Number',
      'Name',
      'Status',
      'Note',
      'Auditor',
      'Department',
      'Date',
      'Verification Status',
    ]);
    // Add data rows, ensure all cells exist (even if empty)
    rows.forEach(row => {
      // Ensure row has 7 elements
      const fullRow = [
        row[0] || '',
        row[1] || '',
        row[2] || '',
        row[3] || '',
        row[4] || '',
        row[5] || '',
        row[6] || '',
        row[7] || '',
      ];
      worksheet.addRow(fullRow);
    });
    // Set column widths
    worksheet.columns = [
      { width: 24 }, // Inventory Number
      { width: 30 }, // Name
      { width: 12 }, // Status
      { width: 18 }, // Note
      { width: 18 }, // Auditor
      { width: 18 }, // Department
      { width: 18 }, // Date
      { width: 20 }, // Verification Status
    ];
    // Auto width columns
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
    // Center align and add border to all cells, force Inventory Number as text
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        // Inventory Number column (col 1): force as text (except header)
        if (colNumber === 1 && rowNumber > 1) {
          cell.value = String(cell.value ?? '');
          cell.numFmt = '@';
        }
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
    // Download file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'asset_verification.xlsx';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const popupAsset = pendingAudits.find(a => a.asset_id === popupAssetId);

  return (
    <>
      <div className={styles.assetsControls} style={{ marginBottom: 16, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Left: status filters only */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className={styles.statusFilters}>
            {filterTabs.map(f => (
              <button
                key={f.key}
                className={`${styles.filterButton} ${verificationFilter === f.key ? styles.active : ''}`}
                onClick={() => setVerificationFilter(f.key as any)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        {/* Right: date picker + export */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
            <button
              onClick={() => setShowPicker(v => !v)}
              style={{
                background: '#fafbfc',
                border: '1.5px solid #e5e7eb',
                borderRadius: '12px',
                padding: '0.6rem 0.9rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 0,
                minHeight: 0,
                height: '51px', // << เพิ่มบรรทัดนี้
                width:'55px',
                boxShadow: 'none',
                cursor: 'pointer',
                transition: 'border 0.2s',
                outline: showPicker ? '2px solid #11998e' : 'none',
              }}
              title="เลือกช่วงวันที่"
            >
              <AiOutlineCalendar style={{ fontSize: '1.35em', color: '#222' }} />
            </button>
            {range[0].startDate && range[0].endDate && (
              <span style={{ marginLeft: 8, fontWeight: 500, color: '#11998e', fontSize: '1.05em' }}>
                {`${format(range[0].startDate, 'dd MMM yy')} - ${format(range[0].endDate, 'dd MMM yy')}`}
              </span>
            )}
            {showPicker && (
              <div style={{ position: 'absolute', zIndex: 20, top: '110%', left: 0 ,border: '1.5px solid #e5e7eb'}}>
                <DateRange
                  editableDateInputs={true}
                  onChange={(item: any) => setRange([item.selection])}
                  moveRangeOnFirstSelection={false}
                  ranges={range}
                  showSelectionPreview={true}
                  showMonthAndYearPickers={true}
                  maxDate={new Date()}
                  rangeColors={['#11998e']}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0.8rem 0.8rem',background: '#ffffff',}}>
                  <button
                    style={{ padding: '0.5rem 1.1rem', borderRadius: 6, border: 'none', background: '#11998e', color: '#fff', fontWeight: 500, cursor: 'pointer' }}
                    onClick={() => {
                      setRange([{ startDate: undefined, endDate: undefined, key: 'selection' }]);
                      setShowPicker(false);
                    }}
                  >
                    Reset
                  </button>
                  <button
                    style={{ marginLeft: 8, padding: '0.5rem 1.1rem', borderRadius: 6, border: 'none', background: '#11998e', color: '#fff', fontWeight: 500, cursor: 'pointer' }}
                    onClick={() => setShowPicker(false)}
                  >
                    OK
                  </button>
                </div>
              </div>
            )}
          </div>
          <button className={styles.exportPdfButton} onClick={handleExportXLSX} style={{ marginLeft: 8 }}>
            <AiOutlineDownload style={{ fontSize: '1.3em' }} />
            Export XLSX
          </button>
        </div>
      </div>
      {/* Table: let columns auto-fit content */}
      <table className={styles.assetsTable} style={{ tableLayout: 'fixed', width: '100%' }}>
        <thead>
          <tr>
            <th style={{ width: 30 }}>
              {/* Checkbox เฉพาะถ้า filter เป็น pending หรือ all */}
              {(verificationFilter !== 'approved') && (
                <input
                  type="checkbox"
                  checked={
                    filteredAudits.filter(a => !a.confirmed).length > 0 &&
                    selected.length === filteredAudits.filter(a => !a.confirmed).length
                  }
                  onChange={selectAll}
                />
              )}
            </th>
            <th style={{ width: 70 }}>Image</th>
            <th style={{ width: 120 }}>Inventory Number</th>
            <th style={{ width: 180 }}>Name</th>
            <th style={{ width: 120 }}>Status</th>
            <th style={{ width: 120 }}>Note</th>
            <th style={{ width: 120 }}>Auditor</th>
            <th style={{ width: 190 }}>Department</th>
            <th style={{ width: 140 }}>Date</th>
            <th style={{ width: 140 }}>Verification Status</th>
          </tr>
        </thead>
        <tbody>
          {paginatedAudits.map(audit => (
            <tr
              key={audit.id}
              style={{ cursor: 'pointer' }}
              onClick={e => {
                // ไม่ให้คลิก checkbox แล้วเปิด popup
                if ((e.target as HTMLElement).tagName.toLowerCase() === 'input') return;
                openHistoryPopup(audit.asset_id);
              }}
            >
              <td>
                {/* แสดง checkbox เฉพาะถ้ายังไม่ approved */}
                {!audit.confirmed && (
                  <input
                    type="checkbox"
                    checked={selected.includes(audit.id)}
                    onChange={() => toggleSelect(audit.id)}
                    onClick={e => e.stopPropagation()} // ป้องกันเปิด popup เมื่อคลิก checkbox
                  />
                )}
              </td>
              <td style={{ textAlign: 'center' }}>
                <Image
                  src={audit.image_url || '/file.svg'}
                  alt={audit.asset_name}
                  width={60}
                  height={60}
                  style={{ objectFit: 'cover', borderRadius: 8 }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/file.svg';
                  }}
                />
              </td>
              <td>{highlightText(audit.inventory_number || '', searchTerm || '')}</td>
              <td>{highlightText(audit.asset_name || '', searchTerm || '')}</td>
              <td>
                <span style={{
                  background: statusColors[audit.status] || '#e5e7eb',
                  color: '#fff',
                  borderRadius: 8,
                  padding: '0.2em 0.8em',
                  fontWeight: 500,
                  fontSize: '0.95em'
                }}>
                  {highlightText(statusLabels[audit.status] || audit.status, searchTerm || '')}
                </span>
              </td>
              <td>{highlightText(audit.note || '', searchTerm || '')}</td>
              <td>{highlightText(audit.user_name || '', searchTerm || '')}</td>
              <td>{highlightText(audit.department_name || '', searchTerm || '')}</td>
              <td>{highlightText(formatDate(audit.checked_at) || '', searchTerm || '')}</td>
              <td>
                <span style={{
                  background: audit.confirmed ? '#22c55e' : '#facc15',
                  color: '#fff',
                  borderRadius: 8,
                  padding: '0.2em 0.8em',
                  fontWeight: 500,
                  fontSize: '0.95em'
                }}>
                  {highlightText(audit.confirmed ? 'Approved' : 'Pending', searchTerm || '')}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Confirm button above pagination */}
      <div style={{ marginTop: 16, textAlign: 'right' }}>
        <button
          className={styles.confirmButton}
          disabled={selected.length === 0}
          onClick={confirmSelected}
        >
          Confirm Selected
        </button>
      </div>
      {totalPages > 1 && (
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
      {showPopup && popupAssetId && (
        <AssetAuditHistoryPopup
          assetId={popupAssetId}
          open={showPopup}
          onClose={() => setShowPopup(false)}
        />
      )}
    </>
  );
};

export default AssetVerificationTable; 