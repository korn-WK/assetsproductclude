import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { addSarabunFont } from './THSarabun-normal.js';

export function preparePdfGenerator() {
    try {
        const doc = new jsPDF({ unit: 'mm' });
        addSarabunFont(doc);
        console.log('PDF generator pre-warmed.');
    } catch (e) {
        console.error('Failed to pre-warm PDF generator', e);
    }
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    try {
        const date = new Date(dateString);
        
        // Check if date is valid
        if (isNaN(date.getTime())) {
            return 'Invalid Date';
        }
        
        // Format date to match database timezone (Thailand timezone)
        const dateOptions = {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            timeZone: 'Asia/Bangkok'
        };
        
        return date.toLocaleDateString('en-US', dateOptions);
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Invalid Date';
    }
}

export function generateUsersPDF(users) {
    try {
        if (!Array.isArray(users)) {
            console.error('users ต้องเป็น array:', users);
            throw new Error('Expected users to be an array');
        }

        if (users.length === 0) {
            throw new Error('ไม่มีข้อมูลผู้ใช้');
        }

        const doc = new jsPDF({ unit: 'mm' });
        
        // เพิ่มฟอนต์ไทย
        addSarabunFont(doc);
        doc.setFont('THSarabun');
        doc.setFontSize(12);

        // สร้างข้อมูลตาราง
        const tableData = users.map(user => [
            user.username || 'N/A',
            user.name || 'N/A',
            user.email || 'N/A',
            user.department_name || 'N/A',
            user.role || 'N/A',
            formatDate(user.created_at)
        ]);

        // ตั้งค่าตาราง
        autoTable(doc, {
            head: [['Username', 'Name', 'Email', 'Department', 'Role', 'Created At']],
            body: tableData,
            styles: { 
                font: 'THSarabun',
                fontSize: 8,
                cellPadding: 3
            },
            columnStyles: {
                0: { cellWidth: 40 }, // Username
                1: { cellWidth: 35 }, // Name
                2: { cellWidth: 40 }, // Email
                3: { cellWidth: 30 }, // Department
                4: { cellWidth: 15 }, // Role
                5: { cellWidth: 25 }  // Created At
            },
            headStyles: {
                font: 'THSarabun',
                fillColor: [66, 139, 202],
                textColor: 255,
                fontStyle: 'bold',
                fontSize: 8
            },
            alternateRowStyles: {
                fillColor: [245, 245, 245]
            },
            margin: { top: 10 },
            startY: 10
        });

        // บันทึกไฟล์
        doc.save('users_report.pdf');
        
        console.log('สร้าง PDF สำเร็จ');
        return true;
        
    } catch (error) {
        console.error('เกิดข้อผิดพลาดในการสร้าง PDF:', error);
        throw error;
    }
}
