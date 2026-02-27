import { Shield, TrendingUp } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shadow-2xl border-b border-slate-700">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-blue-500 to-cyan-400 p-2.5 rounded-xl shadow-lg shadow-blue-500/30">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
                GST Intelligence Platform
              </h1>
              <p className="text-xs text-slate-400 font-medium">AI-Powered Risk & Compliance Analysis</p>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2 bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-sm font-semibold text-slate-300">Live Monitoring</span>
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-200">Admin Dashboard</p>
                <p className="text-xs text-slate-400">Risk Analytics</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center font-bold text-white shadow-lg">
                A
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
