import { useEffect, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { Network, Maximize2, AlertTriangle } from 'lucide-react';

interface GraphNode {
  id?: string;
  name?: string;
  riskLevel?: string;
  type?: string;
  val?: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  leakageAmount?: number;
  inFraudRing?: boolean;
}

interface GraphLink {
  source?: string | GraphNode;
  target?: string | GraphNode;
  label?: string;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

interface FraudRingData {
  totalRings: number;
  rings: Array<{ vendorA: string; vendorB: string; transactionCount: number }>;
}

interface Props {
  data: GraphData | null;
  loading: boolean;
}

export default function FraudGraph({ data, loading }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 1000, height: 500 });
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    node: GraphNode;
  } | null>(null);
  const [fraudRings, setFraudRings] = useState<Set<string>>(new Set());
  const [totalRings, setTotalRings] = useState(0);

  // Fetch fraud rings to highlight ring participants
  useEffect(() => {
    const fetchFraudRings = async () => {
      try {
        const response = await fetch('/api/fraud-rings');
        if (response.ok) {
          const ringData: FraudRingData = await response.json();
          setTotalRings(ringData.totalRings);
          const ringParticipants = new Set<string>();
          ringData.rings.forEach(ring => {
            ringParticipants.add(ring.vendorA);
            ringParticipants.add(ring.vendorB);
          });
          setFraudRings(ringParticipants);
          console.log('Fraud rings:', ringData, 'Participants:', ringParticipants);
        }
      } catch (err) {
        console.log('Could not fetch fraud rings');
      }
    };

    fetchFraudRings();
  }, []);

  // Risk color mapping
  const getRiskColor = (riskLevel?: string, type?: string): string => {
    if (type?.toLowerCase() === 'invoice') return '#3b82f6'; // Blue
    const risk = riskLevel?.toUpperCase();
    switch (risk) {
      case 'HIGH':
        return '#ef4444'; // Red - High Risk
      case 'MEDIUM':
        return '#f97316'; // Orange - Medium Risk
      case 'LOW':
        return '#22c55e'; // Green - Low Risk
      default:
        return '#6b7280'; // Gray - Unknown
    }
  };

  // Node sizing - larger if in fraud ring
  const getNodeSize = (node: GraphNode): number => {
    if (node.type?.toLowerCase() === 'invoice') return 6;
    return node.inFraudRing ? 14 : 12;
  };

  // Clean and validate graph data
  const prepareGraphData = (rawData: any): GraphData => {
    if (!rawData || !Array.isArray(rawData.nodes) || !Array.isArray(rawData.links)) {
      return { nodes: [], links: [] };
    }

    const nodeMap = new Map<string, GraphNode>();
    rawData.nodes.forEach((node: any) => {
      if (node?.id) {
        const id = String(node.id);
        if (!nodeMap.has(id)) {
          const nodeName = String(node.name || node.id || 'Unknown');
          const graphNode: GraphNode = {
            id,
            name: nodeName,
            riskLevel: node.riskLevel || node.risk_level || 'LOW',
            type: node.type || 'Unknown',
            val: 8,
            inFraudRing: fraudRings.has(nodeName),
            leakageAmount: node.leakageAmount || 0,
          };
          console.log(`Graph node: ${graphNode.name}, Risk: ${graphNode.riskLevel}, In Ring: ${graphNode.inFraudRing}`);
          nodeMap.set(id, graphNode);
        }
      }
    });

    const links = rawData.links
      .filter((link: any) => {
        const source = typeof link.source === 'string' ? link.source : link.source?.id;
        const target = typeof link.target === 'string' ? link.target : link.target?.id;
        return source && target && nodeMap.has(String(source)) && nodeMap.has(String(target));
      })
      .map((link: any) => ({
        source: typeof link.source === 'string' ? link.source : link.source?.id,
        target: typeof link.target === 'string' ? link.target : link.target?.id,
        label: link.label || '',
      }));

    console.log(`Graph data: ${nodeMap.size} nodes, ${links.length} links, Fraud rings: ${totalRings}`);
    return { nodes: Array.from(nodeMap.values()), links };
  };

  const cleanedData = data ? prepareGraphData(data) : null;

  // Handle responsive resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: 500,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Configure force simulation
  useEffect(() => {
    if (!graphRef.current || !cleanedData?.nodes.length) return;

    const graph = graphRef.current;
    graph.d3Force('charge').strength(-150);
    graph.d3Force('link').distance(80).iterations(1);

    setTimeout(() => {
      graph.zoomToFit(400, 50);
    }, 300);
  }, [cleanedData]);

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700 p-6 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-br from-purple-500 to-indigo-500 p-2.5 rounded-xl shadow-lg">
            <Network className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100">Fraud Network Graph</h2>
            <p className="text-sm text-slate-400 mt-1">Transaction pattern visualization</p>
          </div>
        </div>

        {/* Legend - Hidden on mobile */}
        <div className="hidden lg:flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500 shadow-lg shadow-red-500/50"></div>
            <span className="text-xs text-slate-300 font-medium">High Risk</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-orange-500 shadow-lg shadow-orange-500/50"></div>
            <span className="text-xs text-slate-300 font-medium">Medium Risk</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-green-500 shadow-lg shadow-green-500/50"></div>
            <span className="text-xs text-slate-300 font-medium">Low Risk</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50"></div>
            <span className="text-xs text-slate-300 font-medium">Invoice</span>
          </div>
          {totalRings > 0 && (
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-3 h-3 text-red-500" />
              <span className="text-xs text-red-300 font-medium">{totalRings} Fraud Ring(s)</span>
            </div>
          )}
        </div>
      </div>

      {/* Graph Container - Responsive */}
      <div
        ref={containerRef}
        className="relative bg-gradient-to-b from-slate-900 to-slate-950 rounded-xl overflow-hidden border border-slate-700/50 shadow-inner w-full h-[500px]"
      >
        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/50 backdrop-blur-sm z-10">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500 mb-4"></div>
            <p className="text-slate-300 text-sm font-medium">Loading fraud network...</p>
          </div>
        ) : cleanedData?.nodes.length ? (
          <>
            <ForceGraph2D
              ref={graphRef}
              graphData={cleanedData}
              width={dimensions.width}
              height={dimensions.height}
              backgroundColor="#0f172a"
              nodeLabel={(node: any) => `${node.name}\nRisk: ${node.riskLevel || 'Unknown'}`}
              nodeCanvasObject={(node: any, ctx, globalScale) => {
                const size = getNodeSize(node);
                const color = getRiskColor(node.riskLevel, node.type);

                // Glow effect for fraud ring participants
                if (node.inFraudRing) {
                  ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, size * 2.5, 0, 2 * Math.PI);
                  ctx.fill();

                  // Pulsing outer ring
                  ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
                  ctx.lineWidth = 1.5 / globalScale;
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, size * 1.8, 0, 2 * Math.PI);
                  ctx.stroke();
                }

                // Main node circle
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
                ctx.fill();

                // Border / Highlight for fraud ring
                if (node.inFraudRing) {
                  ctx.strokeStyle = '#ef4444';
                  ctx.lineWidth = 2.5 / globalScale;
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
                  ctx.stroke();
                } else {
                  ctx.strokeStyle = '#fff';
                  ctx.lineWidth = 1.5 / globalScale;
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
                  ctx.stroke();
                }

                // Node label
                if (size > 8) {
                  ctx.fillStyle = 'white';
                  ctx.font = `bold ${12 / globalScale}px sans-serif`;
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  const label = node.name && node.name.length > 10 ? node.name.substring(0, 8) + '...' : node.name;
                  ctx.fillText(label || 'N', node.x, node.y);
                }
              }}
              linkCanvasObject={(link: any, ctx, globalScale) => {
                const source = link.source as any;
                const target = link.target as any;

                ctx.strokeStyle = '#ec4899';
                ctx.globalAlpha = 0.5;
                ctx.lineWidth = 1 / globalScale;

                // Add glow effect
                ctx.shadowColor = '#ec4899';
                ctx.shadowBlur = 5;

                ctx.beginPath();
                ctx.moveTo(source.x, source.y);
                ctx.lineTo(target.x, target.y);
                ctx.stroke();

                // Reset shadow
                ctx.shadowBlur = 0;
                ctx.globalAlpha = 1;
              }}
              onNodeHover={(node) => {
                if (node) {
                  setTooltip({
                    x: node.x || 0,
                    y: node.y || 0,
                    node,
                  });
                } else {
                  setTooltip(null);
                }
              }}
              onEngineStop={() => {
                if (graphRef.current && cleanedData?.nodes.length) {
                  graphRef.current.zoomToFit(400, 50);
                }
              }}
              enableZoomInteraction={true}
              enablePanInteraction={true}
            />

            {/* Tooltip */}
            {tooltip && (
              <div
                className="absolute bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-xs text-slate-200 pointer-events-none shadow-xl"
                /* eslint-disable-next-line */
                style={{ left: `${tooltip.x + 20}px`, top: `${tooltip.y - 40}px`, zIndex: 10 }}
              >
                <div className="font-semibold text-slate-100">{tooltip.node.name}</div>
                <div className="text-slate-400 mt-1">
                  Risk: <span className="text-slate-200 font-medium">{tooltip.node.riskLevel || 'N/A'}</span>
                </div>
                <div className="text-slate-400">
                  Type: <span className="text-slate-200 font-medium">{tooltip.node.type || 'Unknown'}</span>
                </div>
                {tooltip.node.inFraudRing && (
                  <div className="text-red-400 mt-2 font-semibold flex items-center">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Fraud Ring Participant
                  </div>
                )}
                {tooltip.node.leakageAmount > 0 && (
                  <div className="text-orange-400 mt-1">
                    Leakage: ₹{tooltip.node.leakageAmount.toLocaleString('en-IN')}
                  </div>
                )}
              </div>
            )}

            {/* Fullscreen Button */}
            <button
              className="absolute top-4 right-4 p-2 bg-slate-700/50 hover:bg-slate-600 rounded-lg transition-colors backdrop-blur-sm border border-slate-600/50 z-20"
              title="Fullscreen mode"
            >
              <Maximize2 className="w-4 h-4 text-slate-300" />
            </button>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Network className="w-12 h-12 text-slate-600 mb-4" />
            <p className="text-slate-400 text-sm font-medium">No fraud network data available</p>
            <p className="text-slate-500 text-xs mt-2">Ensure database is connected and populated</p>
          </div>
        )}
      </div>

      {/* Stats Footer */}
      {cleanedData?.nodes.length ? (
        <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-700">
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-100">{cleanedData.nodes.length}</p>
            <p className="text-xs text-slate-400 mt-1">Entities</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-100">{cleanedData.links.length}</p>
            <p className="text-xs text-slate-400 mt-1">Relationships</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-400">{cleanedData.nodes.filter(n => n.riskLevel === 'HIGH').length}</p>
            <p className="text-xs text-slate-400 mt-1">High Risk</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-500">{cleanedData.nodes.filter(n => n.inFraudRing).length}</p>
            <p className="text-xs text-slate-400 mt-1">Fraud Ring</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
