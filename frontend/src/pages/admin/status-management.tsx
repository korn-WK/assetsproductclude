import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import AdminSidebar from '../../components/admin/AdminSidebar';
import Navbar from '../../components/common/Navbar';
import AdminTable from '../../components/admin/AdminTable';
import FormModal from '../../components/common/FormModal';
import AdminRoute from '../../components/auth/AdminRoute';
import Layout from '../../components/common/Layout';
import { useStatusOptions } from '../../lib/statusOptions';

interface Status {
  id: number;
  value: string;
  label: string;
  color?: string;
}

const StatusManagementPage: React.FC = () => {
  const { options: statuses, loading, refresh } = useStatusOptions();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<Status | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formColor, setFormColor] = useState('#adb5bd');

  const handleAdd = () => {
    setEditingStatus({ color: '#adb5bd', value: '', label: '' } as Status);
    setIsModalOpen(true);
  };

  const handleEdit = (status: Status) => {
    setEditingStatus({
      id: status.id,
      value: status.value,
      label: status.label,
      color: status.color || '#adb5bd',
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string | number) => {
    const statusId = typeof id === 'string' ? parseInt(id, 10) : id;
    try {
      const response = await fetch(`/api/statuses/${statusId}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete status');
      }
      refresh();
    } catch (error: any) {
      alert(error.message || 'เกิดข้อผิดพลาดในการลบสถานะ');
    }
  };

  const handleSubmit = async (formData: any) => {
    try {
      const color = formData.color || '#adb5bd';
      if (editingStatus && editingStatus.id) {
        // Edit
        const response = await fetch(`/api/statuses/${editingStatus.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: formData.value, label: formData.label, color })
        });
        if (!response.ok) {
          const errorData = await response.json();
          if (errorData.error === 'Status not found') {
            setIsModalOpen(false);
            refresh();
            return;
          }
          throw new Error(errorData.error || 'Failed to update status');
        }
      } else {
        // Add
        const response = await fetch('/api/statuses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: formData.value, label: formData.label, color })
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create status');
        }
      }
      refresh();
    } catch (error: any) {
      alert(error.message || 'เกิดข้อผิดพลาดในการบันทึกสถานะ');
      throw error;
    }
  };

  const columns = [
    {
      key: 'label',
      label: 'ชื่อสถานะ (Status Name)',
      render: (value: string, row: Status) => value
    },
    {
      key: 'value',
      label: 'รหัส (Value)',
    },
    {
      key: 'color',
      label: 'สี (Color)',
      render: (color: string) => (
        <span style={{ display: 'inline-block', width: 28, height: 18, borderRadius: 4, background: color || '#adb5bd', border: '1px solid #ccc' }} />
      )
    }
  ];

  const formFields = [
    {
      name: 'label',
      label: 'ชื่อสถานะ (Status Name)',
      type: 'text' as const,
      required: true,
      placeholder: 'กรอกชื่อสถานะ'
    },
    {
      name: 'value',
      label: 'รหัส (Value)',
      type: 'text' as const,
      required: true,
      placeholder: 'กรอกรหัสสถานะ (เช่น available, damaged)'
    },
    {
      name: 'color',
      label: 'สี (Color)',
      type: 'color' as const,
      required: false,
      placeholder: ''
    }
  ];

  return (
    <AdminRoute>
      <>
        <Head>
          <title>Status Management - Asset Management System</title>
          <meta name="description" content="Manage statuses in the asset management system" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
        <Layout sidebar={<AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />}>
          <Navbar title="Status Management" isAdmin={true} onMenuClick={() => setSidebarOpen(true)} onSearch={setSearchTerm} />
          <div>
            <AdminTable
              title="Status"
              data={statuses}
              columns={columns}
              onAdd={handleAdd}
              onEdit={handleEdit}
              onDelete={handleDelete}
              loading={loading}
              searchPlaceholder="ค้นหาสถานะ..."
              searchTerm={searchTerm}
            />
            <FormModal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              onSubmit={handleSubmit}
              fields={formFields}
              initialData={editingStatus || { color: '#adb5bd', value: '', label: '' }}
              title={editingStatus ? 'แก้ไขสถานะ' : 'เพิ่มสถานะ'}
              submitText={editingStatus ? 'อัปเดตสถานะ' : 'เพิ่มสถานะ'}
            />
          </div>
        </Layout>
      </>
    </AdminRoute>
  );
};

export default StatusManagementPage; 