import React, { useEffect, useState } from 'react';
import { DateRange, RangeKeyDict } from 'react-date-range';
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch('/api/settings/user-edit-window')
      .then(res => res.json())
      .then(data => {
        if (data.start_date && data.end_date) {
          setRange([
            {
              startDate: new Date(data.start_date),
              endDate: new Date(data.end_date),
              key: 'selection',
            },
          ]);
        }
      });
  }, [open]);

  const handleSave = async () => {
    setLoading(true);
    await fetch('/api/settings/user-edit-window', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        start_date: range[0].startDate.toISOString().slice(0, 19).replace('T', ' '),
        end_date: range[0].endDate.toISOString().slice(0, 19).replace('T', ' '),
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
          onChange={(item: RangeKeyDict) => setRange([item.selection])}
          moveRangeOnFirstSelection={false}
          ranges={range}
          showSelectionPreview={true}
          showMonthAndYearPickers={true}
          rangeColors={['#11998e']}
        />
        <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'flex-end', width: '100%' }}>
          <button onClick={onClose} style={{ background: '#eee', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
          <button onClick={handleSave} disabled={loading} style={{ background: '#11998e', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5rem 1.2rem', cursor: 'pointer', fontWeight: 500 }}>{loading ? 'กำลังบันทึก...' : 'บันทึก'}</button>
        </div>
      </div>
    </div>
  );
};

export default UserEditWindowSetting; 
