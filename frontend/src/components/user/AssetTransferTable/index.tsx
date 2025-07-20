// โครงสร้างเริ่มต้น: copy โครงสร้างหลักจาก AssetVerificationTable (user)
import React, { useEffect, useState } from 'react';

interface AssetTransfer {
  id: number;
  asset_id: number;
  asset_name: string;
  asset_code: string;
  from_department: string;
  to_department: string;
  requested_by_name: string;
  approved_by_name?: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  approved_at?: string;
  note?: string;
}

const TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

const AssetTransferTable: React.FC = () => {
  const [tab, setTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [transfers, setTransfers] = useState<AssetTransfer[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTransfers();
    // eslint-disable-next-line
  }, [tab]);

  const fetchTransfers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/asset-transfers?status=${tab}`);
      const data = await res.json();
      setTransfers(data);
    } catch (e) {
      setTransfers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    await fetch(`/api/asset-transfers/${id}/approve`, { method: 'PATCH' });
    fetchTransfers();
  };
  const handleReject = async (id: number) => {
    await fetch(`/api/asset-transfers/${id}/reject`, { method: 'PATCH' });
    fetchTransfers();
  };

  return (
    <div>
      <h2>Asset Transfer Verification</h2>
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            style={{
              padding: '8px 24px',
              borderRadius: 8,
              border: 'none',
              background: tab === t.key ? '#6366f1' : '#e5e7eb',
              color: tab === t.key ? 'white' : '#374151',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f3f4f6' }}>
              <th style={{ padding: 8 }}>Asset Code</th>
              <th style={{ padding: 8 }}>Asset Name</th>
              <th style={{ padding: 8 }}>From Department</th>
              <th style={{ padding: 8 }}>To Department</th>
              <th style={{ padding: 8 }}>Requested By</th>
              <th style={{ padding: 8 }}>Requested At</th>
              {tab !== 'pending' && <th style={{ padding: 8 }}>Approved By</th>}
              {tab !== 'pending' && <th style={{ padding: 8 }}>Approved At</th>}
              <th style={{ padding: 8 }}>Status</th>
              {tab === 'pending' && <th style={{ padding: 8 }}>Action</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} style={{ textAlign: 'center', padding: 24 }}>Loading...</td></tr>
            ) : transfers.length === 0 ? (
              <tr><td colSpan={10} style={{ textAlign: 'center', padding: 24 }}>No data</td></tr>
            ) : (
              transfers.map(tr => (
                <tr key={tr.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: 8 }}>{tr.asset_code}</td>
                  <td style={{ padding: 8 }}>{tr.asset_name}</td>
                  <td style={{ padding: 8 }}>{tr.from_department}</td>
                  <td style={{ padding: 8 }}>{tr.to_department}</td>
                  <td style={{ padding: 8 }}>{tr.requested_by_name}</td>
                  <td style={{ padding: 8 }}>{new Date(tr.requested_at).toLocaleString()}</td>
                  {tab !== 'pending' && <td style={{ padding: 8 }}>{tr.approved_by_name || '-'}</td>}
                  {tab !== 'pending' && <td style={{ padding: 8 }}>{tr.approved_at ? new Date(tr.approved_at).toLocaleString() : '-'}</td>}
                  <td style={{ padding: 8 }}>
                    {tr.status === 'pending' && <span style={{ color: '#f59e42', fontWeight: 600 }}>Pending</span>}
                    {tr.status === 'approved' && <span style={{ color: '#10b981', fontWeight: 600 }}>Approved</span>}
                    {tr.status === 'rejected' && <span style={{ color: '#ef4444', fontWeight: 600 }}>Rejected</span>}
                  </td>
                  {tab === 'pending' && (
                    <td style={{ padding: 8 }}>
                      <button style={{ marginRight: 8, background: '#10b981', color: 'white', border: 'none', borderRadius: 6, padding: '6px 16px', cursor: 'pointer' }} onClick={() => handleApprove(tr.id)}>Approve</button>
                      <button style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: 6, padding: '6px 16px', cursor: 'pointer' }} onClick={() => handleReject(tr.id)}>Reject</button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AssetTransferTable; 