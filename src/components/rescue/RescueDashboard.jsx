import React, { useState } from 'react';
import MapView from './MapView.jsx';
import EmergencyCard from './EmergencyCard.jsx';
import { getNtfyTopic } from '../../services/cloudSync.js';
import { useSync } from '../../hooks/useSync.js';

export default function RescueDashboard({ refreshTrigger }) {
  const { incidents, setIncidents, isSyncing } = useSync(refreshTrigger);
  const [activeTab, setActiveTab] = useState('active'); 
  const [showAlert, setShowAlert] = useState(false);
  
  const topic = getNtfyTopic();

  const handleClaim = (id) => {
    setIncidents(prev => prev.map(p => p.id === id ? { ...p, status: 'claimed', claimedBy: 'TEAM-A1' } : p));
  };

  const spawnMassiveDisaster = () => {
    const scenarios = ['FI', 'FL', 'TI', 'MH'];
    const mockPackets = Array.from({ length: 40 }).map((_, i) => ({
      id: `SIM-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      ts: Date.now() - Math.random() * 1000000,
      severity: Math.random() > 0.7 ? 'critical' : 'urgent',
      packet: `SIM-${scenarios[Math.floor(Math.random()*4)]}-P${Math.floor(Math.random()*9)}-Z${Math.floor(Math.random()*9)}`,
      synced: true
    }));
    setIncidents(prev => [...prev, ...mockPackets]);
  };

  const filteredIncidents = incidents.filter(p => {
    if (activeTab === 'active') return !p.status || p.status === 'active';
    if (activeTab === 'claimed') return p.status === 'claimed';
    return p.status === 'resolved';
  });

  const stats = {
    total: incidents.length,
    critical: incidents.filter(p => p.severity === 'critical').length,
    claimed: incidents.filter(p => p.status === 'claimed').length,
  };

  return (
    <div style={S.container}>
      {showAlert && <div style={S.alertOverlay}>⚠️ CRITICAL INCOMING SOS ⚠️</div>}
      
      <div style={S.header}>
        <div style={S.titleArea}>
          <h2 style={S.title}>Crisis Command Node</h2>
        </div>

        <div style={S.simTools}>
          <button style={S.simBtn} onClick={spawnMassiveDisaster}>
            ☢️ SIMULATE MASSIVE DISASTER
          </button>
        </div>
        
        <div style={S.tabSwitcher}>
          <button style={{ ...S.tab, ...(activeTab === 'active' ? S.tabActive : {}) }} onClick={() => setActiveTab('active')}>
            ACTIVE ({incidents.filter(p => !p.status).length})
          </button>
          <button style={{ ...S.tab, ...(activeTab === 'claimed' ? S.tabActive : {}) }} onClick={() => setActiveTab('claimed')}>
            CLAIMED ({stats.claimed})
          </button>
        </div>
      </div>

      <div style={S.mainGrid}>
        <div style={S.leftCol}>
           <div style={S.statRow}>
             <StatBox label="ACTIVE SOS" val={stats.total - stats.claimed} color="#ff3d55" />
             <StatBox label="CRITICAL" val={stats.critical} color="#ff3d55" pulse={stats.critical > 0} />
             <StatBox label="CLAIMED" val={stats.claimed} color="#4a9eff" />
           </div>

           <div style={S.mapWrapper}>
             <div style={S.sectionHeader}>TACTICAL TOPOLOGY</div>
             <MapView incidents={incidents} />
           </div>

           <div style={S.logWrapper}>
             <div style={S.sectionHeader}>ENCRYPTED PACKET STREAM</div>
             <div style={S.logBox}>
               {incidents.slice(-8).reverse().map(p => (
                 <div key={p.id} style={S.logLine}>
                   <span style={S.logTime}>[{new Date(p.ts).toLocaleTimeString()}]</span>
                   <span style={S.logPkt}>{p.packet}</span>
                   <span style={S.logStatus}>{p.synced ? 'SYNCED' : 'LOCAL'}</span>
                 </div>
               ))}
             </div>
           </div>
        </div>

        <div style={S.rightCol}>
           <div style={S.sectionHeader}>INCIDENT QUEUE — {activeTab.toUpperCase()}</div>
           <div style={S.queueScroll}>
             {filteredIncidents.length === 0 ? (
               <div style={S.empty}>NO {activeTab.toUpperCase()} INCIDENTS</div>
             ) : (
               filteredIncidents.sort((a,b) => b.ts - a.ts).map(p => (
                 <EmergencyCard 
                  key={p.id} 
                  packet={p} 
                  onClaim={() => handleClaim(p.id)}
                  showClaim={activeTab === 'active'}
                />
               ))
             )}
           </div>
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, val, color, pulse }) {
  return (
    <div style={S.statBox} className={pulse ? 'animate-pulse' : ''}>
      <div style={S.statLabel}>{label}</div>
      <div style={{ ...S.statVal, color }}>{val}</div>
    </div>
  );
}

const S = {
  container: { height: '100%', display: 'flex', flexDirection: 'column', gap: 20, padding: '20px', background: '#05070a' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' },
  titleArea: { display: 'flex', flexDirection: 'column', gap: 4 },
  badge: { fontSize: '0.6rem', color: '#4a9eff', fontWeight: 900, letterSpacing: '0.15em' },
  title: { fontSize: '1.8rem', fontWeight: 900, margin: 0, letterSpacing: '-0.02em' },
  meta: { fontSize: '0.65rem', color: '#2a3450', fontFamily: "'JetBrains Mono'" },
  simTools: { display: 'flex', alignItems: 'center', marginLeft: 'auto', marginRight: 20 },
  simBtn: { background: 'rgba(255, 61, 85, 0.1)', border: '1px solid rgba(255, 61, 85, 0.3)', color: '#ff3d55', padding: '6px 12px', borderRadius: 6, fontSize: '0.65rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s' },
  tabSwitcher: { display: 'flex', background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 4, border: '1px solid rgba(255,255,255,0.05)' },
  tab: { border: 'none', background: 'transparent', color: '#4a5878', padding: '6px 16px', borderRadius: 7, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' },
  tabActive: { background: 'rgba(74,158,255,0.1)', color: '#4a9eff' },
  mainGrid: { flex: 1, display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24, minHeight: 0 },
  leftCol: { display: 'flex', flexDirection: 'column', gap: 20, minHeight: 0 },
  rightCol: { display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0 },
  statRow: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 },
  statBox: { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: '16px' },
  statLabel: { fontSize: '0.6rem', color: '#4a5878', fontWeight: 800, marginBottom: 4 },
  statVal: { fontSize: '1.8rem', fontWeight: 900, fontFamily: "'JetBrains Mono'" },
  mapWrapper: { flex: 1.5, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 12 },
  sectionHeader: { fontSize: '0.65rem', color: '#4a5878', fontWeight: 900, letterSpacing: '0.1em' },
  logWrapper: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 10 },
  logBox: { flex: 1, background: '#000', borderRadius: 12, padding: 12, border: '1px solid rgba(255,255,255,0.05)', overflowY: 'auto' },
  logLine: { display: 'flex', gap: 12, fontSize: '0.65rem', fontFamily: "'JetBrains Mono'", padding: '2px 0' },
  logTime: { color: '#2a3450' },
  logPkt: { color: '#4a9eff' },
  logStatus: { color: '#30d158', marginLeft: 'auto', opacity: 0.6 },
  queueScroll: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 },
  empty: { textAlign: 'center', padding: 40, color: '#2a3450', fontSize: '0.8rem', border: '1px dashed #2a3450', borderRadius: 16 },
};
