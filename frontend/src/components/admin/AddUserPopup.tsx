import React, { useState, useEffect } from 'react';
import axios from '../../lib/axios';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';

interface Department {
  id: number;
  name_th: string;
}

interface AddUserPopupProps {
  onClose: () => void;
  onUserAdded: (user: any) => void;
  onUsersImported: (users: any[]) => void;
}

const AddUserPopup: React.FC<AddUserPopupProps> = ({ onClose, onUserAdded, onUsersImported }) => {
  const [activeTab, setActiveTab] = useState<'manual' | 'excel'>('manual');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [formData, setFormData] = useState({
    username: '',
    name: '',
    email: '',
    role: 'User',
    department_id: '',
  });
  const [loading, setLoading] = useState(false);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelPreview, setExcelPreview] = useState<any[]>([]);
  const [excelUsers, setExcelUsers] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await axios.get('/api/assets/departments');
        setDepartments(response.data);
      } catch (error) {
        // handle error
      }
    };
    fetchDepartments();
  }, []);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post('/api/users', formData);
      onUserAdded(response.data);
      onClose();
    } catch (error) {
      // handle error
    } finally {
      setLoading(false);
    }
  };

  const handleExcelChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('handleExcelChange called');
    if (e.target.files && e.target.files[0]) {
      console.log('File selected:', e.target.files[0].name);
      setExcelFile(e.target.files[0]);
      try {
        // Parse Excel file using ExcelJS
        const file = e.target.files[0];
        const buffer = await file.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);
        const worksheet = workbook.worksheets[0];
        const rows = worksheet.getSheetValues();
        // rows[0] is undefined, rows[1] is header
        let header: string[] = [];
        if (rows[1] && Array.isArray(rows[1])) {
          header = (rows[1] as any[]).map((h) => (h ? h.toString().trim() : ''));
        } else if (rows[1] && typeof rows[1] === 'object') {
          header = Object.values(rows[1] as object).map((h) => (h ? h.toString().trim() : ''));
        }
        console.log('Parsed header:', header);
        // Robust header mapping: trim and lowercase all header names
        // Remove empty header cell at the start if present
        let trimmedHeader = header;
        if (!header[0]) {
          trimmedHeader = header.slice(1);
        }
        trimmedHeader = trimmedHeader.map(h => h ? h.toString().trim().toLowerCase() : '');
        const expectedFields = ['username', 'name', 'email', 'role', 'department'];
        const headerIndex: Record<string, number> = {};
        trimmedHeader.forEach((key, idx) => {
          if (expectedFields.includes(key)) headerIndex[key] = idx + (header.length > trimmedHeader.length ? 1 : 0);
        });
        const users: any[] = [];
        for (let i = 2; i < rows.length; i++) {
          const row = rows[i];
          if (!row || !Array.isArray(row)) continue;
          const user: any = {};
          Object.entries(headerIndex).forEach(([key, colIdx]) => {
            const cell = row[colIdx] ?? '';
            user[key] = cell.toString().trim();
          });
          // Normalize role
              if (user.originalRole) {
      const roleRaw = user.originalRole.toString().toLowerCase().replace(/\s/g, '');
            const roleMap: any = {
              user: 'User',
              admin: 'Admin',
              superadmin: 'SuperAdmin',
            };
            user.originalRole = roleMap[roleRaw] || user.originalRole.trim();
          }
          // Minimal validation
          if (user.username && user.name && user.email && user.originalRole) {
            console.log('Parsed user from Excel:', user);
            users.push(user);
          }
        }
        setExcelPreview(users);
        setExcelUsers(users);
      } catch (err) {
        console.error('Error parsing Excel file:', err);
      }
    }
  };

  const handleExcelImport = async () => {
    if (!excelUsers.length) return;
    setImporting(true);
    let success: any[] = [];
    let failed: any[] = [];
    for (const user of excelUsers) {
      try {
        // Map department name to department_id if needed (optional: you can fetch departments and match)
        let department_id = '';
        if (user.department && departments.length > 0) {
          const found = departments.find(d => d.name_th === user.department);
          if (found) department_id = String(found.id);
        }
        const payload = {
          username: user.username,
          name: user.name,
          email: user.email,
          role: user.originalRole,
          department_id: department_id || undefined,
        };
        await axios.post('/api/users', payload);
        success.push(user);
      } catch (err: any) {
        let msg = '';
        if (err.response && err.response.data && err.response.data.error) {
          msg = err.response.data.error;
        } else {
          msg = err.message || 'Unknown error';
        }
        failed.push({ ...user, error: msg });
      }
    }
    if (success.length > 0) {
      onUsersImported(success);
      setExcelPreview([]);
      setExcelUsers([]);
      setExcelFile(null);
      onClose();
    }
    if (failed.length > 0) {
      alert(
        failed.map(u => `${u.username || u.email}: ${u.error}`).join('\n') ||
        `นำเข้าไม่สำเร็จ ${failed.length} รายการ`
      );
    }
    setImporting(false);
  };

  const handleDownloadTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('UsersTemplate');
    // Add header
    worksheet.addRow([
      'username',
      'name',
      'email',
      'role',
      'department',
    ]);
    // Add sample data
    [
      ['user1@mfu.ac.th', 'User One', 'user1@mfu.ac.th', 'User', 'ส่วนพัสดุ'],
      ['admin2@mfu.ac.th', 'Admin Two', 'admin2@mfu.ac.th', 'Admin', 'ศูนย์บริการเทคโนโลยีสารสนเทศ'],
      ['super@mfu.ac.th', 'Super Admin', 'super@mfu.ac.th', 'SuperAdmin', ''],
    ].forEach(row => worksheet.addRow(row));
    // Set column widths
    worksheet.columns = [
      { width: 22 }, // username
      { width: 16 }, // name
      { width: 22 }, // email
      { width: 12 }, // role
      { width: 28 }, // department
    ];
    // Style header
    worksheet.getRow(1).eachCell(cell => {
      cell.font = { bold: true };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9D9D9' },
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF000000' } },
        left: { style: 'thin', color: { argb: 'FF000000' } },
        bottom: { style: 'thin', color: { argb: 'FF000000' } },
        right: { style: 'thin', color: { argb: 'FF000000' } },
      };
    });
    // Style all data cells
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      row.eachCell(cell => {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } },
        };
      });
    });
    // Download file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users_import_template.xlsx';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.18)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 12, minWidth: 400, maxWidth: 480, width: '100%', padding: 24, position: 'relative' }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 16, fontSize: 22, background: 'none', border: 'none', cursor: 'pointer' }}>&times;</button>
        <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginBottom: 24 }}>
          <button onClick={() => setActiveTab('manual')} style={{ flex: 1, padding: 12, background: 'none', border: 'none', borderBottom: activeTab === 'manual' ? '2px solid #6366f1' : 'none', color: activeTab === 'manual' ? '#6366f1' : '#222', fontWeight: 600, cursor: 'pointer' }}>เพิ่มแบบฟอร์ม</button>
          <button onClick={() => setActiveTab('excel')} style={{ flex: 1, padding: 12, background: 'none', border: 'none', borderBottom: activeTab === 'excel' ? '2px solid #6366f1' : 'none', color: activeTab === 'excel' ? '#6366f1' : '#222', fontWeight: 600, cursor: 'pointer' }}>นำเข้าจาก Excel</button>
        </div>
        {activeTab === 'manual' && (
          <form onSubmit={handleManualSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <input name="username" placeholder="Username" value={formData.username} onChange={handleFormChange} required style={{ padding: 8, borderRadius: 6, border: '1px solid #e5e7eb' }} />
            <input name="name" placeholder="Full Name" value={formData.name} onChange={handleFormChange} required style={{ padding: 8, borderRadius: 6, border: '1px solid #e5e7eb' }} />
            <input name="email" placeholder="Email" value={formData.email} onChange={handleFormChange} required style={{ padding: 8, borderRadius: 6, border: '1px solid #e5e7eb' }} />
            <select name="role" value={formData.role} onChange={handleFormChange} style={{ padding: 8, borderRadius: 6, border: '1px solid #e5e7eb' }}>
              <option value="User">User</option>
              <option value="Admin">Admin</option>
              <option value="SuperAdmin">SuperAdmin</option>
            </select>
            <select name="department_id" value={formData.department_id} onChange={handleFormChange} style={{ padding: 8, borderRadius: 6, border: '1px solid #e5e7eb' }}>
              <option value="">No Department</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name_th}</option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button type="button" onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 6, border: '1px solid #e5e7eb', background: '#f3f4f6', color: '#222', fontWeight: 500 }}>ยกเลิก</button>
              <button type="submit" disabled={loading} style={{ flex: 1, padding: 10, borderRadius: 6, border: 'none', background: '#6366f1', color: '#fff', fontWeight: 600 }}>{loading ? 'กำลังบันทึก...' : 'เพิ่มผู้ใช้'}</button>
            </div>
          </form>
        )}
        {activeTab === 'excel' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" onClick={handleDownloadTemplate} style={{ background: 'none', border: 'none', color: '#6366f1', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', marginBottom: 4 }}>
                ดาวน์โหลดเทมเพลต
              </button>
            </div>
            <input type="file" accept=".xlsx,.xls" onChange={handleExcelChange} />
            {excelPreview.length > 0 && (
              <div style={{ background: '#f9fafb', borderRadius: 6, padding: 12, fontSize: 14 }}>
                <b>Preview:</b>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                  {excelPreview.map((row, idx) => (
                    <li key={idx}>{row.username} - {row.name} - {row.email} - {row.role} - {row.department}</li>
                  ))}
                </ul>
              </div>
            )}
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button type="button" onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 6, border: '1px solid #e5e7eb', background: '#f3f4f6', color: '#222', fontWeight: 500 }}>ยกเลิก</button>
              <button type="button" disabled={importing || !excelUsers.length} onClick={handleExcelImport} style={{ flex: 1, padding: 10, borderRadius: 6, border: 'none', background: '#6366f1', color: '#fff', fontWeight: 600 }}>{importing ? 'กำลังนำเข้า...' : 'นำเข้าผู้ใช้'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddUserPopup; 