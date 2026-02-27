import { useEffect, useState } from 'react';
import { X, AlertTriangle, FileText, TrendingUp, DollarSign, AlertCircle, Link2 } from 'lucide-react';

interface VendorDetails {
  name?: string;
  vendor_name?: string;
  riskScore?: number;
  risk_score?: number;
  riskLevel?: string;
  risk_level?: string;
  unreportedInvoices?: number;
  unreported_invoice_count?: number;
  circularLinks?: number;
  circular_participation_count?: number;
  suspiciousAmount?: number;
  suspicious_amount?: number;
  leakageAmount?: number;
  leakage_amount?: number;
  totalGSTAmount?: number;
  total_gst_amount?: number;
  traversalPaths?: any[];
  mismatchReasons?: string[];
  auditExplanation?: string;
  explanation?: string;
}

interface FraudRingData {
  vendor: string;
  isInRing: boolean;
  ringPartners: Array<{ partner: string; partnerRisk: string; transactionCount: number }>;
}

interface MultiHopMismatch {
  buyer: string;
  supplier: string;
  invoiceNumber: string;
  gstAmount: number;
  supplierRisk: string;
}

interface Props {
  vendorName: string | null;
  onClose: () => void;
}

export default function VendorModal({ vendorName, onClose }: Props) {
  const [details, setDetails] = useState<VendorDetails | null>(null);
  const [fraudRings, setFraudRings] = useState<FraudRingData | null>(null);
  const [multiHopData, setMultiHopData] = useState<MultiHopMismatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to extract numbers from Neo4j format
  const extractNumber = (value: any): number => {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'object' && 'low' in value) return parseInt(value.low);
    if (typeof value === 'object' && 'toNumber' in value) return value.toNumber();
    return 0;
  };

  // Normalize vendor details data to handle both API formats
  const normalizeDetails = (data: any): VendorDetails => {
    return {
      name: data.name || data.vendor_name || '',
      vendor_name: data.vendor_name || data.name || '',
      riskScore: extractNumber(data.riskScore ?? data.risk_score),
      risk_score: extractNumber(data.risk_score ?? data.riskScore),
      riskLevel: (data.riskLevel || data.risk_level || 'Low').toString(),
      risk_level: (data.risk_level || data.riskLevel || 'Low').toString(),
      unreportedInvoices: extractNumber(data.unreportedInvoices ?? data.unreported_invoice_count),
      unreported_invoice_count: extractNumber(data.unreported_invoice_count ?? data.unreportedInvoices),
      circularLinks: extractNumber(data.circularLinks ?? data.circular_participation_count),
      circular_participation_count: extractNumber(data.circular_participation_count ?? data.circularLinks),
      suspiciousAmount: extractNumber(data.suspiciousAmount ?? data.suspicious_amount),
      suspicious_amount: extractNumber(data.suspicious_amount ?? data.suspiciousAmount),
      leakageAmount: extractNumber(data.leakageAmount ?? data.leakage_amount),
      leakage_amount: extractNumber(data.leakage_amount ?? data.leakageAmount),
      totalGSTAmount: extractNumber(data.totalGSTAmount ?? data.total_gst_amount),
      total_gst_amount: extractNumber(data.total_gst_amount ?? data.totalGSTAmount),
      traversalPaths: data.traversalPaths || [],
      mismatchReasons: data.mismatchReasons || [],
      auditExplanation: data.auditExplanation || data.explanation || '',
      explanation: data.explanation || data.auditExplanation || '',
    };
  };

  useEffect(() => {
    if (!vendorName) {
      setDetails(null);
      setFraudRings(null);
      setMultiHopData([]);
      return;
    }

    const fetchAllData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch vendor details
        const detailsResponse = await fetch(`/api/vendor-details/${encodeURIComponent(vendorName)}`);
       if (!detailsResponse.ok) throw new Error('Failed to fetch vendor details');
        const detailsData = await detailsResponse.json();
        console.log('Vendor details:', detailsData);
        setDetails(normalizeDetails(detailsData));

        // Fetch fraud ring information
        try {
          const ringResponse = await fetch(`/api/fraud-rings/${encodeURIComponent(vendorName)}`);
          if (ringResponse.ok) {
            const ringData = await ringResponse.json();
            console.log('Fraud ring data:', ringData);
            setFraudRings(ringData);
          }
        } catch (err) {
          console.log('Fraud ring data not available');
        }

        // Fetch multi-hop mismatch data
        try {
          const multiHopResponse = await fetch(`/api/multi-hop-mismatch/${encodeURIComponent(vendorName)}`);
          if (multiHopResponse.ok) {
            const multiHopData = await multiHopResponse.json();
            console.log('Multi-hop mismatch data:', multiHopData);
            const mismatches = multiHopData.mismatches || [];
            setMultiHopData(mismatches.map((m: any) => ({
              buyer: m.buyer || vendorName,
              supplier: m.supplier || 'Unknown',
              invoiceNumber: m.invoiceNumber || m.invoice_number || 'N/A',
              gstAmount: extractNumber(m.gstAmount ?? m.gst_amount),
              supplierRisk: m.supplierRisk || m.supplier_risk || 'UNKNOWN',
            })));
          }
        } catch (err) {
          console.log('Multi-hop mismatch data not available');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [vendorName]);

  if (!vendorName) return null;

  const getRiskColor = (level: string | undefined) => {
    if (!level) level = 'Low';
    
    const normalizedLevel = level.toLowerCase();
    
    if (normalizedLevel === 'high') {
      return {
        bg: 'bg-red-500/10',
        border: 'border-red-500',
        text: 'text-red-400',
        gradient: 'from-red-500 to-rose-600',
      };
    } else if (normalizedLevel === 'medium') {
      return {
        bg: 'bg-yellow-500/10',
        border: 'border-yellow-500',
        text: 'text-yellow-400',
        gradient: 'from-yellow-500 to-orange-500',
      };
    } else {
      return {
        bg: 'bg-green-500/10',
        border: 'border-green-500',
        text: 'text-green-400',
        gradient: 'from-green-500 to-emerald-500',
      };
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 transition-opacity bg-slate-900/80 backdrop-blur-sm"
          onClick={onClose}
        ></div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

        <div className="inline-block align-bottom bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full border border-slate-700 animate-slideInUp">
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-5 border-b border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                  {vendorName.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-100">Vendor Audit Report</h3>
                  <p className="text-sm text-slate-400 mt-1">{vendorName}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-200 transition-colors p-2 hover:bg-slate-700/50 rounded-lg"
                title="Close modal"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="px-6 py-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-cyan-500"></div>
                <p className="text-slate-400 mt-4 text-sm">Loading vendor audit data...</p>
              </div>
            ) : error ? (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            ) : details ? (
              <div className="space-y-6">
                {/* Fraud Ring Alert Banner */}
                {fraudRings?.isInRing && (
                  <div className="bg-red-500/10 border-l-4 border-red-500 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-red-300">⚠️ Circular Trading Pattern Detected</p>
                        <p className="text-sm text-red-200 mt-1">
                          This vendor is involved in {fraudRings.ringPartners.length} circular trading chain(s) with:{' '}
                          <span className="font-medium">{fraudRings.ringPartners.map(p => p.partner).join(', ')}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Risk Score Card */}
                <div className="flex items-center justify-between bg-slate-700/30 rounded-xl p-4 border border-slate-700">
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Overall Risk Score</p>
                    <p className={`text-3xl font-bold ${getRiskColor(details.risk_level).text}`}>
                      {String(details.risk_score || 0)}
                    </p>
                  </div>
                  <div className={`px-4 py-2 rounded-xl border-2 ${getRiskColor(details.risk_level).border} ${getRiskColor(details.risk_level).bg}`}>
                    <p className={`text-sm font-bold ${getRiskColor(details.risk_level).text}`}>
                      {String(details.risk_level || 'Unknown')} Risk
                    </p>
                  </div>
                </div>

                {/* Risk Score Bar */}
                <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-700">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-slate-300">Risk Score Breakdown</p>
                  </div>
                  <div className="relative w-full bg-slate-800 rounded-full h-4 overflow-hidden">
                    {/* eslint-disable-next-line */}
                    <div
                      className={`absolute top-0 left-0 h-full bg-gradient-to-r ${getRiskColor(details.risk_level).gradient} transition-all duration-1000 ease-out`}
                      style={{ width: `${Number(details.risk_score || 0)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-xl p-4">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="p-2 bg-orange-500/20 rounded-lg">
                        <FileText className="w-4 h-4 text-orange-400" />
                      </div>
                      <p className="text-xs font-medium text-slate-400">Unreported Invoices</p>
                    </div>
                    <p className="text-2xl font-bold text-orange-400">{String(details.unreported_invoice_count || 0)}</p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-xl p-4">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="p-2 bg-purple-500/20 rounded-lg">
                        <Link2 className="w-4 h-4 text-purple-400" />
                      </div>
                      <p className="text-xs font-medium text-slate-400">Circular Links</p>
                    </div>
                    <p className="text-2xl font-bold text-purple-400">{String(details.circular_participation_count || 0)}</p>
                  </div>

                  <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-xl p-4">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="p-2 bg-cyan-500/20 rounded-lg">
                        <DollarSign className="w-4 h-4 text-cyan-400" />
                      </div>
                      <p className="text-xs font-medium text-slate-400">Suspicious Amount</p>
                    </div>
                    <p className="text-2xl font-bold text-cyan-400">₹{(details.suspicious_amount || 0).toLocaleString()}</p>
                  </div>
                </div>

                {/* Risk Analysis */}
                <div className={`${getRiskColor(details.risk_level).bg} border ${getRiskColor(details.risk_level).border} rounded-xl p-5`}>
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${getRiskColor(details.risk_level).gradient}`}>
                      <AlertTriangle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-200 mb-2">Audit Explanation</h4>
                      <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{String(details.explanation || 'No analysis available')}</p>
                    </div>
                  </div>
                </div>

                {/* Multi-Hop Mismatch Table */}
                {multiHopData.length > 0 && (
                  <div className="bg-slate-700/20 border border-slate-700 rounded-xl p-5">
                    <h4 className="font-semibold text-slate-200 mb-4 flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-400" />
                      <span>Multi-Hop Invoice-to-Tax Chain Mismatches</span>
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-600">
                            <th className="text-left py-2 px-3 text-slate-400 font-medium">Supplier</th>
                            <th className="text-left py-2 px-3 text-slate-400 font-medium">Invoice</th>
                            <th className="text-right py-2 px-3 text-slate-400 font-medium">GST Amount</th>
                            <th className="text-left py-2 px-3 text-slate-400 font-medium">Supplier Risk</th>
                          </tr>
                        </thead>
                        <tbody>
                          {multiHopData.map((mismatch, idx) => (
                            <tr key={idx} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                              <td className="py-2 px-3 text-slate-200">{mismatch.supplier}</td>
                              <td className="py-2 px-3 text-slate-300">{mismatch.invoiceNumber}</td>
                              <td className="py-2 px-3 text-right text-cyan-400 font-medium">₹{(extractNumber(mismatch.gstAmount)).toLocaleString()}</td>
                              <td className="py-2 px-3">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  mismatch.supplierRisk === 'HIGH' ? 'bg-red-500/20 text-red-300' :
                                  mismatch.supplierRisk === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-300' :
                                  'bg-green-500/20 text-green-300'
                                }`}>
                                  {mismatch.supplierRisk}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <div className="bg-slate-800/50 px-6 py-4 border-t border-slate-700">
            <button
              onClick={onClose}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold py-3 px-4 rounded-xl hover:from-cyan-600 hover:to-blue-600 transition-all duration-300 shadow-lg hover:shadow-cyan-500/50"
            >
              Close Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
