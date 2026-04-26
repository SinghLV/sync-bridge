import React, { useState, useEffect } from 'react';
import MapView from './MapView.jsx';
import EmergencyCard from './EmergencyCard.jsx';
import { useSync } from '../../hooks/useSync.js';
import { Howl } from 'howler';

const ALERT_CHIME = new Howl({
  src: ['https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'],
  volume: 0.4
});

export default function RescueDashboard({ refreshTrigger }) {
  const { incidents, setIncidents } = useSync(refreshTrigger);
  const [activeTab, setActiveTab] = useState('active'); 
  const [isAlerting, setIsAlerting] = useState(false);
  const [prevCount, setPrevCount] = useState(0);
  
  useEffect(() => {
    if (incidents.length > prevCount) {
      const latest = incidents[incidents.length - 1];
      if (latest.severity === 'critical') {
        ALERT_CHIME.play();
        setIsAlerting(true);
        setTimeout(() => setIsAlerting(false), 3500);
      }
      setPrevCount(incidents.length);
    }
  }, [incidents.length]);

  const handleClaim = (id) => {
    setIncidents(prev => prev.map(p => p.id === id ? { ...p, status: 'claimed', team: 'STRIKE_ALPHA' } : p));
  };

  const spawnSimulation = () => {
    const types = ['FI', 'FL', 'TI', 'MH'];
    const mock = Array.from({ length: 15 }).map(() => ({
      id: `REF-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      ts: Date.now() - Math.random() * 500000,
      severity: Math.random() > 0.8 ? 'critical' : 'urgent',
      packet: `RAW_P_${types[Math.floor(Math.random()*4)]}_${Math.floor(Math.random()*99)}`,
      synced: true
    }));
    setIncidents(prev => [...prev, ...mock]);
  };

  const filtered = incidents.filter(p => {
    if (activeTab === 'active') return !p.status || p.status === 'active';
    if (activeTab === 'claimed') return p.status === 'claimed';
    return p.status === 'resolved';
  });

  return (
    <div style={DashStyles.container}>
      {isAlerting && <div style={DashStyles.alertBanner}>[ ALERT: INCOMING_CRITICAL_TRANSMISSION ]</div>}
      
      <header style={DashStyles.nav}>
        <div style={DashStyles.identity}>
          <div style={DashStyles.navBadge}>SYS_STATUS // NOMINAL</div>
          <h1 style={DashStyles.navTitle}>COMMAND_CENTER_V4</h1>
        </div>

        <div style={DashStyles.controls}>
          <button style={DashStyles.simAction} onClick={spawnSimulation}>
            [ SIM_UPLINK_STRESS ]
          </button>
          
          <div style={DashStyles.tabGroup}>
            {[
              { id: 'active', label: 'PENDING_TRIAGE' },
              { id: 'claimed', label: 'ENGAGED_RESPONSE' },
              { id: 'resolved', label: 'SIGNAL_ARCHIVE' }
            ].map(t => (
              <button 
                key={t.id}
                style={{ ...DashStyles.tab, ...(activeTab === t.id ? DashStyles.tabActive : {}) }} 
                onClick={() => setActiveTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div style={DashStyles.layout}>
        <section style={DashStyles.sidebar}>
           <div style={DashStyles.statGrid}>
             <MetricBox label="QUEUE_DEPTH" val={incidents.length} />
             <MetricBox label="CRITICAL_THREAT" val={incidents.filter(p => p.severity === 'critical').length} highlight />
             <MetricBox label="SYNC_STABILITY" val="99.98%" />
           </div>

           <div style={DashStyles.mapContainer}>
             <div style={DashStyles.label}>TACTICAL_GEOSPATIAL_VIEW</div>
             <MapView incidents={incidents} />
           </div>

           <div style={DashStyles.streamContainer}>
             <div style={DashStyles.label}>LIVE_DATA_PACKETS</div>
             <div style={DashStyles.streamScroll}>
               {incidents.slice(-8).reverse().map(p => (
                 <div key={p.id} style={DashStyles.streamRow}>
                   <span style={DashStyles.streamTime}>[{new Date(p.ts).toLocaleTimeString()}]</span>
                   <span style={DashStyles.streamPkt}>{p.packet}</span>
                   <span style={DashStyles.streamMeta}>{p.synced ? 'UPLINKED' : 'BUFFERED'}</span>
                 </div>
               ))}
             </div>
           </div>
        </section>

        <section style={DashStyles.feed}>
           <div style={DashStyles.label}>ACTIVE_INCIDENT_STREAM // {activeTab.toUpperCase()}</div>
           <div style={DashStyles.feedScroll}>
             {filtered.length === 0 ? (
               <div style={DashStyles.emptyState}>[ NO_ACTIVE_SIGNALS ]</div>
             ) : (
               filtered.sort((a,b) => b.ts - a.ts).map(p => (
                 <EmergencyCard 
                  key={p.id} 
                  packet={p} 
                  onClaim={() => handleClaim(p.id)}
                  showClaim={activeTab === 'active'}
                />
               ))
             )}
           </div>
        </section>
      </div>
    </div>
  );
}

function MetricBox({ label, val, highlight }) {
  return (
    <div style={{...DashStyles.metricBox, borderLeft: highlight ? '2px solid #f43f5e' : '1px solid #1f2937'}}>
      <div style={DashStyles.metricLabel}>{label}</div>
      <div style={{ ...DashStyles.metricVal, color: highlight ? '#f43f5e' : '#fff' }}>{val}</div>
    </div>
  );
}

const DashStyles = {
  container: { height: '100%', display: 'flex', flexDirection: 'column', gap: 32, padding: '32px', background: '#05070a', color: '#fff', fontFamily: '"JetBrains Mono"' },
  alertBanner: { position: 'fixed', top: 0, left: 0, width: '100%', background: '#f43f5e', color: '#fff', textAlign: 'center', padding: '12px', fontWeight: 900, zIndex: 100, fontSize: '0.7rem', letterSpacing: '0.2em', fontFamily: '"JetBrains Mono"' },
  nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid #1f2937', paddingBottom: '20px' },
  identity: { display: 'flex', flexDirection: 'column' },
  navBadge: { fontSize: '0.5rem', fontWeight: 900, color: '#3b82f6', letterSpacing: '0.2em', marginBottom: 4 },
  navTitle: { fontSize: '1.8rem', fontWeight: 900, margin: 0, letterSpacing: '-0.02em', fontFamily: '"Space Grotesk"', color: '#fff' },
  controls: { display: 'flex', alignItems: 'center', gap: 24 },
  simAction: { background: 'none', border: '1px solid #1f2937', color: '#475569', padding: '8px 16px', fontSize: '0.6rem', fontWeight: 900, cursor: 'pointer' },
  tabGroup: { display: 'flex', background: '#000', padding: '4px', border: '1px solid #1f2937' },
  tab: { background: 'none', border: 'none', color: '#475569', padding: '8px 16px', fontSize: '0.6rem', fontWeight: 900, cursor: 'pointer' },
  tabActive: { background: '#1f2937', color: '#fff' },
  layout: { flex: 1, display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 40, minHeight: 0 },
  sidebar: { display: 'flex', flexDirection: 'column', gap: 32, minHeight: 0 },
  feed: { display: 'flex', flexDirection: 'column', minHeight: 0 },
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 },
  metricBox: { background: '#000', border: '1px solid #1f2937', padding: '16px' },
  metricLabel: { fontSize: '0.5rem', color: '#475569', fontWeight: 900, letterSpacing: '0.1em', marginBottom: 8 },
  metricVal: { fontSize: '1.4rem', fontWeight: 900, fontFamily: '"JetBrains Mono"' },
  label: { fontSize: '0.55rem', color: '#1e293b', fontWeight: 900, letterSpacing: '0.15em', marginBottom: 16 },
  mapContainer: { flex: 1.5, minHeight: 0, display: 'flex', flexDirection: 'column' },
  streamContainer: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' },
  streamScroll: { flex: 1, background: '#000', padding: '16px', border: '1px solid #1f2937', overflowY: 'auto' },
  streamRow: { display: 'flex', gap: 16, fontSize: '0.55rem', fontFamily: '"JetBrains Mono"', padding: '6px 0', borderBottom: '1px solid #0a0c10' },
  streamTime: { color: '#1e293b' },
  streamPkt: { color: '#3b82f6', fontWeight: 800 },
  streamMeta: { marginLeft: 'auto', color: '#10b981', opacity: 0.6 },
  feedScroll: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 },
  emptyState: { height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1e293b', fontSize: '0.65rem', border: '1px dashed #1f2937', fontWeight: 900 }
};

// Re-using identity styles from Landing for consistency
const LandingStyles = {
  identity: { display: 'flex', flexDirection: 'column' }
};
