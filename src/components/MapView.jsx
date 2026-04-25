import React from 'react';

export default function MapView({ incidents = [] }) {
  // 3x3 Grid representing regions
  const zones = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  
  return (
    <div style={S.mapContainer}>
      <div style={S.tacticalOverlay} />
      <div style={S.grid}>
        {zones.map(z => (
          <div key={z} style={S.zone}>
            <span style={S.zoneLabel}>L{z}</span>
            {incidents.filter(i => i.zone === z).map((inc, idx) => (
              <div 
                key={inc.id} 
                style={{
                  ...S.incident,
                  background: getSevColor(inc.severity),
                  left: `${20 + (idx * 15)}%`,
                  top: `${30 + (idx * 20)}%`,
                }}
                className="animate-pulse-dot"
              >
                <div style={S.ping} />
              </div>
            ))}
          </div>
        ))}
      </div>
      
      {/* Legend & Stats Overlay */}
      <div style={S.statsOverlay}>
        <div style={S.statItem}>
          <span style={S.statLabel}>LAT</span>
          <span style={S.statValue}>19.0760° N</span>
        </div>
        <div style={S.statItem}>
          <span style={S.statLabel}>LNG</span>
          <span style={S.statValue}>72.8777° E</span>
        </div>
      </div>
    </div>
  );
}

function getSevColor(sev) {
  if (sev === 'critical') return '#ff3d55';
  if (sev === 'urgent')   return '#ff9500';
  return '#30d158';
}

const S = {
  mapContainer: {
    position: 'relative',
    width: '100%',
    height: '400px',
    background: '#0a0f1e',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    backgroundImage: `
      linear-gradient(rgba(74, 158, 255, 0.1) 1px, transparent 1px),
      linear-gradient(90deg, rgba(74, 158, 255, 0.1) 1px, transparent 1px)
    `,
    backgroundSize: '20px 20px',
  },
  tacticalOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'radial-gradient(circle at 50% 50%, transparent 0%, rgba(0,0,0,0.4) 100%)',
    pointerEvents: 'none',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gridTemplateRows: 'repeat(3, 1fr)',
    height: '100%',
    position: 'relative',
  },
  zone: {
    border: '0.5px solid rgba(255, 255, 255, 0.05)',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoneLabel: {
    position: 'absolute',
    top: 8,
    left: 8,
    fontSize: '0.6rem',
    color: 'rgba(255, 255, 255, 0.2)',
    fontFamily: "'JetBrains Mono'",
  },
  incident: {
    position: 'absolute',
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    boxShadow: '0 0 15px rgba(255, 255, 255, 0.3)',
    zIndex: 10,
  },
  ping: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    border: '2px solid inherit',
    animation: 'pulse-ring 1.5s infinite',
  },
  statsOverlay: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    display: 'flex',
    gap: 16,
    padding: '6px 12px',
    background: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(4px)',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  statLabel: {
    fontSize: '0.5rem',
    color: '#8899bb',
    fontFamily: "'JetBrains Mono'",
  },
  statValue: {
    fontSize: '0.7rem',
    color: '#f0f4ff',
    fontWeight: 700,
    fontFamily: "'JetBrains Mono'",
  },
};
