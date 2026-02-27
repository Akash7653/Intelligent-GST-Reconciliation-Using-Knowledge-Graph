import { useEffect, useState } from 'react';
import { AlertTriangle, AlertCircle, CheckCircle, TrendingDown } from 'lucide-react';

interface RiskData {
  high_risk?: number;
  highRisk?: number;
  medium_risk?: number;
  mediumRisk?: number;
  low_risk?: number;
  lowRisk?: number;
  itc_leakage?: number;
  leakage?: number;
}

interface Props {
  data: RiskData | null;
  loading: boolean;
}

function CountUp({ end, duration = 2000 }: { end: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);

      setCount(Math.floor(progress * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);

  return <span>{count}</span>;
}

export default function RiskCards({ data, loading }: Props) {
  // Helper function to extract numeric values from Neo4j integers
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
    itc_leakage: extractNumber(data?.itc_leakage ?? data?.leakage),
  };

  const cards = [
    {
      title: 'High Risk',
      value: normalizedData.high_risk,
      icon: AlertTriangle,
      gradient: 'from-red-500 to-rose-600',
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      text: 'text-red-400',
      shadow: 'shadow-red-500/20',
    },
    {
      title: 'Medium Risk',
      value: normalizedData.medium_risk,
      icon: AlertCircle,
      gradient: 'from-yellow-500 to-orange-500',
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/30',
      text: 'text-yellow-400',
      shadow: 'shadow-yellow-500/20',
    },
    {
      title: 'Low Risk',
      value: normalizedData.low_risk,
      icon: CheckCircle,
      gradient: 'from-green-500 to-emerald-500',
      bg: 'bg-green-500/10',
      border: 'border-green-500/30',
      text: 'text-green-400',
      shadow: 'shadow-green-500/20',
    },
    {
      title: 'ITC Leakage',
      value: normalizedData.itc_leakage,
      icon: TrendingDown,
      gradient: 'from-blue-500 to-cyan-500',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
      text: 'text-blue-400',
      shadow: 'shadow-blue-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => {
        // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
        return (
        <div
          key={card.title}
          className={`relative overflow-hidden rounded-2xl ${card.bg} ${card.border} border backdrop-blur-sm
            transition-all duration-300 hover:scale-105 hover:shadow-2xl ${card.shadow}
            animate-fadeInUp`}
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl bg-gradient-to-br ${card.gradient} shadow-lg`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
              <div className={`text-xs font-semibold px-3 py-1 rounded-full ${card.bg} ${card.text} border ${card.border}`}>
                Active
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-400">{card.title}</p>
              {loading ? (
                <div className="h-10 w-24 bg-slate-700/50 rounded animate-pulse"></div>
              ) : (
                <p className={`text-4xl font-bold ${card.text}`}>
                  <CountUp end={card.value} />
                </p>
              )}
            </div>
          </div>

          <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${card.gradient} opacity-10 rounded-full -mr-16 -mt-16`}></div>
        </div>
      );})}
    </div>
  );
}
