// src/components/DashboardContent/index.tsx
import React from 'react';
import DashboardCards from './DashboardCards';
import DashboardChart from './DashboardChart';
import styles from './DashboardContent.module.css';

// *** เพิ่ม import สำหรับ ApexCharts.ApexOptions ที่นี่ ***
import type { ApexOptions } from 'apexcharts'; // ใช้ 'type' เพื่อให้ import เฉพาะ type ไม่ได้เอาโค้ดมาด้วย

const DashboardContent: React.FC = () => {
  // Mock data for dashboard cards - Updated with English titles
  const cardData = [
    { title: 'Total Assets', value: 25, color: '#4f46e5', icon: 'X' }, // Blue
    { title: 'Active Assets', value: 25, color: '#22c55e', icon: 'X' }, // Green
    { title: 'Broken Assets', value: 25, color: '#f97316', icon: 'X' }, // Orange
    { title: 'Missing Assets', value: 25, color: '#ef4444', icon: 'X' }, // Red
  ];

  // Mock data for the chart (Selling Reports)
  const chartOptions: ApexOptions = { // *** เพิ่มการกำหนด Type ApexOptions ตรงนี้ ***
    chart: {
      height: 350,
      type: 'line', // TypeScript จะรู้ว่า 'line' เป็นค่าที่ถูกต้องสำหรับ ApexOptions.chart.type
      toolbar: {
        show: false
      }
    },
    stroke: {
      curve: 'smooth',
      width: 3,
      colors: ['#4f46e5']
    },
    xaxis: {
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      labels: {
        style: {
          colors: '#666',
        }
      },
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
    yaxis: {
      labels: {
        formatter: function (value: number) {
          return value.toLocaleString();
        },
        style: {
          colors: '#666',
        }
      },
      min: 12000,
      max: 20000,
      tickAmount: 4,
    },
    grid: {
      borderColor: '#f0f0f0',
      strokeDashArray: 4,
      position: 'back',
      xaxis: {
        lines: {
          show: false
        }
      },
      yaxis: {
        lines: {
          show: true
        }
      },
    },
    tooltip: {
      enabled: true,
      x: {
        show: true,
        format: 'MMM',
      },
      y: {
        formatter: function (value: number) {
          return value.toLocaleString() + ' Baht';
        },
      },
    }
  };

  const chartSeries = [{ // แยก series ออกมาต่างหาก
    name: "Selling",
    data: [12500, 14000, 17500, 13800, 19500, 16800]
  }];

  return (
    <div className={styles.dashboardContent}>
      <DashboardCards cards={cardData} />
      {/* ใช้ chartSeries และ chartOptions ที่แยกออกมา */}
      <DashboardChart series={chartSeries} options={chartOptions} />
    </div>
  );
};

export default DashboardContent;