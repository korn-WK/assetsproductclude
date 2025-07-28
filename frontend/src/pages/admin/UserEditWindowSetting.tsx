import React, { useEffect, useState } from 'react';
import { DateRange } from 'react-date-range';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import Swal from 'sweetalert2';

interface UserEditWindowSettingProps {
  onClose?: () => void;
  open?: boolean;
}

const UserEditWindowSetting: React.FC<UserEditWindowSettingProps> = ({ onClose, open = true }) => {
  const [range, setRange] = useState([
    {
      startDate: new Date(),
      endDate: new Date(),
      key: 'selection',
    },
  ]);
  const [startTime, setStartTime] = useState('00:00');
  const [endTime, setEndTime] = useState('23:59');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch('/api/settings/user-edit-window')
      .then(res => res.json())
      .then(data => {
        if (data.start_date && data.end_date) {
          const startDate = new Date(data.start_date);
          const endDate = new Date(data.end_date);
          setRange([
            {
              startDate: startDate,
              endDate: endDate,
              key: 'selection',
            },
          ]);
          // Extract time from datetime
          setStartTime(startDate.toTimeString().slice(0, 5));
          setEndTime(endDate.toTimeString().slice(0, 5));
        }
      });
  }, [open]);

  const handleSave = async () => {
    setLoading(true);
    // ตรวจสอบ transfer pending ก่อน
    const res = await fetch('/api/asset-transfers?status=pending', { credentials: 'include' });
    const transfers = await res.json();
    if (Array.isArray(transfers) && transfers.length > 0) {
      setLoading(false);
      Swal.fire({
        icon: 'warning',
        title: 'ไม่สามารถบันทึกได้',
        text: 'กรุณาอนุมัติหรือปฏิเสธรายการโอนย้ายค้างอยู่ในหน้า Asset Transfer Verification ให้หมดก่อน!',
        confirmButtonText: 'ตกลง',
      });
      return;
    }
    // Combine date and time
    const startDateTime = new Date(range[0].startDate);
    const [startHour, startMinute] = startTime.split(':').map(Number);
    startDateTime.setHours(startHour, startMinute, 0, 0);

    const endDateTime = new Date(range[0].endDate);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    endDateTime.setHours(endHour, endMinute, 0, 0);

    // Format datetime in local timezone
    const formatLocalDateTime = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    };

    await fetch('/api/settings/user-edit-window', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        start_date: formatLocalDateTime(startDateTime),
        end_date: formatLocalDateTime(endDateTime),
      }),
    });
    setLoading(false);
    Swal.fire({
      icon: 'success',
      title: 'บันทึกช่วงเวลาเรียบร้อยแล้ว',
      confirmButtonText: 'ตกลง',
    }).then(() => {
      if (onClose) onClose();
    });
  };

  if (!open) return null;

  return (
    <div style={{ background: 'rgba(0,0,0,0.18)', position: 'fixed', zIndex: 100, left: 0, top: 0, width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ minWidth: 340, position: 'relative', background: '#fff', borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', padding: 28, display: 'flex', flexDirection: 'column', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
        <h3 style={{ marginBottom: 18, color: '#11998e', fontWeight: 700 }}>ตั้งช่วงเวลาตรวจนับคุรุภัณท์</h3>
        <DateRange
          editableDateInputs={true}
          onChange={(item: any) => setRange([item.selection])}
          moveRangeOnFirstSelection={false}
          ranges={range}
          showSelectionPreview={true}
          showMonthAndYearPickers={true}
          rangeColors={['#11998e']}
          maxDate={new Date(new Date().getFullYear() + 1, 11, 31)}
          months={1}
          direction="horizontal"
        />
        <div style={{ marginTop: 16, display: 'flex', gap: 12, alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
            <label style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>เวลาเริ่มต้น:</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                fontSize: 14,
                width: '100%'
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
            <label style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>เวลาสิ้นสุด:</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                fontSize: 14,
                width: '100%'
              }}
            />
          </div>
        </div>
        <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'flex-end', width: '100%' }}>
          <button onClick={onClose} style={{ background: '#eee', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
          <button onClick={handleSave} disabled={loading} style={{ background: '#11998e', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', cursor: 'pointer', fontWeight: 500 }}>{loading ? 'กำลังบันทึก...' : 'บันทึก'}</button>
        </div>
      </div>
    </div>
  );
};

export default UserEditWindowSetting; 
