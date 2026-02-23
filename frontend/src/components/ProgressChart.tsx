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

interface Dataset {
  label: string;
  data: number[];
  color: string;
}

interface ProgressChartData {
  labels: string[];
  datasets: Dataset[];
}

interface Props {
  data: ProgressChartData;
}

export const ProgressChart = ({ data }: Props) => {
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
    datasets: data.datasets.map((ds) => ({
      ...ds,
      borderColor: ds.color,
      backgroundColor: ds.color,
      tension: 0.3,
    })),
  };

  return <Line options={options} data={chartData} />;
};