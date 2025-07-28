import ExcelJS from 'exceljs';
import { Asset } from './types/asset';

export async function exportAssetsToXLSX(assets: Asset[], filename: string = 'assets.xlsx') {
  if (!assets || assets.length === 0) return;
  
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Assets');
  
  // Add headers
  worksheet.addRow([
    'Asset Code',
    'Inventory Number',
    'Name',
    'Description',
    'Location',
    'Room',
    'Department',
    'Owner',
    'Status',
    'Acquired Date',
    'Created At'
  ]);
  
  // Add data rows
  assets.forEach(asset => {
    worksheet.addRow([
      asset.asset_code || '',
      asset.inventory_number || '',
      asset.name || '',
      asset.description || '',
      asset.location || '',
      asset.room || '',
      asset.department || '',
      asset.owner || '',
      asset.status || '',
      asset.acquired_date || '',
      asset.created_at || '',
    ]);
  });
  
  // Auto-size columns
  worksheet.columns.forEach((column, i) => {
    let maxLength = 10;
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const cellValue = cell.value ? cell.value.toString() : '';
      maxLength = Math.max(maxLength, cellValue.length + 2);
    });
    column.width = maxLength;
  });
  
  // Style the worksheet
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
  
  // Generate and download file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
} 