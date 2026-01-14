// frontend/src/components/ProgressChart.tsx
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export const ProgressChart = ({ data }: { data: any }) => {
  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'top' as const },
      title: { display: true, text: 'Tren Orientasi Karir Siswa (Longitudinal)' },
    },
    scales: {
      y: { min: 0, max: 1 } // MOORA score biasanya dalam range ini setelah normalisasi
    }
  };

  const chartData = {
    labels: data.labels,
    datasets: data.datasets.map((ds: any) => ({
      ...ds,
      borderColor: ds.color,
      backgroundColor: ds.color,
      tension: 0.3,
    })),
  };

  return <Line options={options} data={chartData} />;
};