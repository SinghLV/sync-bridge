import React from 'react';
import { SEVERITY_LABELS } from '../utils/classifier.js';

export default function EmergencyCard({ packet, decoded, selected, onSelect, index }) {
  const sev  = SEVERITY_LABELS[packet.severity] || SEVERITY_LABELS.safe;
  const time  = new Date(packet.queuedAt || packet.ts);
  const elapsed = Math.round((Date.now() - time) / 1000);
  const timeStr = elapsed < 60 ? `${elapsed}s ago` : elapsed < 3600 ? `${Math.floor(elapsed/60)}m ago` : `${Math.floor(elapsed/3600)}h ago`;

  return (
    <div
      style={{
        ...styles.card,
        borderColor: selected ? sev.color + '88' : sev.color + '22',
        background: selected ? sev.color + '14' : sev.color + '08',
        transform: selected ? 'scale(1.01)' : 'scale(1)',
        animationDelay: `${index * 0.05}s`,
      }}
      className="animate-slide-right"
      onClick={onSelect}
    >
      {/* Severity stripe */}
      <div style={{ ...styles.stripe, background: sev.color }} />

      <div style={styles.body}>
        {/* Top row */}
        <div style={styles.topRow}>
          <div style={{ ...styles.sevBadge, background: sev.color + '22', color: sev.color }}>
            <span style={{ ...styles.sevDot, background: sev.color }} />
            {sev.label}
          </div>
          <div style={styles.packetCode} className="mono">{packet.packet}</div>
          <div style={styles.syncStatus}>
            {packet.synced
              ? <span style={{ color: '#30d158', fontSize: '0.65rem' }}>✅ Synced</span>
              : <span style={{ color: '#ff9500', fontSize: '0.65rem' }}>⏳ Pending</span>
            }
          </div>
        </div>

        {/* Info row */}
        <div style={styles.infoRow}>
          {decoded && (
            <>
              <InfoChip icon="⚠" value={decoded.condition} />
              <InfoChip icon="👥" value={`${decoded.people} person${decoded.people > 1 ? 's' : ''}`} />
              <InfoChip icon="📍" value={`Zone L${decoded.zone}`} />
            </>
          )}
          <InfoChip icon="🕐" value={timeStr} dim />
        </div>

        {/* ID */}
        <div style={styles.idRow} className="mono">{packet.id}</div>
      </div>
    </div>
  );
}

function InfoChip({ icon, value, dim }) {
  return (
    <span style={{ ...styles.chip, color: dim ? '#4a5878' : '#8899bb' }}>
      {icon} {value}
    </span>
  );
}

const styles = {
  card: {
    display: 'flex',
    borderRadius: 10,
    border: '1px solid',
    overflow: 'hidden',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    flexShrink: 0,
  },
  stripe: { width: 3, flexShrink: 0 },
  body: { flex: 1, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 },
  topRow: { display: 'flex', alignItems: 'center', gap: 8 },
  sevBadge: { display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 20, fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.07em', flexShrink: 0 },
  sevDot: { width: 6, height: 6, borderRadius: '50%', animation: 'pulse-dot 1.5s infinite' },
  packetCode: { fontSize: '0.78rem', color: '#4a9eff', fontWeight: 700 },
  syncStatus: { marginLeft: 'auto' },
  infoRow: { display: 'flex', flexWrap: 'wrap', gap: 5 },
  chip: { fontSize: '0.67rem', background: 'rgba(255,255,255,0.04)', borderRadius: 20, padding: '2px 8px', whiteSpace: 'nowrap' },
  idRow: { fontSize: '0.58rem', color: '#2a3450', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
};
