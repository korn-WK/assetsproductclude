import React, { useEffect, useState } from 'react';
import styles from '../../user/AssetsTable/AssetsTable.module.css';
import { formatDate } from '../../../lib/utils';
import AssetAuditHistoryPopup from '../../common/AssetAuditHistoryPopup';
import { useAuth } from '../../../contexts/AuthContext';
import Image from 'next/image';
import Pagination from '../../common/Pagination';
import ExcelJS from 'exceljs';
import { AiOutlineDownload, AiOutlineCalendar } from 'react-icons/ai';
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
  confirmed?: number;
  image_url?: string;
  inventory_number?: string;
  department_name?: string;
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

const AssetVerificationTableSuperAdmin: React.FC = () => {
  const [pendingAudits, setPendingAudits] = useState<PendingAudit[]>([]);
  const [totalAudits, setTotalAudits] = useState(0);
  const [departments, setDepartments] = useState<{ id: number, name_th: string }[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState<'all' | number>('all');
  const [selected, setSelected] = useState<number[]>([]);
  const [showPopup, setShowPopup] = useState(false);
  const [popupAssetId, setPopupAssetId] = useState<number | null>(null);
  const { user } = useAuth();
  const [verificationFilter, setVerificationFilter] = useState<'all' | 'pending' | 'approved'>('all');
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

  // ดึง department list
  useEffect(() => {
    fetch('/api/assets/departments')
      .then(res => res.json())
      .then(data => setDepartments(data));
  }, []);

  // ดึงข้อมูล audits แบบ pagination + department filter
  useEffect(() => {
    const fetchAudits = async () => {
      let url = `/api/assets/audits/all?limit=${rowsPerPage}&offset=${(currentPage - 1) * rowsPerPage}`;
      if (departmentFilter !== 'all') {
        url += `&department_id=${departmentFilter}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      setPendingAudits(data.audits || []);
      setTotalAudits(data.total || 0);
    };
    fetchAudits();
  }, [currentPage, departmentFilter]);

  // Filter เฉพาะในหน้านั้น (เช่น filter สถานะ, วันที่)
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
    return pass;
  });

  const totalPages = Math.ceil(totalAudits / rowsPerPage);
  const paginatedAudits = filteredAudits; // เพราะ backend ส่งมาแค่หน้าปัจจุบันแล้ว

  React.useEffect(() => {
    setCurrentPage(1);
  }, [verificationFilter]);

  const toggleSelect = (id: number) => {
    setSelected(sel => sel.includes(id) ? sel.filter(i => i !== id) : [...sel, id]);
  };

  const selectAll = () => {
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
    setPendingAudits(audits => audits.map(a => selected.includes(a.id) ? { ...a, confirmed: 1 } : a));
    setSelected([]);
  };

  const openHistoryPopup = (assetId: number) => {
    setPopupAssetId(assetId);
    setShowPopup(true);
  };

  const handleExportXLSX = async () => {
    // ดึงข้อมูลทั้งหมด (เช่น 10000 รายการ)
    const res = await fetch(`/api/assets/audits/all?limit=10000&offset=0`);
    const data = await res.json();
    const allAudits = data.audits || [];
    if (allAudits.length === 0) return;
    const rows = allAudits.map((audit: PendingAudit) => ([
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
    rows.forEach((row: (string | number)[]) => {
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
    worksheet.columns = [
      { width: 140 },
      { width: 220 },
      { width: 110 },
      { width: 120 },
      { width: 120 },
      { width: 180 },
      { width: 120 },
      { width: 150 },
    ];
    worksheet.eachRow((row: any, rowNumber: number) => {
      row.eachCell((cell: any, colNumber: number) => {
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
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'asset_verification_all.xlsx';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const popupAsset = pendingAudits.find(a => a.asset_id === popupAssetId);

  return (
    <div style={{ padding: '2rem', backgroundColor: 'var(--card-bg)', borderRadius: '15px', boxShadow: 'var(--shadow-sm)' }}>
        <div className={styles.assetsControls} style={{ marginBottom: 16, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div className={styles.statusFilters}>
              {['all', 'pending', 'approved'].map(f => (
                <button
                  key={f}
                  className={`${styles.filterButton} ${verificationFilter === f ? styles.active : ''}`}
                  onClick={() => setVerificationFilter(f as any)}
                >
                  {f === 'all' ? 'ทั้งหมด' : f === 'pending' ? 'Pending' : 'Approved'}
                </button>
              ))}
            </div>
            <div className={styles.dropdownWrapper}>
              <select
                className={styles.departmentDropdown}
                value={departmentFilter}
                onChange={e => setDepartmentFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              >
                <option value="all">All Departments</option>
                {departments.map(dep => (
                  <option key={dep.id} value={dep.id}>{dep.name_th}</option>
                ))}
              </select>
              <span className={styles.dropdownIcon}>▼</span>
            </div>
          </div>
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
                  height: '51px',
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
        <table className={styles.assetsTable} style={{ tableLayout: 'fixed', width: '100%' }}>
          <thead>
            <tr>
              <th style={{ width: 30 }}>
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
                  if ((e.target as HTMLElement).tagName.toLowerCase() === 'input') return;
                  openHistoryPopup(audit.asset_id);
                }}
              >
                <td>
                  {!audit.confirmed && (
                    <input
                      type="checkbox"
                      checked={selected.includes(audit.id)}
                      onChange={() => toggleSelect(audit.id)}
                      onClick={e => e.stopPropagation()}
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
                <td>{audit.inventory_number}</td>
                <td>{audit.asset_name}</td>
                <td>
                  <span style={{
                    background: statusColors[audit.status] || '#e5e7eb',
                    color: '#fff',
                    borderRadius: 8,
                    padding: '0.2em 0.8em',
                    fontWeight: 500,
                    fontSize: '0.95em'
                  }}>
                    {statusLabels[audit.status] || audit.status}
                  </span>
                </td>
                <td>{audit.note}</td>
                <td>{audit.user_name}</td>
                <td>{audit.department_name}</td>
                <td>{formatDate(audit.checked_at)}</td>
                <td>
                  <span style={{
                    background: audit.confirmed ? '#22c55e' : '#facc15',
                    color: '#fff',
                    borderRadius: 8,
                    padding: '0.2em 0.8em',
                    fontWeight: 500,
                    fontSize: '0.95em'
                  }}>
                    {audit.confirmed ? 'Approved' : 'Pending'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
    </div>
  );
};

export default AssetVerificationTableSuperAdmin; 