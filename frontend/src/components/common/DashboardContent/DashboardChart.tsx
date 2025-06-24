// src/components/DashboardContent/DashboardChart.tsx
import React from 'react';
import dynamic from 'next/dynamic';

// Dynamic import for ApexCharts to ensure it's client-side rendered
// This is crucial for libraries that rely on browser APIs
const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface DashboardChartProps {
  series: ApexAxisChartSeries | ApexNonAxisChartSeries;
  options: ApexCharts.ApexOptions;
  type: "bar" | "line" | "area" | "pie" | "donut";
  title?: string;
  className?: string;
}

const DashboardChart: React.FC<DashboardChartProps> = ({
  series,
  options,
  type,
  title,
  className = "",
}) => (
  <div className={`bg-white rounded-xl shadow p-6 w-full max-w-full ${className}`}>
    {title && <h3 className="text-xl font-bold mb-4 text-gray-800">{title}</h3>}
    <Chart options={options} series={series} type={type} height={350} />
  </div>
);

export default DashboardChart;