import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import Navbar from '../components/Navbar';
import RiskCards from '../components/RiskCards';
import RiskChart from '../components/RiskChart';
import FraudGraph from '../components/FraudGraph';
import VendorTable from '../components/VendorTable';
import VendorModal from '../components/VendorModal';

interface RiskSummary {
  highRisk?: number;
  high_risk?: number;
  mediumRisk?: number;
  medium_risk?: number;
  lowRisk?: number;
  low_risk?: number;
}

interface ITCLeakage {
  leakage?: number;
  itc_leakage?: number;
}

interface Vendor {
  vendor_name?: string;
  name?: string;
  risk_score?: number;
  score?: number;
  risk_level?: string;
}

interface GraphNode {
  id: string;
  name: string;
  type: string;
  val?: number;
}

interface GraphLink {
  source: string;
  target: string;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export default function Dashboard() {
  const [riskSummary, setRiskSummary] = useState<RiskSummary | null>(null);
  const [itcLeakage, setItcLeakage] = useState<ITCLeakage | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);
  const [loading, setLoading] = useState({
    risk: true,
    itc: true,
    vendors: true,
    graph: true,
  });
  const [socket, setSocket] = useState<Socket | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');

  // ⚡ Initialize WebSocket connection
  useEffect(() => {
    const newSocket = io('http://localhost:5000', {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    newSocket.on('connect', () => {
      console.log('✅ Connected to WebSocket server');
    });

    // 🔄 Listen for live dashboard updates
    newSocket.on('dashboardUpdate', (data: any) => {
      console.log('📡 Received live update:', data);
      setRiskSummary(data.riskSummary);
      setItcLeakage({ leakage: data.leakage });
      setVendors(data.vendors);
      setGraphData({
        nodes: data.vendors.map((v: any) => ({ id: v.name, name: v.name, type: 'Taxpayer' })),
        links: []
      });
      setLastUpdate(new Date(data.timestamp).toLocaleTimeString());
      setLoading({
        risk: false,
        itc: false,
        vendors: false,
        graph: false
      });
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Disconnected from WebSocket server');
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Fallback: Fetch initial data via REST API
  useEffect(() => {
    if (!socket?.connected) {
      fetchInitialData();
    }
  }, [socket]);

  const fetchInitialData = async () => {
    fetchRiskSummary();
    fetchITCLeakage();
    fetchVendors();
    fetchGraphData();
  };

  const fetchRiskSummary = async () => {
    try {
      const response = await fetch('/api/risk-summary');
      if (response.ok) {
        const data = await response.json();
        setRiskSummary(data);
      } else {
        console.error('Failed to fetch risk summary:', response.status);
      }
    } catch (error) {
      console.error('Error fetching risk summary:', error);
    } finally {
      setLoading((prev) => ({ ...prev, risk: false }));
    }
  };

  const fetchITCLeakage = async () => {
    try {
      const response = await fetch('/api/itc-leakage');
      if (response.ok) {
        const data = await response.json();
        setItcLeakage(data);
      } else {
        console.error('Failed to fetch ITC leakage:', response.status);
      }
    } catch (error) {
      console.error('Error fetching ITC leakage:', error);
    } finally {
      setLoading((prev) => ({ ...prev, itc: false }));
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await fetch('/api/top-vendors');
      if (response.ok) {
        const data = await response.json();
        console.log('Vendors data:', data);
        setVendors(Array.isArray(data) ? data : []);
      } else {
        console.error('Failed to fetch vendors:', response.status);
        setVendors([]);
      }
    } catch (error) {
      console.error('Error fetching vendors:', error);
      setVendors([]);
    } finally {
      setLoading((prev) => ({ ...prev, vendors: false }));
    }
  };

  const fetchGraphData = async () => {
    try {
      const response = await fetch('/api/fraud-graph');
      if (response.ok) {
        const data = await response.json();
        console.log('Graph data received:', {
          nodes: data.nodes?.length || 0,
          links: data.links?.length || 0,
          data
        });
        setGraphData(data);
      } else {
        console.error('Failed to fetch graph data:', response.status);
      }
    } catch (error) {
      console.error('Error fetching graph data:', error);
    } finally {
      setLoading((prev) => ({ ...prev, graph: false }));
    }
  };

  const combinedRiskData = riskSummary && itcLeakage
    ? { ...riskSummary, ...itcLeakage }
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <Navbar />

      <div className="container mx-auto px-6 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white">Risk Intelligence Dashboard</h1>
            <p className="text-slate-400 mt-1">Real-time GST compliance monitoring and fraud detection</p>
            {lastUpdate && (
              <p className="text-sm text-emerald-400 mt-2">
                🔄 Last update: {lastUpdate}
              </p>
            )}
          </div>
          {selectedVendor && (
            <button
              onClick={() => setSelectedVendor(null)}
              className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition"
            >
              ← Back
            </button>
          )}
        </div>

        <RiskCards data={combinedRiskData} loading={loading.risk || loading.itc} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <RiskChart data={riskSummary} loading={loading.risk} />
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700 p-6">
            <h3 className="text-lg font-bold text-slate-100 mb-4">System Status</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-xl">
                <span className="text-sm text-slate-300">Data Processing</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                  <span className="text-sm font-semibold text-green-400">Active</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-xl">
                <span className="text-sm text-slate-300">AI Analysis Engine</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                  <span className="text-sm font-semibold text-green-400">Running</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-xl">
                <span className="text-sm text-slate-300">Knowledge Graph</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                  <span className="text-sm font-semibold text-green-400">Synced</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-xl">
                <span className="text-sm text-slate-300">Total Entities Analyzed</span>
                <span className="text-sm font-bold text-cyan-400">
                  {graphData ? graphData.nodes.length : 0}
                </span>
              </div>
            </div>
          </div>
        </div>

        <FraudGraph data={graphData} loading={loading.graph} />

        <VendorTable
          data={vendors}
          loading={loading.vendors}
          onVendorClick={setSelectedVendor}
        />
      </div>

      <VendorModal
        vendorName={selectedVendor}
        onClose={() => setSelectedVendor(null)}
      />
    </div>
  );
}
