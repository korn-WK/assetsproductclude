import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import AdminSidebar from '../../components/admin/AdminSidebar';
import Navbar from '../../components/common/Navbar';
import AdminTable from '../../components/admin/AdminTable';
import FormModal from '../../components/common/FormModal';
import AdminRoute from '../../components/auth/AdminRoute';
import styles from '../../../styles/Home.module.css';

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
      <div className={styles.container}>
        <Head>
          <title>Location Management - Asset Management System</title>
          <meta name="description" content="Manage locations in the asset management system" />
          <link rel="icon" href="/favicon.ico" />
        </Head>

        <AdminSidebar />

        <main className={styles.mainContent} style={{ marginLeft: '280px' }}>
          <Navbar title="" isAdmin={true} />
          <div className={styles.content} style={{ padding: '2rem' }}>
            <div style={{ 
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              borderRadius: '20px',
              padding: '2rem',
              marginBottom: '2rem',
              color: 'white',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)'
            }}>
              <h1 style={{ 
                fontSize: '2rem', 
                fontWeight: '700', 
                margin: '0 0 0.5rem 0',
                textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
              }}>
                Location Management
              </h1>
              <p style={{ 
                fontSize: '1.1rem', 
                margin: '0', 
                opacity: '0.9',
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
              }}>
                Add, edit, and manage locations in the system
              </p>
            </div>

            <AdminTable
              title="Locations"
              data={locations}
              columns={columns}
              onAdd={handleAdd}
              onEdit={handleEdit}
              onDelete={handleDelete}
              loading={loading}
              searchPlaceholder="Search locations..."
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
        </main>
      </div>
    </AdminRoute>
  );
};

export default LocationManagementPage; 