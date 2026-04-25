import React from 'react';
import MapView from './MapView.jsx';
import EmergencyCard from './EmergencyCard.jsx';
import { decodePacket } from '../utils/packetEncoder.js';

export default function RescueDashboard({ packets = [] }) {
  const stats = {
    total: packets.length,
    critical: packets.filter(p => p.severity === 'critical').length,
    urgent: packets.filter(p => p.severity === 'urgent').length,
    synced: packets.filter(p => p.synced).length,
  };

  return (
    <div style={S.container}>
      <div style={S.header}>
        <div style={S.titleArea}>
          <div style={S.badge}>SAR OPERATIONS</div>
          <h2 style={S.title}>Emergency Response Command</h2>
          <div style={S.meta}>Network: Active · Bridge Nodes: 14 · Region: Sector-7</div>
        </div>
        <div style={S.clock}>{new Date().toLocaleTimeString()}</div>
      </div>

      <div style={S.statGrid}>
        <StatCard label="TOTAL ALERTS" val={stats.total} icon="📡" />
        <StatCard label="CRITICAL" val={stats.critical} icon="🔴" color="#ff3d55" />
        <StatCard label="URGENT" val={stats.urgent} icon="🟠" color="#ff9500" />
        <StatCard label="SYNCED" val={stats.synced} icon="✅" color="#30d158" />
      </div>

      <div style={S.mainGrid}>
        <div style={S.mapSection}>
          <div style={S.sectionLabel}>TACTICAL ZONE MAP</div>
          <MapView incidents={packets} />
          
          <div style={S.logSection}>
            <div style={S.sectionLabel}>RAW PACKET FEED</div>
            <div style={S.logBox}>
              {packets.slice(0, 10).map(p => (
                <div key={p.id} style={S.logEntry}>
                  <span style={S.logTime}>{new Date(p.ts).toLocaleTimeString([], { hour12: false })}</span>
                  <span style={S.logPacket}>{p.packet}</span>
                  <span style={S.logAction}>RECEIVED FROM BRIDGE_{p.id.slice(-4)}</span>
                </div>
              ))}
              {packets.length === 0 && <div style={S.emptyLog}>Waiting for incoming packets...</div>}
            </div>
          </div>
        </div>

        <div style={S.queueSection}>
          <div style={S.sectionLabel}>INCIDENT QUEUE</div>
          <div style={S.queueList}>
            {packets.sort((a,b) => b.ts - a.ts).map(p => (
              <EmergencyCard key={p.id} packet={p} />
            ))}
            {packets.length === 0 && (
              <div style={S.emptyQueue}>
                <div style={S.emptyIcon}>🛡️</div>
                <div style={S.emptyTitle}>Operational Monitoring</div>
                <div style={S.emptySub}>No active incidents reported in this sector.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, val, icon, color = '#f0f4ff' }) {
  return (
    <div style={S.statCard}>
      <div style={S.statHead}>
        <span style={S.statIcon}>{icon}</span>
        <span style={S.statLabel}>{label}</span>
      </div>
      <div style={{ ...S.statVal, color }}>{val}</div>
    </div>
  );
}

const S = {
  container: { height: '100%', display: 'flex', flexDirection: 'column', gap: 20, padding: '10px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  badge: { fontSize: '0.6rem', background: '#ff3d55', color: '#fff', padding: '2px 6px', borderRadius: 4, fontWeight: 800, letterSpacing: '0.1em', marginBottom: 6, display: 'inline-block' },
  title: { fontSize: '1.5rem', fontWeight: 800, margin: 0 },
  meta: { fontSize: '0.7rem', color: '#4a5878', marginTop: 4, fontFamily: "'JetBrains Mono'" },
  clock: { fontFamily: "'JetBrains Mono'", fontSize: '1rem', color: '#4a9eff', background: 'rgba(74, 158, 255, 0.1)', padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(74, 158, 255, 0.2)' },
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 },
  statCard: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '16px' },
  statHead: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
  statIcon: { fontSize: '0.8rem' },
  statLabel: { fontSize: '0.65rem', color: '#8899bb', fontWeight: 700, letterSpacing: '0.05em' },
  statVal: { fontSize: '1.8rem', fontWeight: 900, fontFamily: "'JetBrains Mono'" },
  mainGrid: { display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20, flex: 1, minHeight: 0 },
  mapSection: { display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0 },
  sectionLabel: { fontSize: '0.65rem', color: '#4a5878', fontWeight: 800, letterSpacing: '0.15em', marginBottom: 8 },
  logSection: { flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 },
  logBox: { flex: 1, background: '#000', borderRadius: 12, padding: 12, overflowY: 'auto', border: '1px solid rgba(255,255,255,0.05)', fontFamily: "'JetBrains Mono'", fontSize: '0.7rem' },
  logEntry: { display: 'flex', gap: 16, padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.02)', color: '#4a5878' },
  logTime: { color: '#8899bb' },
  logPacket: { color: '#4a9eff', fontWeight: 700 },
  logAction: { marginLeft: 'auto', color: '#30d158', opacity: 0.7 },
  emptyLog: { color: '#2a3450', textAlign: 'center', marginTop: 40 },
  queueSection: { display: 'flex', flexDirection: 'column', minHeight: 0 },
  queueList: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 8 },
  emptyQueue: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', background: 'rgba(255,255,255,0.01)', borderRadius: 16, border: '1px dashed rgba(255,255,255,0.05)' },
  emptyIcon: { fontSize: '3rem', opacity: 0.3, marginBottom: 16 },
  emptyTitle: { color: '#8899bb', fontWeight: 700, marginBottom: 4 },
  emptySub: { fontSize: '0.75rem', color: '#4a5878' },
};
