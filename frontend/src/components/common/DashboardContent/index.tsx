// src/components/DashboardContent/index.tsx
import React, { useState, useRef, useEffect } from 'react';
import DashboardCards from './DashboardCards';
import DashboardChart from './DashboardChart';
import { useDashboard } from '../../../contexts/DashboardContext';
import { AiOutlineLeft, AiOutlineRight } from 'react-icons/ai';
import styles from './DashboardContent.module.css';
import axios from 'axios';

// *** เพิ่ม import สำหรับ ApexCharts.ApexOptions ที่นี่ ***
import type { ApexOptions } from 'apexcharts'; // ใช้ 'type' เพื่อให้ import เฉพาะ type ไม่ได้เอาโค้ดมาด้วย

const DashboardContent: React.FC = () => {
  const { stats, loading, error, fetchStatsByYear } = useDashboard();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  // เลือกปี
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  // ปีที่ให้เลือก (ย้อนหลัง 5 ปี)
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);
  const [graphData, setGraphData] = useState<any>(null);

  // Check scroll position
  const checkScrollPosition = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  // Scroll functions
  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  // Add scroll event listener
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollPosition);
      // ตรวจสอบหลังจาก DOM render แล้ว
      setTimeout(checkScrollPosition, 100);
      
      return () => {
        container.removeEventListener('scroll', checkScrollPosition);
      };
    }
  }, []);

  // Check scroll position when stats change
  useEffect(() => {
    // ตรวจสอบหลังจาก stats โหลดแล้ว
    setTimeout(checkScrollPosition, 200);
  }, [stats]);

  // โหลดข้อมูลใหม่เมื่อเปลี่ยนปี
  useEffect(() => {
    fetchStatsByYear(selectedYear);
    // eslint-disable-next-line
  }, [selectedYear]);

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

  // Show loading state
  if (loading) {
    return (
      <div className={styles.dashboardContent}>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <div>Loading dashboard data...</div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className={styles.dashboardContent}>
        <div style={{ textAlign: 'center', padding: '50px', color: 'red' }}>
          <div>Error: {error}</div>
        </div>
      </div>
    );
  }

  // Use real data from stats or fallback to default values
  const cardData = [
    { title: "Total Assets", value: stats?.totalAssets || 0, color: "#4f46e5", icon: "X" },
    { title: "Active Assets", value: stats?.activeAssets || 0, color: "#22c55e", icon: "X" },
    { title: "Broken Assets", value: stats?.brokenAssets || 0, color: "#f97316", icon: "X" },
    {
      title: "Missing Assets",
      value: stats?.missingAssets || 0,
      color: "#ef4444",
      icon: "X"
    },
    {
      title: "Transferring Assets",
      value: stats?.transferringAssets || 0,
      color: "#3b82f6",
      icon: "X"
    },
    {
      title: "Audited Assets",
      value: stats?.auditedAssets || 0,
      color: "#8b5cf6",
      icon: "X"
    },
    {
      title: "Disposed Assets",
      value: stats?.disposedAssets || 0,
      color: "#6b7280",
      icon: "X"
    },
  ];

  // Prepare chart data
  const barChartSeries = [
    {
      name: "Assets",
      data: [
        stats?.totalAssets || 0,
        stats?.activeAssets || 0,
        stats?.brokenAssets || 0,
        stats?.missingAssets || 0,
        stats?.transferringAssets || 0,
        stats?.auditedAssets || 0,
        stats?.disposedAssets || 0,
      ],
    },
  ];
  const barChartOptions: ApexOptions = {
    chart: { height: 300, type: "bar", toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 8, columnWidth: "40%", distributed: true } },
    colors: [
      "#4f46e5", "#22c55e", "#f97316", "#ef4444", "#3b82f6", "#8b5cf6", "#6b7280",
    ],
    xaxis: {
      categories: [
        "Total", "Active", "Broken", "Missing", "Transferring", "Audited", "Disposed",
      ],
      labels: {
        style: {
          colors: [
            "#4f46e5", "#22c55e", "#f97316", "#ef4444", "#3b82f6", "#8b5cf6", "#6b7280",
          ],
          fontSize: "13px",
          fontWeight: 600,
        },
      },
    },
    yaxis: { min: 0, tickAmount: 4, labels: { style: { colors: "#666", fontSize: "12px" } } },
    grid: { borderColor: "#f0f0f0", strokeDashArray: 4, position: "back" },
    tooltip: { enabled: true, y: { formatter: (value: number) => value + " Assets" } },
    legend: { show: false },
  };

  // Line/Area Chart: Trend รายเดือน
  const months = stats?.monthlyData?.map((m: any) => m.month) || [];
  const monthlyCounts = stats?.monthlyData?.map((m: any) => m.count) || [];
  const lineChartSeries = [{ name: "Acquired", data: monthlyCounts }];
  const lineChartOptions: ApexOptions = {
    chart: { type: "line", height: 300, toolbar: { show: false } },
    xaxis: { categories: months },
    stroke: { curve: "smooth", width: 3 },
    colors: ["#4f46e5"],
    markers: { size: 5, colors: ["#4f46e5"] },
    yaxis: { min: 0, tickAmount: 4, labels: { style: { colors: "#666", fontSize: "12px" } } },
    grid: { borderColor: "#f0f0f0", strokeDashArray: 4, position: "back" },
    tooltip: { enabled: true },
    legend: { show: false },
  };
  const areaChartSeries = lineChartSeries;
  const areaChartOptions: ApexOptions = {
    ...lineChartOptions,
    chart: { ...lineChartOptions.chart, type: "area" },
    fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.1 } },
  };

  // Pie/Donut Chart: Distribution by status
  const pieChartSeries = [
    stats?.activeAssets || 0,
    stats?.brokenAssets || 0,
    stats?.missingAssets || 0,
    stats?.transferringAssets || 0,
    stats?.auditedAssets || 0,
    stats?.disposedAssets || 0,
  ];
  const pieLabels = [
    "Active", "Broken", "Missing", "Transferring", "Audited", "Disposed"
  ];
  const pieColors = [
    "#22c55e", "#f97316", "#ef4444", "#3b82f6", "#8b5cf6", "#6b7280"
  ];
  const pieChartOptions: ApexOptions = {
    labels: pieLabels,
    colors: pieColors,
    legend: { position: "bottom" },
    dataLabels: { enabled: true },
    tooltip: { enabled: true },
    chart: { type: "pie" },
  };
  const donutChartSeries = pieChartSeries;
  const donutChartOptions: ApexOptions = {
    ...pieChartOptions,
    chart: { type: "donut" },
    plotOptions: { pie: { donut: { size: "65%" } } },
  };

  // ปรับความสูง chart ให้เหมาะสม (ขนาดเล็กลง)
  const chartHeight = 180;

  const barChartOptionsFinal: ApexOptions = {
    ...barChartOptions,
    chart: { ...barChartOptions.chart, height: chartHeight },
  };
  const lineChartOptionsFinal: ApexOptions = {
    ...lineChartOptions,
    chart: { ...lineChartOptions.chart, height: chartHeight },
  };
  const areaChartOptionsFinal: ApexOptions = {
    ...areaChartOptions,
    chart: { ...areaChartOptions.chart, height: chartHeight },
  };
  const pieChartOptionsFinal: ApexOptions = {
    ...pieChartOptions,
    chart: { ...pieChartOptions.chart, height: chartHeight },
  };
  const donutChartOptionsFinal: ApexOptions = {
    ...donutChartOptions,
    chart: { ...donutChartOptions.chart, height: chartHeight },
  };

  return (
    <div className={styles.dashboardContent}>
      {/* Asset Statistics Section (เดิม) */}
      <div className={styles.cardsSection}>
        <div className={styles.cardsHeader}>
          <h3>Asset Statistics</h3>
          <div className={styles.scrollControls}>
            <button onClick={scrollLeft} disabled={!canScrollLeft} className={`${styles.scrollButton} ${!canScrollLeft ? styles.disabled : ''}`} aria-label="Scroll left"><AiOutlineLeft /></button>
            <button onClick={scrollRight} disabled={!canScrollRight} className={`${styles.scrollButton} ${!canScrollRight ? styles.disabled : ''}`} aria-label="Scroll right"><AiOutlineRight /></button>
          </div>
        </div>
        <div className={styles.cardsWrapper}>
          <DashboardCards cards={cardData} ref={scrollContainerRef} />
        </div>
      </div>
      {/* กราฟ 3 แบบ (Line, Bar, Donut) */}
      {graphData && (
        <div className={styles.graphsGrid2col}>
          <div className={styles.graphsColLeft}>
            <DashboardChart
              series={[{ name: 'Acquired', data: graphData.line.data }]}
              options={{
                chart: { type: 'area', height: 220, toolbar: { show: false }, background: 'transparent' },
                xaxis: { categories: graphData.line.labels, labels: { style: { colors: '#a3a3a3', fontSize: '13px' } } },
                stroke: { curve: 'smooth', width: 3 },
                fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.3, opacityTo: 0.05, stops: [0, 100] } },
                colors: ['#7c3aed'],
                markers: { size: 6, colors: ['#fff'], strokeColors: ['#7c3aed'], strokeWidth: 3 },
                grid: { borderColor: '#f3f4f6', strokeDashArray: 4 },
                tooltip: { enabled: true, style: { fontSize: '15px' } },
                legend: { show: false },
              }}
              type="area"
              title="Total balance overview"
              className={styles.graphCard}
            />
            <DashboardChart
              series={graphData.bar.series}
              options={{
                chart: { type: 'bar', height: 220, background: 'transparent', toolbar: { show: false } },
                plotOptions: { bar: { borderRadius: 8, columnWidth: '40%' } },
                colors: ['#7c3aed', '#38bdf8', '#a5b4fc', '#f3f4f6', '#6366f1', '#818cf8'],
                xaxis: { categories: graphData.bar.labels, labels: { style: { colors: '#a3a3a3', fontSize: '13px' } } },
                yaxis: { min: 0, labels: { style: { colors: '#a3a3a3', fontSize: '12px' } } },
                grid: { borderColor: '#f3f4f6', strokeDashArray: 4 },
                legend: { show: true, position: 'top', labels: { colors: '#7c3aed' } },
                tooltip: { enabled: true },
              }}
              type="bar"
              title="Comparing of status by month"
              className={styles.graphCard}
            />
          </div>
          <div className={styles.graphsColRight}>
            <DashboardChart
              series={graphData.donut.data}
              options={{
                chart: { type: 'donut', background: 'transparent' },
                labels: graphData.donut.labels,
                colors: ['#7c3aed', '#38bdf8', '#a5b4fc', '#f3f4f6', '#6366f1', '#818cf8'],
                legend: { show: true, position: 'bottom', labels: { colors: '#6b7280', useSeriesColors: false } },
                dataLabels: { enabled: true, style: { fontSize: '16px', fontWeight: 'bold' } },
                tooltip: { enabled: true },
                plotOptions: { pie: { donut: { size: '70%', labels: { show: true, name: { show: true }, value: { show: true }, total: { show: true, label: 'Total', formatter: () => graphData.donut.data.reduce((a: number, b: number) => a + b, 0) } } } } },
              }}
              type="donut"
              title="Statistics"
              className={styles.graphCard}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardContent;