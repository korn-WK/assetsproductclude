import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { AiOutlineCalendar } from 'react-icons/ai';
import { DateRange } from 'react-date-range';
import { format } from 'date-fns';
import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';

interface DateRangeFilterButtonProps {
  value: { startDate?: Date; endDate?: Date };
  onChange: (range: { startDate?: Date; endDate?: Date }) => void;
  maxDate?: Date;
  minDate?: Date;
  label?: string;
}

const DateRangeFilterButton: React.FC<DateRangeFilterButtonProps> = ({ value, onChange, maxDate, minDate, label }) => {
  const [showPicker, setShowPicker] = useState(false);
  const [range, setRange] = useState<[{ startDate?: Date; endDate?: Date; key: string }]>([
    {
      startDate: value.startDate,
      endDate: value.endDate,
      key: 'selection',
    },
  ]);
  const [isMobile, setIsMobile] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [popupPos, setPopupPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 600);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (showPicker && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPopupPos({
        top: rect.bottom + 8, // 8px below the button
        left: rect.left,
      });
    }
  }, [showPicker]);

  const handleOk = () => {
    setShowPicker(false);
    onChange({ startDate: range[0].startDate, endDate: range[0].endDate });
  };

  const handleReset = () => {
    setRange([{ startDate: undefined, endDate: undefined, key: 'selection' }]);
    onChange({ startDate: undefined, endDate: undefined });
    setShowPicker(false);
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {(!isMobile && value.startDate && value.endDate) && (          // เมื่อเลือกวันที่แล้วจะแสดงวันที่ที่เลือกออกมา
          <span style={{ fontWeight: 500, color: '#11998e', fontSize: '1.05em' }}>
            {`${format(value.startDate, 'dd MMM yy')} - ${format(value.endDate, 'dd MMM yy')}`}
          </span>
        )}
        <button
          ref={buttonRef}
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
            height: '44px',
            width: '55px',
            boxShadow: 'none',
            cursor: 'pointer',
            transition: 'border 0.2s',
            outline: showPicker ? '2px solid #11998e' : 'none',
          }}
          title={label || 'เลือกช่วงวันที่'}
        >
          <AiOutlineCalendar style={{ fontSize: '1.35em', color: '#222' }} />
        </button>
      </div>
      {showPicker && ReactDOM.createPortal(
        <div style={{
          position: 'fixed',
          zIndex: 90,
          top: popupPos.top,
          left: isMobile ? 'auto' : popupPos.left,
          right: isMobile ? 8 : 'auto',
          boxSizing: isMobile ? 'border-box' : undefined,
          border: '1.5px solid #e5e7eb',
          background: '#fff',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          borderRadius: 12,
          marginTop: 0,
        }}>
          <DateRange
            editableDateInputs={true}
            onChange={(item: any) => setRange([item.selection])}
            moveRangeOnFirstSelection={false}
            ranges={range}
            showSelectionPreview={true}
            showMonthAndYearPickers={true}
            maxDate={maxDate || new Date()}
            minDate={minDate}
            rangeColors={['#11998e']}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0.8rem 0.8rem', background: '#ffffff' }}>
            <button
              style={{ padding: '0.5rem 1.1rem', borderRadius: 6, border: 'none', background: '#11998e', color: '#fff', fontWeight: 500, cursor: 'pointer' }}
              onClick={handleReset}
            >
              Reset
            </button>
            <button
              style={{ marginLeft: 8, padding: '0.5rem 1.1rem', borderRadius: 6, border: 'none', background: '#11998e', color: '#fff', fontWeight: 500, cursor: 'pointer' }}
              onClick={handleOk}
            >
              OK
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default DateRangeFilterButton; 