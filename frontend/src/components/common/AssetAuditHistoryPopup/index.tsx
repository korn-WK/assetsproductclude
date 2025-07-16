import React, { useEffect, useState } from 'react';
import styles from './AssetAuditHistoryPopup.module.css';
import { AiOutlineClose, AiOutlineHistory } from 'react-icons/ai';
import { formatDate } from '../../../lib/utils';
import Pagination from '../Pagination';

interface AuditLog {
  id: number;
  status: string;
  note: string;
  user_name: string;
  checked_at: string;
}

interface AssetAuditHistoryPopupProps {
  assetId: number | string;
  open: boolean;
  onClose: () => void;
}

const AssetAuditHistoryPopup: React.FC<AssetAuditHistoryPopupProps> = ({ assetId, open, onClose }) => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;

  useEffect(() => {
    if (open && assetId) {
      setLoading(true);
      fetch(`/api/assets/asset-audits/${assetId}`)
        .then(res => res.json())
        .then(data => {
          setAuditLogs(data);
          setCurrentPage(1); // Reset to first page when asset changes
        })
        .catch(() => setAuditLogs([]))
        .finally(() => setLoading(false));
    }
  }, [open, assetId]);

  const totalPages = Math.ceil(auditLogs.length / rowsPerPage);
  const paginatedLogs = auditLogs.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.popup} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AiOutlineHistory /> ประวัติการตรวจนับ
          </h2>
          <button className={styles.closeButton} onClick={onClose} title="Close">
            <AiOutlineClose />
          </button>
        </div>
        <div className={styles.content}>
          {loading ? (
            <div style={{ color: '#888', fontSize: 15 }}>กำลังโหลดประวัติ...</div>
          ) : auditLogs.length === 0 ? (
            <div style={{ color: '#888', fontSize: 15 }}>ไม่พบประวัติการตรวจนับ</div>
          ) : (
            <>
              <table className={styles.auditHistoryTable}>
                <thead>
                  <tr style={{ background: '#f3f4f6' }}>
                    <th style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb' }}>วันที่</th>
                    <th style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb' }}>สถานะ</th>
                    <th style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb' }}>หมายเหตุ</th>
                    <th style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb' }}>ผู้ตรวจ</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedLogs.map(log => (
                    <tr key={log.id}>
                      <td style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb' }}>{formatDate(log.checked_at)}</td>
                      <td style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb' }}>{log.status}</td>
                      <td style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb' }}>{log.note}</td>
                      <td style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb' }}>{log.user_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {totalPages > 1 && (
                <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssetAuditHistoryPopup; 