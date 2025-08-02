// src/components/DashboardContent/index.tsx
import React, { useEffect, useState } from 'react';
import { useDashboard } from '../../../contexts/DashboardContext';
import styles from './DashboardContent.module.css';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { FaRegCalendarAlt } from 'react-icons/fa';
import { AiOutlineDown } from 'react-icons/ai';
import { useRouter } from 'next/router';
import { useAuth } from '../../../contexts/AuthContext'; // Added import

const CARD_COLORS = [
  '#28a745', // ฟ้า
  '#b35f00', // เขียว
  '#6f42c1', // ส้ม
  '#adb5bd', // แดง
  '#dc3545', // ม่วง
  '#b02a37', // เหลือง
  '#795548', // น้ำเงิน
  '#218838', // แดงเข้ม
  '#6c757d', // ฟ้าอมเขียว
  '#17a2b8',
  '#fd7e14', 
  '#e0a800', 
  '#007bff', 
  '#6c757d', 
  '#5bc0de', 
  '#ffc107', 
  '#6cb2eb',
  '#20c997 ',
  '#c82333', 
  '#bd2130', // เหลืองเข้ม
];

const LINE_COLORS = ['#06b6d4', '#facc15', '#6366f1', '#f43f5e', '#10b981', '#f59e42', '#a78bfa', '#ef4444', '#14b8a6', '#eab308'];

const DashboardContent: React.FC = () => {
  const { stats, loading, error, fetchStatsByYear } = useDashboard();
  const [graphData, setGraphData] = useState<any>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [departments, setDepartments] = useState<{ id: number; name_th: string }[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('All Departments');
  const [statuses, setStatuses] = useState<{ value: string; label: string }[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const router = useRouter();
  const { isAdmin, user } = useAuth(); // Added useAuth hook

  useEffect(() => {
    fetch('/api/statuses')
      .then(res => res.json())
      .then(data => setStatuses(data))
      .catch(() => setStatuses([]));
  }, []);

  // ใช้ข้อมูลจริงจาก backend
  const backendStatusMap = new Map((stats?.statuses || []).map(s => [s.status, s.count]));
  console.log('DashboardContent: backendStatusMap:', Array.from(backendStatusMap.entries()));
  console.log('DashboardContent: statuses from API:', statuses);
  const mergedStatuses = statuses.map(s => ({
    status: s.value,
    label: s.label,
    count: backendStatusMap.get(s.label) || 0
  }));
  console.log('DashboardContent: mergedStatuses:', mergedStatuses);
  
  // Sort statuses ก-ฮ
  const sortedStatuses = mergedStatuses.slice().sort((a, b) => a.label.localeCompare(b.label, 'th'));
  // Find the "พร้อมใช้งาน" status by label, not by value
  const readyCardTop = sortedStatuses.find(c => c.label === 'พร้อมใช้งาน');
  const otherCards = sortedStatuses.filter(c => c.label !== 'พร้อมใช้งาน');
  // กรณีต้องการให้ "พร้อมใช้งาน" อยู่บนสุดเสมอ (ถ้าไม่ต้องการ ให้ใช้ sortedStatuses)
  const allCards = readyCardTop ? [readyCardTop, ...otherCards] : sortedStatuses;

  // Sort departments ก-ฮ ทุกครั้งก่อน map
  const sortedDepartments = departments.slice().sort((a, b) => a.name_th.localeCompare(b.name_th, 'th'));

  // เตรียมข้อมูลสำหรับกราฟเส้น: ทุก status ตามลำดับ card
  const statusChartData = allCards.map(c => ({ status: c.label, count: c.count }));

  // สำหรับกราฟเส้นแบบ multi-line ใช้ข้อมูลจริงจาก graphData.bar
  let lineKeys: string[] = [];
  let multiLineData: any[] = [];
  if (graphData && graphData.bar && graphData.bar.series && graphData.bar.labels) {
    lineKeys = graphData.bar.series.map((s: { name: string }) => s.name);
    multiLineData = graphData.bar.labels.map((month: string, i: number) => {
      const obj: any = { month };
      graphData.bar.series.forEach((s: { name: string; data: number[] }) => {
        obj[s.name] = s.data[i];
      });
      return obj;
    });
  }
  const [visibleLines, setVisibleLines] = useState<{ [key: string]: boolean }>(() => {
    const initial: { [key: string]: boolean } = {};
    lineKeys.forEach((k: string) => { initial[k] = true; });
    return initial;
  });

  // สำหรับ bar chart: state สำหรับ checkbox - ใช้ label แทน status
  const [visibleBarStatuses, setVisibleBarStatuses] = useState<{ [key: string]: boolean }>(() => {
    const initial: { [key: string]: boolean } = {};
    allCards.forEach(c => { initial[c.label] = true; });
    return initial;
  });
  const filteredBarChartData = statusChartData.filter(d => visibleBarStatuses[d.status]);

  // สร้าง mapping status → สี (คงที่)
  const statusColorMap: { [status: string]: string } = {};
  allCards.forEach((c, idx) => {
    statusColorMap[c.status] = CARD_COLORS[idx % CARD_COLORS.length];
  });

  // หาจำนวนทั้งหมดและจำนวนพร้อมใช้งาน
  const totalCount = allCards.reduce((sum, c) => sum + c.count, 0);
  const readyCount = allCards.find(c => c.label === 'พร้อมใช้งาน')?.count || 0;

  // ดึงรายชื่อหน่วยงาน
  useEffect(() => {
    async function fetchDepartments() {
      try {
        const res = await axios.get('/api/assets/departments');
        setDepartments(res.data || []);
      } catch (e) {
        setDepartments([]);
      }
    }
    fetchDepartments();
  }, []);

  // ดึงข้อมูล assets ตาม department ที่เลือก
  useEffect(() => {
    fetchStatsByYear(selectedYear, selectedDepartment);
    // eslint-disable-next-line
  }, [selectedYear, selectedDepartment]);

  useEffect(() => {
    async function fetchGraphs() {
      try {
        const res = await axios.get('/api/assets/dashboard-graphs');
        setGraphData(res.data);
      } catch (e) {
        setGraphData(null);
      }
    }
    fetchGraphs();
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 600);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Add this helper for Thai date formatting
  const getThaiDateString = () => {
    const now = new Date();
    const day = now.getDate();
    const month = now.toLocaleString('th-TH', { month: 'long' });
    const year = now.getFullYear() + 543;
    return `วันที่: ${day} ${month} ${year}`;
  };

  // Add click handler for status cards
  const handleStatusCardClick = (label: string) => {
    console.log('DashboardContent: Status card clicked with label:', label);
    console.log('DashboardContent: User isAdmin:', isAdmin);
    
    // Find the corresponding value for this label
    const statusItem = statuses.find(s => s.label === label);
    const statusValue = statusItem ? statusItem.value : label;
    
    console.log('DashboardContent: Using value for navigation:', statusValue);
    
    // Navigate to appropriate page based on user role
    if (isAdmin) {
      console.log('DashboardContent: Navigating to admin asset management:', `/admin/asset-management?status=${encodeURIComponent(statusValue)}`);
      router.push(`/admin/asset-management?status=${encodeURIComponent(statusValue)}`);
    } else {
      console.log('DashboardContent: Navigating to user asset browser:', `/user/asset-browser?status=${encodeURIComponent(statusValue)}`);
      router.push(`/user/asset-browser?status=${encodeURIComponent(statusValue)}`);
    }
  };

  if (loading) {
    return <div className={styles.dashboardContent}><div style={{ textAlign: 'center', padding: '50px' }}>Loading dashboard data...</div></div>;
  }
  if (error) {
    return <div className={styles.dashboardContent}><div style={{ textAlign: 'center', padding: '50px', color: 'red' }}>Error: {error}</div></div>;
  }

  // ฟังก์ชันเลือกสี border
  const getCardColor = (idx: number) => CARD_COLORS[idx % CARD_COLORS.length];

  // จำกัดให้แสดงแค่ 7 card แรก (แต่ scroll ดูที่เหลือได้)
  const VISIBLE_CARDS = 7;

  return (
    <div className={styles.dashboardContent}>
      {isMobile ? (
        <>
          {/* Header above cardList, not scrollable */}
          <div style={{ marginBottom: 8, marginTop: 2 }}>
            <div style={{ fontWeight: 700, fontSize: 18, color: '#222' }}>ครุภัณฑ์ทั้งหมด</div>
            <div style={{ fontWeight: 400, fontSize: 14, color: '#555', marginTop: 2 }}>
              รวม {totalCount} รายการ
            </div>
          </div>
          {/* Mobile Card List for Sidebar Cards (scrollable) */}
          <div className={styles.cardList}>
            {allCards.map((card, idx) => (
              <div
                className={styles.card}
                key={card.status}
                onClick={() => handleStatusCardClick(card.label)}
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  border: 'none',
                  borderRadius: 12,
                  padding: '16px 20px',
                  background: '#fff',
                  marginBottom: 0.8,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  justifyContent: 'flex-start',
                  minHeight: 70,
                  fontSize: 14,
                  width: '100%',
                  boxSizing: 'border-box',
                  transition: 'box-shadow 0.2s, transform 0.1s',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.08)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  height: '100%',
                  width: 6,
                  borderRadius: 10,
                  background: getCardColor(idx),
                }} />
                <div style={{ 
                  fontSize: 14, 
                  color: '#444', 
                  fontWeight: 500, 
                  marginLeft: 12,
                  lineHeight: '1.2',
                  textAlign: 'left',
                  width: '100%'
                }}>
                  {card.label}
                </div>
                <div style={{ 
                  fontSize: 18, 
                  fontWeight: 700, 
                  color: '#222', 
                  marginTop: 4, 
                  marginLeft: 12,
                  lineHeight: '1.1',
                  textAlign: 'left',
                  width: '100%'
                }}>
                  {card.count}
                </div>
              </div>
            ))}
          </div>
          {/* Main Content as Cards/Charts */}
          <div className={styles.mainContent}>
            {user?.originalRole?.toLowerCase() === 'superadmin' && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <select
                  className={styles.mobileDropdown}
                  value={selectedDepartment}
                  onChange={e => setSelectedDepartment(e.target.value)}
                >
                  <option value="All Departments">All Departments</option>
                  {sortedDepartments.map(dep => (
                    <option key={dep.id} value={dep.name_th}>{dep.name_th}</option>
                  ))}
                </select>
              </div>
            )}
            <div className={styles.chartContainer}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                marginBottom: 8,
                alignItems: 'center'
              }}>
                <span style={{ 
                  fontWeight: 600, 
                  fontSize: isMobile ? 14 : 15 
                }}>จำนวนครุภัณฑ์แต่ละสถานะ</span>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  gap: isMobile ? 4 : 8
                }}>
                  <span style={{ 
                    fontSize: isMobile ? 12 : 14, 
                    color: '#888'
                  }}>ข้อมูล ณ ปัจจุบัน</span>
                  <span style={{ 
                    fontSize: isMobile ? 12 : 14, 
                    color: '#888',
                    marginRight: 10
                  }}>{getThaiDateString()}</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={statusChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" interval={0} angle={-30} textAnchor="end" height={60} fontSize={11} />
                  <YAxis allowDecimals={false} fontSize={11} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={3} dot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className={styles.chartContainer}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                marginBottom: 8,
                alignItems: 'center'
              }}>
                <span style={{ 
                  fontWeight: 600, 
                  fontSize: isMobile ? 14 : 15 
                }}>จำนวนครุภัณฑ์แต่ละสถานะ</span>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  gap: isMobile ? 4 : 8
                }}>
                  <span style={{ 
                    fontSize: isMobile ? 12 : 14, 
                    color: '#888'
                  }}>ข้อมูล ณ ปัจจุบัน</span>
                  <span style={{ 
                    fontSize: isMobile ? 12 : 14, 
                    color: '#888',
                    marginRight: 10
                  }}>{getThaiDateString()}</span>
                </div>
              </div>
              <div style={{ marginBottom: 10, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {allCards.map((c, idx) => (
                  <label key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 13 }}>
                    <input
                      type="checkbox"
                      checked={visibleBarStatuses[c.label]}
                      onChange={() => setVisibleBarStatuses({ ...visibleBarStatuses, [c.label]: !visibleBarStatuses[c.label] })}
                    />
                    <span style={{ color: CARD_COLORS[idx % CARD_COLORS.length], fontWeight: 500 }}>{c.label}</span>
                  </label>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={filteredBarChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" interval={0} angle={-30} textAnchor="end" height={60} fontSize={11} />
                  <YAxis allowDecimals={false} fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="count" barSize={22}>
                    {filteredBarChartData.map((entry) => (
                      <Cell key={entry.status} fill={statusColorMap[entry.status]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Desktop Sidebar Cards */}
          <div className={styles.sidebarCards} style={{
        flex: '0 0 340px',
                        marginTop: user?.originalRole?.toLowerCase() === 'superadmin' ? 60 : 0,
            maxHeight: `${VISIBLE_CARDS * 100 + 40}px`,
            overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
            gap: 20,
        background: '#ffffff',
        borderRadius: 20,
            padding: 20,
        boxShadow: '0 2px 8px #0001',
        minHeight: '84vh'
      }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 20, color: '#222' }}>ครุภัณฑ์ทั้งหมด</div>
          <div style={{ fontWeight: 400, fontSize: 15, color: '#555', marginTop: 2 }}>
            รวม {totalCount} รายการ
          </div>
        </div>
        {allCards.map((card, idx) => (
          <div
            key={card.status}
            style={{
              border: 'none',
                  borderRadius: 10,
                  padding: '18px 20px',
              background: '#fff',
              marginBottom: 0,
              boxShadow: '0 1px 4px #0001',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
                  minHeight: 80,
              fontSize: 15,
              width: '100%',
              boxSizing: 'border-box',
              transition: 'box-shadow 0.2s, transform 0.1s',
              position: 'relative',
                  overflow: 'hidden',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px #0002';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = '0 1px 4px #0001';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            onClick={() => handleStatusCardClick(card.label)}
          >
            <div style={{
              position: 'absolute',
              left: 0,
              top: 0,
              height: '100%',
              width: 8,
                  borderRadius: 10,
              background: getCardColor(idx),
            }} />
            <div style={{ fontSize: 15, color: '#444', fontWeight: 500, marginLeft: 16 }}>{card.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#222', marginTop: 2, marginLeft: 16 }}>{card.count}</div>
          </div>
        ))}
      </div>
      {/* Main Content */}
          <div className={styles.mainContent} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {user?.originalRole?.toLowerCase() === 'superadmin' && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12 }}>
            <div style={{ position: 'relative', display: 'inline-block', maxWidth: 180 }}>
              <select
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: 15, maxWidth: '180px', appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', paddingRight: '2.2em' }}
                value={selectedDepartment}
                onChange={e => setSelectedDepartment(e.target.value)}
              >
                <option value="All Departments">All Departments</option>
                {sortedDepartments.map(dep => (
                  <option key={dep.id} value={dep.name_th}>{dep.name_th}</option>
                ))}
              </select>
              <span className={styles.caretIcon} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><AiOutlineDown /></span>
            </div>
          </div>
        )}
            <div className={styles.chartContainer} style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px #0001', minHeight: 320 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-start', marginBottom: 8 }}>
            <span style={{ fontWeight: 600, fontSize: 17 }}>จำนวนครุภัณฑ์แต่ละสถานะ</span>
            <span style={{ fontSize: 14, color: '#888', marginLeft: 8 }}>ข้อมูล ณ ปัจจุบัน</span>
            <span style={{ fontSize: 14, color: '#888', marginLeft: 4}}>{getThaiDateString()}</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={statusChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" interval={0} angle={-30} textAnchor="end" height={80} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={3} dot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
            <div className={styles.chartContainer} style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px #0001', minHeight: 320 }}>
          
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-start', marginBottom: 8 }}>
            <span style={{ fontWeight: 600, fontSize: 17 }}>จำนวนครุภัณฑ์แต่ละสถานะ</span>
            <span style={{ fontSize: 14, color: '#888', marginLeft: 8 }}>ข้อมูล ณ ปัจจุบัน</span>
            <span style={{ fontSize: 14, color: '#888', marginLeft: 4}}>{getThaiDateString()}</span>
          </div>
          <div style={{ marginBottom: 12, display: 'flex', gap: 18, flexWrap: 'wrap' }}>
            {allCards.map((c, idx) => (
              <label key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 15 }}>
                <input
                  type="checkbox"
                  checked={visibleBarStatuses[c.label]}
                  onChange={() => setVisibleBarStatuses({ ...visibleBarStatuses, [c.label]: !visibleBarStatuses[c.label] })}
                />
                <span style={{ color: CARD_COLORS[idx % CARD_COLORS.length], fontWeight: 500 }}>{c.label}</span>
              </label>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={filteredBarChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" interval={0} angle={-30} textAnchor="end" height={80} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" barSize={32}>
                {filteredBarChartData.map((entry) => (
                  <Cell key={entry.status} fill={statusColorMap[entry.status]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
        </>
      )}
    </div>
  );
};

export default DashboardContent;