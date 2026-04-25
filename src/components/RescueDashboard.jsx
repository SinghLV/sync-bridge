import React, { useState, useEffect } from 'react';
import MapView from './MapView.jsx';
import EmergencyCard from './EmergencyCard.jsx';
import { subscribeToIncidents, getNtfyTopic } from '../utils/cloudSync.js';

export default function RescueDashboard({ packets = [] }) {
  const [lastCriticalId, setLastCriticalId] = useState(null);
  const [showAlert, setShowAlert] = useState(false);
  const topic = getNtfyTopic();

  useEffect(() => {
    const criticals = packets.filter(p => p.severity === 'critical');
    if (criticals.length > 0) {
      const latest = criticals[0];
      if (latest.id !== lastCriticalId) {
        setLastCriticalId(latest.id);
        triggerAlert();
      }
    }
  }, [packets]);

  const triggerAlert = () => {
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), 3000);
  };

  const stats = {
    total: packets.length,
    critical: packets.filter(p => p.severity === 'critical').length,
    urgent: packets.filter(p => p.severity === 'urgent').length,
    synced: packets.filter(p => p.synced).length,
  };

  return (
    <div style={{ ...S.container, border: showAlert ? '4px solid #ff3d55' : '4px solid transparent' }}>
      {showAlert && <div style={S.alertOverlay}>⚠️ CRITICAL INCOMING SOS ⚠️</div>}
      
      <div style={S.header}>
        <div style={S.titleArea}>
          <div style={S.badge}>SAR OPERATIONS — SECTOR 7</div>
          <h2 style={S.title}>Emergency Response Command</h2>
          <div style={S.meta}>Network: Active · Cloud: {import.meta.env.VITE_FIREBASE_API_KEY ? 'Connected' : 'Simulation'}</div>
        </div>
        
        <div style={S.mobileAlerts}>
          <div style={S.mobileLabel}>📲 ENABLE MOBILE ALERTS</div>
          <div style={S.mobileBox}>
            Subscribe to topic: <span style={S.topicText}>{topic}</span> on <b>ntfy</b> app
          </div>
        </div>
      </div>

      <div style={S.statGrid}>
        <StatCard label="TOTAL ALERTS" val={stats.total} icon="📡" />
        <StatCard label="CRITICAL" val={stats.critical} icon="🔴" color="#ff3d55" pulse={stats.critical > 0} />
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
                  <span style={S.logAction}>BROADCASTED</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={S.queueSection}>
          <div style={S.sectionLabel}>INCIDENT QUEUE</div>
          <div style={S.queueList}>
            {packets.sort((a,b) => b.ts - a.ts).map(p => (
              <EmergencyCard key={p.id} packet={p} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, val, icon, color = '#f0f4ff', pulse = false }) {
  return (
    <div style={S.statCard} className={pulse ? 'animate-pulse' : ''}>
      <div style={S.statHead}>
        <span style={S.statIcon}>{icon}</span>
        <span style={S.statLabel}>{label}</span>
      </div>
      <div style={{ ...S.statVal, color }}>{val}</div>
    </div>
  );
}

const S = {
  container: { height: '100%', display: 'flex', flexDirection: 'column', gap: 20, padding: '10px', position: 'relative' },
  alertOverlay: { position: 'absolute', top: 0, left: 0, right: 0, background: '#ff3d55', color: '#fff', padding: '8px', textAlign: 'center', fontWeight: 900, zIndex: 1000 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  titleArea: { flex: 1 },
  badge: { fontSize: '0.6rem', background: '#ff3d55', color: '#fff', padding: '2px 6px', borderRadius: 4, fontWeight: 800, marginBottom: 4, display: 'inline-block' },
  title: { fontSize: '1.4rem', fontWeight: 800, margin: 0 },
  meta: { fontSize: '0.7rem', color: '#4a5878', fontFamily: "'JetBrains Mono'" },
  mobileAlerts: { background: 'rgba(74, 158, 255, 0.05)', border: '1px solid rgba(74, 158, 255, 0.2)', padding: '10px', borderRadius: 8, maxWidth: '300px' },
  mobileLabel: { fontSize: '0.6rem', color: '#4a9eff', fontWeight: 800, marginBottom: 4 },
  mobileBox: { fontSize: '0.7rem', color: '#8899bb' },
  topicText: { color: '#f0f4ff', fontWeight: 800, textDecoration: 'underline' },
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 },
  statCard: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px' },
  statHead: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 },
  statIcon: { fontSize: '0.8rem' },
  statLabel: { fontSize: '0.6rem', color: '#8899bb', fontWeight: 700 },
  statVal: { fontSize: '1.5rem', fontWeight: 900, fontFamily: "'JetBrains Mono'" },
  mainGrid: { display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20, flex: 1, minHeight: 0 },
  mapSection: { display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0 },
  sectionLabel: { fontSize: '0.65rem', color: '#4a5878', fontWeight: 800, letterSpacing: '0.15em' },
  logSection: { flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 },
  logBox: { flex: 1, background: '#000', borderRadius: 12, padding: 12, overflowY: 'auto', border: '1px solid rgba(255,255,255,0.05)', fontFamily: "'JetBrains Mono'", fontSize: '0.7rem' },
  logEntry: { display: 'flex', gap: 16, padding: '4px 0', color: '#4a5878' },
  logTime: { color: '#8899bb' },
  logPacket: { color: '#4a9eff' },
  logAction: { marginLeft: 'auto', color: '#30d158', opacity: 0.7 },
  queueSection: { display: 'flex', flexDirection: 'column', minHeight: 0 },
  queueList: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 },
};
