import React, { useState } from 'react';
import { SEVERITY_LABELS } from '../utils/classifier.js';
import { decodePacket } from '../utils/packetEncoder.js';

// Zone grid positions (9 zones mapped to a 3x3 grid on the SVG canvas)
const ZONE_POSITIONS = {
  1: { x: 18, y: 18 }, 2: { x: 50, y: 18 }, 3: { x: 82, y: 18 },
  4: { x: 18, y: 50 }, 5: { x: 50, y: 50 }, 6: { x: 82, y: 50 },
  7: { x: 18, y: 82 }, 8: { x: 50, y: 82 }, 9: { x: 82, y: 82 },
};

const ZONE_NAMES = {
  1: 'Sector North-West', 2: 'Sector North', 3: 'Sector North-East',
  4: 'Sector West',       5: 'Sector Central', 6: 'Sector East',
  7: 'Sector South-West', 8: 'Sector South', 9: 'Sector South-East',
};

export default function MapView({ packets, selected, onSelect }) {
  const [hovered, setHovered] = useState(null);

  // Group packets by zone, take highest severity per zone
  const zoneMap = {};
  packets.forEach(pkt => {
    const decoded = decodePacket(pkt.packet);
    const zone = decoded?.zone || 5;
    if (!zoneMap[zone] || severityRank(pkt.severity) > severityRank(zoneMap[zone].severity)) {
      zoneMap[zone] = pkt;
    }
  });

  const incidents = Object.entries(zoneMap).map(([zone, pkt]) => ({
    zone: parseInt(zone),
    packet: pkt,
    pos: ZONE_POSITIONS[zone] || ZONE_POSITIONS[5],
    color: SEVERITY_LABELS[pkt.severity]?.color || '#4a9eff',
    label: SEVERITY_LABELS[pkt.severity]?.label || 'UNKNOWN',
  }));

  return (
    <div style={styles.container}>
      {/* SVG Map */}
      <svg viewBox="0 0 100 100" style={styles.svg} preserveAspectRatio="xMidYMid meet">
        {/* Grid background */}
        <defs>
          <pattern id="grid" width="33.33" height="33.33" patternUnits="userSpaceOnUse">
            <path d="M 33.33 0 L 0 0 0 33.33" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.4" />
          </pattern>
          <filter id="glow">
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width="100" height="100" fill="url(#grid)" />

        {/* Zone dividers */}
        <line x1="33.3" y1="0" x2="33.3" y2="100" stroke="rgba(255,255,255,0.06)" strokeWidth="0.3" />
        <line x1="66.6" y1="0" x2="66.6" y2="100" stroke="rgba(255,255,255,0.06)" strokeWidth="0.3" />
        <line x1="0" y1="33.3" x2="100" y2="33.3" stroke="rgba(255,255,255,0.06)" strokeWidth="0.3" />
        <line x1="0" y1="66.6" x2="100" y2="66.6" stroke="rgba(255,255,255,0.06)" strokeWidth="0.3" />

        {/* Zone labels */}
        {Object.entries(ZONE_POSITIONS).map(([zone, pos]) => (
          <text
            key={zone}
            x={pos.x}
            y={pos.y - 8}
            textAnchor="middle"
            fill="rgba(255,255,255,0.08)"
            fontSize="2.5"
            fontFamily="JetBrains Mono"
          >
            L{zone}
          </text>
        ))}

        {/* Incident pins */}
        {incidents.map(({ zone, packet, pos, color }) => {
          const isSelected = selected === packet.id;
          const isHovered  = hovered === packet.id;
          const scale = isSelected || isHovered ? 1.5 : 1;

          return (
            <g key={zone} onClick={() => onSelect(packet.id)} style={{ cursor: 'pointer' }}>
              {/* Pulse ring */}
              {(isSelected || packet.severity === 'critical') && (
                <circle
                  cx={pos.x} cy={pos.y}
                  r={5 * scale}
                  fill="none"
                  stroke={color}
                  strokeWidth="0.4"
                  opacity="0.4"
                  style={{ animation: 'pulse-ring 2s ease-out infinite' }}
                />
              )}
              {/* Glow */}
              <circle cx={pos.x} cy={pos.y} r={3.5 * scale} fill={color} opacity="0.2" filter="url(#glow)" />
              {/* Main pin */}
              <circle
                cx={pos.x} cy={pos.y}
                r={2.5 * scale}
                fill={color}
                opacity={isSelected ? 1 : 0.85}
                onMouseEnter={() => setHovered(packet.id)}
                onMouseLeave={() => setHovered(null)}
                style={{ transition: 'r 0.2s, opacity 0.2s' }}
              />
              {/* Pin label */}
              <text x={pos.x} y={pos.y + 5.5 * scale} textAnchor="middle" fill={color} fontSize={isSelected ? 3.5 : 2.8} fontFamily="JetBrains Mono" fontWeight="bold">
                {packet.severity === 'critical' ? '●' : packet.severity === 'urgent' ? '◆' : '▲'}
              </text>
            </g>
          );
        })}

        {/* Center crosshair */}
        <line x1="49" y1="50" x2="51" y2="50" stroke="rgba(255,255,255,0.15)" strokeWidth="0.3" />
        <line x1="50" y1="49" x2="50" y2="51" stroke="rgba(255,255,255,0.15)" strokeWidth="0.3" />
      </svg>

      {/* Selected Packet Detail */}
      {selected && (() => {
        const pkt = packets.find(p => p.id === selected);
        if (!pkt) return null;
        const decoded = decodePacket(pkt.packet);
        const sev = SEVERITY_LABELS[pkt.severity];
        return (
          <div style={{ ...styles.detail, borderColor: sev.color + '44', background: sev.color + '0d' }}>
            <div style={styles.detailHeader}>
              <span style={{ color: sev.color, fontWeight: 700, fontSize: '0.75rem' }}>{sev.icon} {sev.label}</span>
              <span style={styles.detailPacket} className="mono">{pkt.packet}</span>
              <button style={styles.detailClose} onClick={() => onSelect(null)}>✕</button>
            </div>
            <div style={styles.detailBody}>
              <span style={styles.detailChip}>{decoded?.condition}</span>
              <span style={styles.detailChip}>👥 {decoded?.people} person{decoded?.people > 1 ? 's' : ''}</span>
              <span style={styles.detailChip}>📍 Zone L{decoded?.zone}</span>
              <span style={{ ...styles.detailChip, color: pkt.synced ? '#30d158' : '#ff9500' }}>
                {pkt.synced ? '✅ Synced' : '⏳ Pending'}
              </span>
            </div>
          </div>
        );
      })()}

      {/* Empty State */}
      {incidents.length === 0 && (
        <div style={styles.emptyMap}>
          <div style={{ fontSize: '1.5rem' }}>🗺</div>
          <div style={{ fontSize: '0.75rem', color: '#4a5878' }}>No incidents mapped yet</div>
          <div style={{ fontSize: '0.65rem', color: '#2a3450' }}>Send an SOS from the victim app</div>
        </div>
      )}
    </div>
  );
}

function severityRank(s) {
  return { critical: 3, urgent: 2, safe: 1 }[s] || 0;
}

const styles = {
  container: { flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', background: 'rgba(5,8,16,0.6)' },
  svg: { flex: 1, width: '100%', height: '100%', display: 'block' },
  detail: { padding: '10px 14px', borderTop: '1px solid', display: 'flex', flexDirection: 'column', gap: 6 },
  detailHeader: { display: 'flex', alignItems: 'center', gap: 10 },
  detailPacket: { fontSize: '0.8rem', color: '#4a9eff', marginLeft: 4 },
  detailClose: { marginLeft: 'auto', background: 'transparent', border: 'none', color: '#4a5878', cursor: 'pointer', fontSize: '0.9rem' },
  detailBody: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  detailChip: { fontSize: '0.68rem', padding: '2px 8px', borderRadius: 20, background: 'rgba(255,255,255,0.06)', color: '#8899bb' },
  emptyMap: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, pointerEvents: 'none' },
};
