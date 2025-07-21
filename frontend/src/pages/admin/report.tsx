import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import AdminSidebar from '../../components/admin/AdminSidebar';
import Navbar from '../../components/common/Navbar';
import Layout from '../../components/common/Layout';
import AdminRoute from '../../components/auth/AdminRoute';
import DepartmentSelector from '../../components/common/DepartmentSelector';
import ReportAssetsTable from '../../components/admin/ReportAssetsTable';
import { useAssets } from '../../contexts/AssetContext';
import { useDropdown } from '../../contexts/DropdownContext';
import { AiOutlineDownload } from 'react-icons/ai';
import styles from '../../components/user/AssetsTable/AssetsTable.module.css';
import DateRangeFilterButton from '../../components/common/DateRangeFilterButton';
import ExcelJS from 'exceljs';

const ASSET_STATUSES = [
  { key: 'active', label: 'ครุภัณท์ที่ใช้งานได้ตามปกติ' },
  { key: 'missing', label: 'ครุภัณท์ที่สูญหาย' },
  { key: 'broken', label: 'ครุภัณท์ที่ชำรุดเสื่อมสภาพ' },
  { key: 'no_longer_required', label: 'ครุภัณท์ที่ไม่มีความจำเป็นต้องใช้ในหน่วยงาน' },
];

const ReportPage = () => {
  const [selectedDepartment, setSelectedDepartment] = useState<'all' | number>('all');
  const [collapse, setCollapse] = useState<Record<string, boolean>>({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { assets, loading, error, fetchAssets } = useAssets();
  const [dateRanges, setDateRanges] = useState<Record<string, { startDate?: Date; endDate?: Date }>>({});
  const { departments } = useDropdown();
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (selectedDepartment === 'all') {
      fetchAssets();
    } else if (typeof selectedDepartment === 'number' && !isNaN(selectedDepartment)) {
      const dep = departments.find(d => d.id === selectedDepartment);
      if (dep) {
        fetchAssets({ department: dep.name_th });
      }
    }
  }, [selectedDepartment, fetchAssets, departments]);

  const handleToggle = (status: string) => {
    setCollapse((prev) => {
      const newCollapse: Record<string, boolean> = {};
      ASSET_STATUSES.forEach(s => { newCollapse[s.key] = false; });
      newCollapse[status] = !prev[status];
      return newCollapse;
    });
  };

  // ฟิลเตอร์ assets ตาม status, department, และ dateRange
  const getFilteredAssets = (status: string) => {
    const range = dateRanges[status] || {};
    return assets
      .filter((a) => a.status === status && (selectedDepartment === 'all' || String(a.department_id) === String(selectedDepartment)))
      .filter((a) => {
        const createdAt = (a as any).created_at || '';
        if (range.startDate && range.endDate && createdAt) {
          const created = new Date(createdAt);
          const start = new Date(range.startDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(range.endDate);
          end.setHours(23, 59, 59, 999);
          return created >= start && created <= end;
        }
        return true;
      })
      .map((a) => ({
        ...a,
        inventory_number: (a as any).inventory_number || '',
        room: (a as any).room || '',
        created_at: (a as any).created_at || '',
      }));
  };

  // ฟังก์ชัน export assets เป็น xlsx (callback)
  const handleExportXLSX = async (assetsToExport: any[]) => {
    if (!assetsToExport || assetsToExport.length === 0) return;
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
    assetsToExport.forEach(asset => {
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

  const statusLabels: Record<string, string> = {
    active: 'Active',
    missing: 'Missing',
    broken: 'Broken',
    no_longer_required: 'No Longer Required',
  };

  return (
    <AdminRoute>
      <>
        <Head>
          <title>Asset Report - Admin Dashboard</title>
          <meta name="description" content="Asset report for administrators" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <Layout sidebar={<AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />}>
          <Navbar title="Asset Report" isAdmin={true} onMenuClick={() => setSidebarOpen(true)} onSearch={setSearchTerm} />
          <div style={{
            padding: '2rem',
            backgroundColor: 'var(--card-bg)',
            borderRadius: '15px',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ maxWidth: 300, marginBottom: 24 }}>
              <DepartmentSelector
                value={selectedDepartment}
                onChange={setSelectedDepartment}
                showAllOption
              />
            </div>
            {ASSET_STATUSES.map((status) => (
              <div key={status.key} style={{ marginBottom: 16, border: '1px solid #eee', borderRadius: 8 }}>
                <div
                  style={{ cursor: 'pointer', padding: 16, background: '#f9f9f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  onClick={e => {
                    // toggle เฉพาะเมื่อคลิกที่หัวข้อ ไม่ใช่ปุ่มหรือ calendar
                    if (e.target === e.currentTarget) {
                      handleToggle(status.key);
                    }
                  }}
                >
                  <span>{status.label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div onClick={e => e.stopPropagation()}>
                      <DateRangeFilterButton
                        value={dateRanges[status.key] || {}}
                        onChange={range => setDateRanges(r => ({ ...r, [status.key]: range }))}
                        label=""
                      />
                    </div>
                    <button
                      className={styles.exportXlsxButtonSmall}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
                      onClick={e => {
                        e.stopPropagation();
                        handleExportXLSX(getFilteredAssets(status.key));
                      }}
                    >
                      <AiOutlineDownload style={{ fontSize: '1.2em' }} />
                      Export XLSX
                    </button>
                  </div>
                </div>
                {collapse[status.key] && (
                  <div style={{ padding: 16 }}>
                    <ReportAssetsTable
                      assets={getFilteredAssets(status.key)}
                      loading={loading}
                      error={error}
                      showExportButton={false}
                      searchTerm={searchTerm}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </Layout>
      </>
    </AdminRoute>
  );
};

export default ReportPage; 