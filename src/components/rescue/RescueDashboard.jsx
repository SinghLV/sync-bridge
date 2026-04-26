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
    const scenarios = [
      { msg: "Everything is fine, just some smoke.", sensors: { temp: 85, h_rate: 145, motion: 'STATIC' }, truth: 15, conflict: true, reason: "HIGH_TEMP + HIGH_HR contradicts 'fine' report." },
      { msg: "URGENT: Flooding in basement, 2 people trapped.", sensors: { water_depth: '1.2m', motion: 'ACTIVE' }, truth: 95, conflict: false, reason: "Telemetry supports reported flood level." },
      { msg: "Stuck in elevator.", sensors: { motion: 'STATIC', battery: '12%' }, truth: 100, conflict: false, reason: "Stationary sensors match report." },
      { msg: "Send help, the roof collapsed!", sensors: { g_force: '4.2G', motion: 'NONE' }, truth: 98, conflict: false, reason: "G-force trigger confirms structural failure." }
    ];

    const mock = Array.from({ length: 4 }).map((_, i) => {
      const scenario = scenarios[i];
      return {
        id: `SOS-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        ts: Date.now() - (i * 10000),
        severity: scenario.truth < 50 ? 'critical' : 'urgent',
        packet: `C1-P${i}-${types[i % 4]}-LZ0${i}-AGENTIC`,
        data: { 
          truth_score: scenario.truth,
          sensor_conflict: scenario.conflict,
          reasoning: scenario.reason,
          triage_code: scenario.truth < 30 ? 'ALPHA' : 'BRAVO',
          people_count: Math.floor(Math.random() * 3) + 1,
          sensors: {
            heart_rate: scenario.sensors.h_rate,
            ambient_noise: scenario.sensors.temp, // Mapping temp to noise for simulation
            impact: scenario.sensors.motion === 'STATIC'
          }
        },
        synced: true
      };
    });
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
             <LiveDecoder packets={incidents} />
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
           
           <div style={{ ...DashStyles.label, marginTop: 32 }}>AI_DEEP_THOUGHT // LIVE_REASONING_LOG</div>
           <ReasoningTerminal incidents={incidents} />
        </section>
      </div>
    </div>
  );
}

function ReasoningTerminal({ incidents }) {
  const logs = incidents
    .filter(i => i.reasoning || i.data?.reasoning)
    .slice(-10)
    .reverse();

  return (
    <div style={DashStyles.reasoningContainer}>
      {logs.length === 0 && <div style={DashStyles.reasoningEmpty}>WAITING_FOR_AI_TRACES...</div>}
      {logs.map((log, i) => (
        <div key={i} style={DashStyles.reasoningRow}>
          <div style={DashStyles.reasoningHeader}>
            <span style={DashStyles.reasoningSource}>[ {log.ai_source || log.data?.ai_source || 'LOCAL_AI'} ]</span>
            <span style={DashStyles.reasoningPkt}>PKT: {log.id}</span>
          </div>
          <div style={DashStyles.reasoningText}>
            {log.reasoning || log.data?.reasoning}
          </div>
        </div>
      ))}
    </div>
  );
}

function LiveDecoder({ packets }) {
  const latest = packets[packets.length - 1];
  if (!latest) return null;

  return (
    <div style={DashStyles.decoderContainer}>
      <div style={DashStyles.decoderHeader}>DECOMPRESSION_CORE // ACTIVE</div>
      <div style={DashStyles.decoderGrid}>
        <div style={DashStyles.decoderCell}>
          <div style={DashStyles.decoderLabel}>RAW_PACKET</div>
          <div style={DashStyles.decoderVal}>{latest.packet}</div>
        </div>
        <div style={DashStyles.decoderArrow}>→</div>
        <div style={DashStyles.decoderCell}>
          <div style={DashStyles.decoderLabel}>HYDRATED_DATA</div>
          <div style={DashStyles.decoderVal}>
             SEV:{latest.severity.toUpperCase()} | P:{latest.data?.people_count || latest.people || '?'}
          </div>
        </div>
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
  emptyState: { height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1e293b', fontSize: '0.65rem', border: '1px dashed #1f2937', fontWeight: 900 },
  reasoningContainer: { flex: 0.6, background: '#000', border: '1px solid #1f2937', padding: '12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 },
  reasoningEmpty: { color: '#1e293b', fontSize: '0.55rem', textAlign: 'center', marginTop: 20 },
  reasoningRow: { borderLeft: '1px solid #3b82f6', paddingLeft: '12px', paddingBottom: '8px' },
  reasoningHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 },
  reasoningSource: { fontSize: '0.5rem', color: '#3b82f6', fontWeight: 900 },
  reasoningPkt: { fontSize: '0.5rem', color: '#1e293b' },
  reasoningText: { fontSize: '0.55rem', color: '#94a3b8', lineHeight: 1.4 },
  decoderContainer: { marginTop: 16, background: '#0a0c10', border: '1px solid #3b82f633', padding: '12px' },
  decoderHeader: { fontSize: '0.45rem', color: '#3b82f6', fontWeight: 900, marginBottom: 8, letterSpacing: 1 },
  decoderGrid: { display: 'flex', alignItems: 'center', gap: 12 },
  decoderCell: { flex: 1 },
  decoderLabel: { fontSize: '0.4rem', color: '#475569', marginBottom: 2 },
  decoderVal: { fontSize: '0.6rem', color: '#fff', fontWeight: 900, fontFamily: '"JetBrains Mono"' },
  decoderArrow: { color: '#3b82f6', fontWeight: 900, fontSize: '0.8rem' }
};
