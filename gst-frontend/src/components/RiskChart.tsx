import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

interface RiskData {
  high_risk?: number;
  highRisk?: number;
  medium_risk?: number;
  mediumRisk?: number;
  low_risk?: number;
  lowRisk?: number;
}

interface Props {
  data: RiskData | null;
  loading: boolean;
}

export default function RiskChart({ data, loading }: Props) {
  // Helper function to extract numeric values
  const extractNumber = (value: any): number => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'object' && 'low' in value) return value.low;
    if (typeof value === 'object' && 'toNumber' in value) return value.toNumber();
    return 0;
  };

  const normalizedData = {
    high_risk: extractNumber(data?.high_risk ?? data?.highRisk),
    medium_risk: extractNumber(data?.medium_risk ?? data?.mediumRisk),
    low_risk: extractNumber(data?.low_risk ?? data?.lowRisk),
  };

  const chartData = {
    labels: ['High Risk', 'Medium Risk', 'Low Risk'],
    datasets: [
      {
        label: 'Risk Distribution',
        data: [normalizedData.high_risk, normalizedData.medium_risk, normalizedData.low_risk],
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',
          'rgba(234, 179, 8, 0.8)',
          'rgba(34, 197, 94, 0.8)',
        ],
        borderColor: [
          'rgba(239, 68, 68, 1)',
          'rgba(234, 179, 8, 1)',
          'rgba(34, 197, 94, 1)',
        ],
        borderWidth: 2,
        hoverOffset: 15,
      },
    ],
  };

  const options: ChartOptions<'pie'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#cbd5e1',
          padding: 20,
          font: {
            size: 13,
            weight: '600',
          },
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#cbd5e1',
        bodyColor: '#e2e8f0',
        borderColor: '#475569',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        titleFont: {
          size: 14,
          weight: 'bold',
        },
        bodyFont: {
          size: 13,
        },
        callbacks: {
          label: function (context) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
    animation: {
      animateRotate: true,
      animateScale: true,
      duration: 1500,
      easing: 'easeInOutQuart',
    },
  };

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700 p-6 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Risk Distribution</h2>
          <p className="text-sm text-slate-400 mt-1">Taxpayer risk analysis breakdown</p>
        </div>
        <div className="flex items-center space-x-2 bg-slate-700/50 px-4 py-2 rounded-lg">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
          <span className="text-xs font-semibold text-slate-300">Real-time</span>
        </div>
      </div>

      {loading ? (
        <div className="h-80 flex items-center justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
        </div>
      ) : (
        <div className="h-80">
          <Pie data={chartData} options={options} />
        </div>
      )}
    </div>
  );
}
