import React from 'react';
import styles from './DropdownSelect.module.css';

interface Option {
  id: number | string;
  name: string;
  name_th?: string;
}

interface DropdownSelectProps {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  className?: string;
}

const DropdownSelect: React.FC<DropdownSelectProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder = 'เลือก...',
  disabled = false,
  required = false,
  error,
  className = '',
}) => {
  return (
    <div className={styles.dropdownContainer}>
      <label className={styles.label}>
        {label}
        {required && <span className={styles.required}>*</span>}
      </label>
      <select
        className={`${styles.select} ${error ? styles.error : ''} ${className}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.id} value={option.name_th || option.name}>
            {option.name_th || option.name}
          </option>
        ))}
      </select>
      {error && <div className={styles.errorMessage}>{error}</div>}
    </div>
  );
};

export default DropdownSelect; 