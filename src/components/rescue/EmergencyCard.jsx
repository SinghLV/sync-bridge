import React from 'react';
import { SEVERITY_LABELS } from '../../services/classifier.js';

export default function EmergencyCard({ packet, onClaim, showClaim }) {
  const { severity, ts, id, status, claimedBy } = packet;
  const config = SEVERITY_LABELS[severity] || SEVERITY_LABELS.standard;

  return (
    <div style={{ ...S.card, borderColor: config.color + '33' }} className="animate-slide-up">
      <div style={S.header}>
        <div style={{ ...S.sevTag, color: config.color, background: config.color + '11' }}>
          {severity.toUpperCase()}
        </div>
        <div style={S.time}>{new Date(ts).toLocaleTimeString()}</div>
      </div>

      <div style={S.body}>
        <div style={S.pktCode}>#{id} — {packet.packet}</div>
        <div style={S.meta}>
          <span>👥 {packet.people_count || 'Unknown'} People</span>
          <span>📍 Zone {packet.zone || 'Global'}</span>
        </div>
      </div>

      <div style={S.footer}>
        {status === 'claimed' ? (
          <div style={S.claimedBox}>
            <span style={S.claimedIcon}>🛡️</span>
            <span>Claimed by <b>{claimedBy}</b></span>
          </div>
        ) : showClaim ? (
          <button style={S.claimBtn} onClick={onClaim}>
            CLAIM MISSION
          </button>
        ) : (
          <div style={S.statusText}>PENDING RELAY</div>
        )}
      </div>
    </div>
  );
}

const S = {
  card: { background: 'rgba(255,255,255,0.03)', border: '1px solid', borderRadius: 16, padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  sevTag: { fontSize: '0.65rem', fontWeight: 900, padding: '4px 8px', borderRadius: 6, letterSpacing: '0.05em' },
  time: { fontSize: '0.65rem', color: '#4a5878' },
  body: { display: 'flex', flexDirection: 'column', gap: 6 },
  pktCode: { fontFamily: "'JetBrains Mono'", fontSize: '0.8rem', color: '#4a9eff', fontWeight: 700 },
  meta: { display: 'flex', gap: 12, fontSize: '0.7rem', color: '#8899bb' },
  footer: { marginTop: 4, display: 'flex' },
  claimBtn: { width: '100%', background: '#4a9eff', color: '#fff', border: 'none', borderRadius: 8, padding: '8px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' },
  claimedBox: { display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', color: '#30d158', background: 'rgba(48,209,88,0.1)', padding: '6px 12px', borderRadius: 8, width: '100%' },
  claimedIcon: { fontSize: '0.9rem' },
  statusText: { fontSize: '0.7rem', color: '#4a5878', fontWeight: 700, letterSpacing: '0.05em' },
};
