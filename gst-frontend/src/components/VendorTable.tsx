import { useState } from 'react';
import { Users, ArrowUpDown, TrendingUp } from 'lucide-react';

interface Vendor {
  name?: string;
  vendor_name?: string;
  risk_score?: number;
  score?: number;
  risk_level?: string;
}

interface Props {
  data: Vendor[];
  loading: boolean;
  onVendorClick: (vendorName: string) => void;
}

export default function VendorTable({ data, loading, onVendorClick }: Props) {
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Normalize vendor data to handle both API formats
  const normalizedData = (data || [])
    .filter(vendor => vendor) // Remove null/undefined entries
    .map(vendor => {
      const score = vendor.risk_score ?? vendor.score ?? 0;
      return {
        vendor_name: vendor.vendor_name || vendor.name || 'Unknown',
        risk_score: score,
        risk_level: vendor.risk_level || (score >= 70 ? 'High' : score >= 40 ? 'Medium' : 'Low'),
      };
    });

  const sortedData = [...normalizedData].sort((a, b) => {
    return sortOrder === 'desc' ? b.risk_score - a.risk_score : a.risk_score - b.risk_score;
  });

  const getRiskBadge = (level: string | undefined) => {
    if (!level) return null;
    
    const configs = {
      high: {
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
        text: 'text-red-400',
      },
      medium: {
        bg: 'bg-yellow-500/10',
        border: 'border-yellow-500/30',
        text: 'text-yellow-400',
      },
      low: {
        bg: 'bg-green-500/10',
        border: 'border-green-500/30',
        text: 'text-green-400',
      },
    };

    const normalizedLevel = level.toLowerCase();
    const config = configs[normalizedLevel as keyof typeof configs] || configs.low;
    const displayLevel = level.charAt(0).toUpperCase() + level.slice(1);

    return (
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.border} ${config.text} border`}
      >
        {displayLevel}
      </span>
    );
  };

  const getRiskScoreColor = (score: number) => {
    if (score >= 70) return 'text-red-400';
    if (score >= 40) return 'text-yellow-400';
    return 'text-green-400';
  };

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700 p-6 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-br from-cyan-500 to-blue-500 p-2.5 rounded-xl shadow-lg">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100">High-Risk Vendors</h2>
            <p className="text-sm text-slate-400 mt-1">Click any row for detailed audit</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 bg-slate-700/50 px-4 py-2 rounded-lg">
          <TrendingUp className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-semibold text-slate-300">
            {(data && data.length) || 0} Vendors
          </span>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-700/30 rounded-lg animate-pulse"></div>
          ))}
        </div>
      ) : sortedData && sortedData.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left py-4 px-4 text-sm font-semibold text-slate-300">
                  Vendor Name
                </th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-slate-300">
                  <button
                    onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                    className="flex items-center space-x-2 hover:text-cyan-400 transition-colors"
                  >
                    <span>Risk Score</span>
                    <ArrowUpDown className="w-4 h-4" />
                  </button>
                </th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-slate-300">
                  Risk Level
                </th>
                <th className="text-right py-4 px-4 text-sm font-semibold text-slate-300">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((vendor, index) => (
                <tr
                  key={index}
                  onClick={() => onVendorClick(vendor.vendor_name || '')}
                  className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-all duration-200 cursor-pointer group"
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-white font-bold shadow-lg group-hover:from-cyan-500 group-hover:to-blue-500 transition-all duration-300">
                        {(vendor.vendor_name || '?').charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-slate-200 group-hover:text-cyan-400 transition-colors">
                        {vendor.vendor_name || 'Unknown Vendor'}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-slate-700 rounded-full h-2 max-w-[100px] overflow-hidden">
                        {/* eslint-disable-next-line */}
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            vendor.risk_score >= 70
                              ? 'bg-gradient-to-r from-red-500 to-rose-600'
                              : vendor.risk_score >= 40
                              ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                              : 'bg-gradient-to-r from-green-500 to-emerald-500'
                          }`}
                          style={{ width: `${vendor.risk_score}%` }}
                        ></div>
                      </div>
                      <span className={`text-sm font-bold ${getRiskScoreColor(vendor.risk_score)}`}>
                        {vendor.risk_score}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4">{getRiskBadge(vendor.risk_level)}</td>
                  <td className="py-4 px-4 text-right">
                    <button className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors px-4 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20">
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12">
          <Users className="w-12 h-12 text-slate-600 mb-4" />
          <p className="text-slate-400 text-center">No vendor data available. Ensure the database is connected and populated.</p>
        </div>
      )}
    </div>
  );
}
