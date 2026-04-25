import React, { useMemo } from 'react';

export default function MapView({ incidents = [] }) {
  // Simulate some static "Bridge Nodes" (Relay points)
  const bridgeNodes = useMemo(() => [
    { id: 'BN-1', x: 25, y: 30, status: 'online' },
    { id: 'BN-2', x: 75, y: 20, status: 'online' },
    { id: 'BN-3', x: 50, y: 80, status: 'warning' },
    { id: 'BN-4', x: 85, y: 70, status: 'online' },
  ], []);

  // Map incidents to grid coordinates
  const incidentPoints = incidents.map(inc => {
    // Deterministic position based on ID for demo stability
    const charCodeSum = inc.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    return {
      ...inc,
      x: (charCodeSum % 80) + 10,
      y: ((charCodeSum * 7) % 80) + 10
    };
  });

  return (
    <div style={S.container}>
      <svg viewBox="0 0 100 100" style={S.svg}>
        {/* Grid Lines */}
        {[...Array(11)].map((_, i) => (
          <React.Fragment key={i}>
            <line x1={i * 10} y1="0" x2={i * 10} y2="100" stroke="rgba(74, 158, 255, 0.05)" strokeWidth="0.1" />
            <line x1="0" y1={i * 10} x2="100" y2={i * 10} stroke="rgba(74, 158, 255, 0.05)" strokeWidth="0.1" />
          </React.Fragment>
        ))}

        {/* Mesh Connections (The Wow Factor) */}
        {incidentPoints.map(inc => {
          // Find closest bridge node to connect to
          const closestNode = bridgeNodes.reduce((prev, curr) => {
            const dPrev = Math.hypot(inc.x - prev.x, inc.y - prev.y);
            const dCurr = Math.hypot(inc.x - curr.x, inc.y - curr.y);
            return dCurr < dPrev ? curr : prev;
          });

          return (
            <line 
              key={`line-${inc.id}`}
              x1={inc.x} y1={inc.y} 
              x2={closestNode.x} y2={closestNode.y} 
              stroke={inc.severity === 'critical' ? 'rgba(255, 61, 85, 0.3)' : 'rgba(74, 158, 255, 0.2)'}
              strokeWidth="0.4"
              strokeDasharray="1,1"
              className="mesh-line"
            />
          );
        })}

        {/* Bridge Nodes */}
        {bridgeNodes.map(node => (
          <g key={node.id}>
            <circle cx={node.x} cy={node.y} r="1.5" fill="none" stroke="#4a9eff" strokeWidth="0.2" />
            <circle cx={node.x} cy={node.y} r="0.6" fill={node.status === 'warning' ? '#ff9500' : '#4a9eff'}>
              <animate attributeName="opacity" values="1;0.3;1" dur="3s" repeatCount="indefinite" />
            </circle>
            <text x={node.x + 2} y={node.y + 1} fontSize="1.5" fill="#4a5878" style={{ fontFamily: 'monospace' }}>{node.id}</text>
          </g>
        ))}

        {/* Incident Pings */}
        {incidentPoints.map(inc => (
          <g key={inc.id}>
            <circle cx={inc.x} cy={inc.y} r="1" fill={inc.severity === 'critical' ? '#ff3d55' : '#4a9eff'}>
              <animate attributeName="r" values="1;2.5;1" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="1;0;1" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx={inc.x} cy={inc.y} r="0.8" fill={inc.severity === 'critical' ? '#ff3d55' : '#4a9eff'} />
          </g>
        ))}
      </svg>
      
      <div style={S.legend}>
        <div style={S.legendItem}><span style={{...S.dot, background: '#4a9eff'}} /> Bridge Node</div>
        <div style={S.legendItem}><span style={{...S.dot, background: '#ff3d55'}} /> SOS Origin</div>
      </div>

      <style>{`
        @keyframes dash {
          to { stroke-dashoffset: -10; }
        }
        .mesh-line {
          animation: dash 20s linear infinite;
        }
      `}</style>
    </div>
  );
}

const S = {
  container: { flex: 1, background: 'rgba(0,0,0,0.4)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden' },
  svg: { width: '100%', height: '100%', display: 'block' },
  legend: { position: 'absolute', bottom: 12, left: 12, display: 'flex', gap: 16, background: 'rgba(0,0,0,0.6)', padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)' },
  legendItem: { fontSize: '0.6rem', color: '#8899bb', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 },
  dot: { width: 6, height: 6, borderRadius: '50%' }
};
