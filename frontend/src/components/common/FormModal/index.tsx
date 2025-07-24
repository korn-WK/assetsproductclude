import React, { useEffect, useState } from 'react';
import { AiOutlineClose } from 'react-icons/ai';
import Swal from 'sweetalert2';
import styles from './FormModal.module.css';

interface FormField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'email' | 'password' | 'number' | 'color';
  required?: boolean;
  placeholder?: string;
}

interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  fields: FormField[];
  initialData?: any;
  onSubmit: (data: any) => Promise<void>;
  submitText?: string;
}

const FormModal: React.FC<FormModalProps> = ({
  isOpen,
  onClose,
  title,
  fields,
  initialData = {},
  onSubmit,
  submitText = 'Save'
}) => {
  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData(initialData);
    }
  }, [isOpen, JSON.stringify(initialData)]);

  const handleInputChange = (name: string, value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    const missingFields = fields
      .filter(field => field.required && !formData[field.name])
      .map(field => field.label);

    if (missingFields.length > 0) {
      Swal.fire({
        title: 'Validation Error',
        text: `Please fill in the following required fields: ${missingFields.join(', ')}`,
        icon: 'error'
      });
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
      Swal.fire({
        title: 'Success!',
        text: 'Data saved successfully',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
      onClose();
    } catch (error) {
      console.error('Error submitting form:', error);
      Swal.fire({
        title: 'Error!',
        text: 'Failed to save data. Please try again.',
        icon: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>{title}</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <AiOutlineClose />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {fields.map((field) => (
            <div key={field.name} className={styles.field}>
              <label htmlFor={field.name} className={styles.label}>
                {field.label}
                {field.required && <span className={styles.required}>*</span>}
              </label>
              
              {field.type === 'textarea' ? (
                <textarea
                  id={field.name}
                  name={field.name}
                  value={formData[field.name] || ''}
                  onChange={(e) => handleInputChange(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  className={styles.textarea}
                  rows={4}
                />
              ) : field.type === 'color' ? (
                <input
                  id={field.name}
                  name={field.name}
                  type="color"
                  value={formData[field.name] || '#adb5bd'}
                  onChange={(e) => handleInputChange(field.name, e.target.value)}
                  className={styles.input}
                  style={{ width: 40, height: 28, border: 'none', background: 'none', cursor: 'pointer', verticalAlign: 'middle' }}
                />
              ) : (
                <input
                  id={field.name}
                  name={field.name}
                  type={field.type}
                  value={formData[field.name] || ''}
                  onChange={(e) => handleInputChange(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  className={styles.input}
                />
              )}
            </div>
          ))}

          <div className={styles.actions}>
            <button
              type="button"
              onClick={onClose}
              className={styles.cancelButton}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? 'Saving...' : submitText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FormModal; 