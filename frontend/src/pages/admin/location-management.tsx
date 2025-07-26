import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import AdminSidebar from '../../components/admin/AdminSidebar';
import Navbar from '../../components/common/Navbar';
import AdminTable from '../../components/admin/AdminTable';
import FormModal from '../../components/common/FormModal';
import AdminRoute from '../../components/auth/AdminRoute';
import Layout from '../../components/common/Layout';

interface Location {
  id: number;
  name: string;
  description?: string;
  address?: string;
  created_at?: string;
  updated_at?: string;
}

const LocationManagementPage: React.FC = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLocations = async () => {
    try {
      const response = await fetch('/api/locations', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setLocations(data);
      } else {
        console.error('Failed to fetch locations');
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const handleAdd = () => {
    setEditingLocation(null);
    setIsModalOpen(true);
  };

  const handleEdit = (location: Location) => {
    setEditingLocation(location);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string | number) => {
    try {
      const response = await fetch(`/api/locations/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete location');
      }

      await fetchLocations();
    } catch (error) {
      console.error('Error deleting location:', error);
      throw error;
    }
  };

  const handleSubmit = async (formData: any) => {
    try {
      const url = editingLocation 
        ? `/api/locations/${editingLocation.id}`
        : '/api/locations';
      
      const method = editingLocation ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save location');
      }

      await fetchLocations();
    } catch (error) {
      console.error('Error saving location:', error);
      throw error;
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Location Name',
    },
    {
      key: 'description',
      label: 'Description',
      render: (value: string) => value || '-'
    },
    {
      key: 'address',
      label: 'Address',
      render: (value: string) => value || '-'
    },
    {
      key: 'created_at',
      label: 'Created At',
      render: (value: string) => value ? new Date(value).toLocaleDateString('en-US') : '-'
    }
  ];

  const formFields = [
    {
      name: 'name',
      label: 'Location Name',
      type: 'text' as const,
      required: true,
      placeholder: 'Enter location name'
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea' as const,
      required: false,
      placeholder: 'Enter location description (optional)'
    },
    {
      name: 'address',
      label: 'Address',
      type: 'textarea' as const,
      required: false,
      placeholder: 'Enter location address (optional)'
    }
  ];

  return (
    <AdminRoute>
      <>
        <Head>
          <title>Location Management - Asset Management System</title>
          <meta name="description" content="Manage locations in the asset management system" />
          <link rel="icon" href="/favicon.ico" />
        </Head>

        <Layout sidebar={<AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />}>
          <Navbar title="Location Management" isAdmin={true} onMenuClick={() => setSidebarOpen(true)} onSearch={setSearchTerm} />
          <div>
            <AdminTable
              title="Location"
              data={locations}
              columns={columns}
              onAdd={handleAdd}
              onEdit={handleEdit}
              onDelete={handleDelete}
              loading={loading}
              searchPlaceholder="Search locations..."
              searchTerm={searchTerm}
            />

            <FormModal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              onSubmit={handleSubmit}
              fields={formFields}
              initialData={editingLocation || {}}
              title={editingLocation ? 'Edit Location' : 'Add Location'}
              submitText={editingLocation ? 'Update Location' : 'Add Location'}
            />
          </div>
        </Layout>
      </>
    </AdminRoute>
  );
};

export default LocationManagementPage; 