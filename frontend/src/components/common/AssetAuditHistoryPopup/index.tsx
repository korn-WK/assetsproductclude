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
  assetId?: number | string;
  open: boolean;
  onClose: () => void;
  type?: 'audit' | 'transfer';
  logs?: any[];
  asset?: any;
}

const AssetAuditHistoryPopup: React.FC<AssetAuditHistoryPopupProps> = ({ assetId, open, onClose, type = 'audit', logs = [], asset }) => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;

  useEffect(() => {
    if (type === 'audit' && open && assetId) {
      setLoading(true);
      fetch(`/api/assets/asset-audits/${assetId}`)
        .then(res => res.json())
        .then(data => {
          setAuditLogs(data);
          setCurrentPage(1);
        })
        .catch(() => setAuditLogs([]))
        .finally(() => setLoading(false));
    }
  }, [open, assetId, type]);

  const displayLogs = type === 'transfer' ? (Array.isArray(logs) ? logs : []) : auditLogs;
  const totalPages = Math.ceil(displayLogs.length / rowsPerPage);
  const paginatedLogs = displayLogs.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.popup} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AiOutlineHistory />{type === 'transfer' ? ' ประวัติการโอนย้าย' : ' ประวัติการตรวจนับ'}
          </h2>
          <button className={styles.closeButton} onClick={onClose} title="Close">
            <AiOutlineClose />
          </button>
        </div>
        <div className={styles.content}>
          {loading && type === 'audit' ? (
            <div style={{ color: '#888', fontSize: 15 }}>กำลังโหลดประวัติ...</div>
          ) : displayLogs.length === 0 ? (
            <div style={{ color: '#888', fontSize: 15 }}>{type === 'transfer' ? 'ไม่พบประวัติการโอนย้าย' : 'ไม่พบประวัติการตรวจนับ'}</div>
          ) : (
            <>
              <table className={styles.auditHistoryTable}>
                <thead>
                  {type === 'transfer' ? (
                    <tr style={{ background: '#f3f4f6' }}>
                      <th>วันที่</th>
                      <th>จากแผนก</th>
                      <th>ไปแผนก</th>
                      <th>ผู้ดำเนินการ</th>
                      <th>สถานะ</th>
                      <th>หมายเหตุ</th>
                    </tr>
                  ) : (
                  <tr style={{ background: '#f3f4f6' }}>
                      <th>วันที่</th>
                      <th>สถานะ</th>
                      <th>หมายเหตุ</th>
                      <th>ผู้ตรวจ</th>
                  </tr>
                  )}
                </thead>
                <tbody>
                  {type === 'transfer'
                    ? paginatedLogs.map((log, i) => (
                        <tr key={i}>
                          <td>{formatDate(log.requested_at || log.transfer_date)}</td>
                          <td>{log.from_department_name || '-'}</td>
                          <td>{log.to_department_name || '-'}</td>
                          <td>{log.requested_by_name || log.transferred_by_name || '-'}</td>
                          <td>{log.status}</td>
                          <td>{log.note || '-'}</td>
                        </tr>
                      ))
                    : paginatedLogs.map(log => (
                    <tr key={log.id}>
                          <td>{formatDate(log.checked_at)}</td>
                          <td>{log.status}</td>
                          <td>{log.note}</td>
                          <td>{log.user_name}</td>
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