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

interface AssetTransferTableProps {
  searchTerm?: string;
}
function highlightText(text: string, keyword: string) {
  if (!keyword) return text;
  const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.split(regex).map((part, i) =>
    part.toLowerCase() === keyword.toLowerCase() ? <mark key={i} style={{ background: '#ffe066', color: '#222', padding: 0 }}>{part}</mark> : part
  );
}

const AssetTransferTable: React.FC<AssetTransferTableProps> = ({ searchTerm }) => {
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

  const q = (typeof searchTerm === 'string' ? searchTerm : '').trim().toLowerCase();
  const filteredTransfers = transfers.filter(tr => {
    if (!q) return true;
    return (
      (tr.asset_code || '').toLowerCase().includes(q) ||
      (tr.asset_name || '').toLowerCase().includes(q) ||
      (tr.from_department || '').toLowerCase().includes(q) ||
      (tr.to_department || '').toLowerCase().includes(q) ||
      (tr.requested_by_name || '').toLowerCase().includes(q) ||
      (tr.requested_at || '').toLowerCase().includes(q) ||
      (tr.status || '').toLowerCase().includes(q)
    );
  });
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
            ) : filteredTransfers.length === 0 ? (
              <tr><td colSpan={10} style={{ textAlign: 'center', padding: 24 }}>No data</td></tr>
            ) : (
              filteredTransfers.map(tr => (
                <tr key={tr.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: 8 }}>{highlightText(tr.asset_code || '', searchTerm || '')}</td>
                  <td style={{ padding: 8 }}>{highlightText(tr.asset_name || '', searchTerm || '')}</td>
                  <td style={{ padding: 8 }}>{highlightText(tr.from_department || '', searchTerm || '')}</td>
                  <td style={{ padding: 8 }}>{highlightText(tr.to_department || '', searchTerm || '')}</td>
                  <td style={{ padding: 8 }}>{highlightText(tr.requested_by_name || '', searchTerm || '')}</td>
                  <td style={{ padding: 8 }}>{highlightText(new Date(tr.requested_at).toLocaleString(), searchTerm || '')}</td>
                  {tab !== 'pending' && <td style={{ padding: 8 }}>{highlightText(tr.approved_by_name || '-', searchTerm || '')}</td>}
                  {tab !== 'pending' && <td style={{ padding: 8 }}>{highlightText(tr.approved_at ? new Date(tr.approved_at).toLocaleString() : '-', searchTerm || '')}</td>}
                  <td style={{ padding: 8 }}>
                    {tr.status === 'pending' && <span style={{ color: '#f59e42', fontWeight: 600 }}>{highlightText('Pending', searchTerm || '')}</span>}
                    {tr.status === 'approved' && <span style={{ color: '#10b981', fontWeight: 600 }}>{highlightText('Approved', searchTerm || '')}</span>}
                    {tr.status === 'rejected' && <span style={{ color: '#ef4444', fontWeight: 600 }}>{highlightText('Rejected', searchTerm || '')}</span>}
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