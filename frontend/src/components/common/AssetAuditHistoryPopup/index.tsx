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
  const [isMobile, setIsMobile] = useState(false);
  const rowsPerPage = 5;

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 600);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
      <div className={styles.popup} onClick={e => e.stopPropagation()} style={{
        width: isMobile ? '95%' : '80%',
        maxWidth: isMobile ? '95%' : '800px',
        maxHeight: isMobile ? '90vh' : '80vh',
        margin: isMobile ? '20px auto' : '40px auto'
      }}>
        <div className={styles.header}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: isMobile ? '1.1rem' : '1.3rem' }}>
            <AiOutlineHistory />{type === 'transfer' ? ' ประวัติการโอนย้าย' : ' ประวัติการตรวจนับ'}
          </h2>
          <button className={styles.closeButton} onClick={onClose} title="Close">
            <AiOutlineClose />
          </button>
        </div>
        <div className={styles.content} style={{ padding: isMobile ? '12px' : '20px' }}>
          {loading && type === 'audit' ? (
            <div style={{ color: '#888', fontSize: 15 }}>กำลังโหลดประวัติ...</div>
          ) : displayLogs.length === 0 ? (
            <div style={{ color: '#888', fontSize: 15 }}>{type === 'transfer' ? 'ไม่พบประวัติการโอนย้าย' : 'ไม่พบประวัติการตรวจนับ'}</div>
          ) : (
            <>
              {/* แสดงจำนวนรายการทั้งหมด */}
              <div style={{ 
                marginBottom: 16, 
                padding: '8px 12px', 
                background: '#f8fafc', 
                borderRadius: 8, 
                fontSize: isMobile ? '0.85rem' : '0.9rem',
                color: '#64748b',
                textAlign: 'center'
              }}>
                แสดง {paginatedLogs.length} จาก {displayLogs.length} รายการ
                {totalPages > 1 && ` (หน้า ${currentPage} จาก ${totalPages})`}
              </div>
              
              {isMobile ? (
                // Mobile card layout
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {type === 'transfer' ? (
                    paginatedLogs.map((log, i) => (
                      <div key={i} style={{
                        background: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: 12,
                        padding: 16,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontWeight: 600, color: '#374151', fontSize: '0.9rem' }}>
                            {formatDate(log.requested_at || log.transfer_date)}
                          </span>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: 6,
                            fontSize: '0.8rem',
                            fontWeight: 500,
                            background: log.status === 'approved' ? '#dcfce7' : log.status === 'rejected' ? '#fee2e2' : '#fef3c7',
                            color: log.status === 'approved' ? '#166534' : log.status === 'rejected' ? '#991b1b' : '#92400e'
                          }}>
                            {log.status}
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 500, color: '#6b7280', fontSize: '0.85rem', minWidth: 60 }}>จาก:</span>
                            <span style={{ fontSize: '0.9rem' }}>{log.from_department_name || '-'}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 500, color: '#6b7280', fontSize: '0.85rem', minWidth: 60 }}>ไป:</span>
                            <span style={{ fontSize: '0.9rem' }}>{log.to_department_name || '-'}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 500, color: '#6b7280', fontSize: '0.85rem', minWidth: 60 }}>ผู้ดำเนินการ:</span>
                            <span style={{ fontSize: '0.9rem' }}>{log.requested_by_name || log.transferred_by_name || '-'}</span>
                          </div>
                          {log.note && (
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                              <span style={{ fontWeight: 500, color: '#6b7280', fontSize: '0.85rem', minWidth: 60 }}>หมายเหตุ:</span>
                              <span style={{ fontSize: '0.9rem' }}>{log.note}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    paginatedLogs.map(log => (
                      <div key={log.id} style={{
                        background: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: 12,
                        padding: 16,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontWeight: 600, color: '#374151', fontSize: '0.9rem' }}>
                            {formatDate(log.checked_at)}
                          </span>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: 6,
                            fontSize: '0.8rem',
                            fontWeight: 500,
                            background: '#dcfce7',
                            color: '#166534'
                          }}>
                            {log.status}
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 500, color: '#6b7280', fontSize: '0.85rem', minWidth: 60 }}>ผู้ตรวจ:</span>
                            <span style={{ fontSize: '0.9rem' }}>{log.user_name}</span>
                          </div>
                          {log.note && (
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                              <span style={{ fontWeight: 500, color: '#6b7280', fontSize: '0.85rem', minWidth: 60 }}>หมายเหตุ:</span>
                              <span style={{ fontSize: '0.9rem' }}>{log.note}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                // Desktop table layout
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
              )}
              
              {totalPages > 1 && (
                <div style={{ 
                  marginTop: 16, 
                  display: 'flex', 
                  justifyContent: 'center',
                  padding: isMobile ? '0 12px' : '0'
                }}>
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