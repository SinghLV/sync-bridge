import React, { useState, useEffect } from 'react';
import { encodePacket } from '../../services/packetEncoder.js';
import { enqueue, markSynced } from '../../services/offlineQueue.js';
import { isOnline, watchNetwork, simulateSync } from '../../services/networkMonitor.js';
import SOSButton from './SOSButton.jsx';

const INCIDENT_TYPES = [
  { id: 'TI', label: 'CRITICAL_INJURY', sub: 'TRAUMA / HEMORRHAGE', sev: 'critical' },
  { id: 'TU', label: 'STRUCTURAL_COLLAPSE', sub: 'ENTRAPMENT_ACTIVE', sev: 'urgent' },
  { id: 'MH', label: 'MEDICAL_ACUTE', sub: 'CARDIAC / RESPIRATORY', sev: 'critical' },
  { id: 'FI', label: 'HAZMAT_FIRE', sub: 'THERMAL_THREAT', sev: 'critical' },
  { id: 'FL', label: 'FLASH_FLOOD', sub: 'WATER_LEVEL_CRITICAL', sev: 'urgent' },
  { id: 'GE', label: 'EVAC_SUPPORT', sub: 'LOGISTICAL_EXTRACTION', sev: 'standard' },
];

export default function VictimApp({ onPacketSent }) {
  const [online, setOnline] = useState(isOnline());
  const [simOffline, setSimOffline] = useState(false);
  const [step, setStep] = useState(0); 
  const [selections, setSelections] = useState({ condition: null, count: 1 });
  const [phase, setPhase] = useState('idle');
  const [packet, setPacket] = useState(null);
  const [syncing, setSyncing] = useState(false);
  
  const effectiveOnline = online && !simOffline;

  useEffect(() => {
    const cleanup = watchNetwork(() => setOnline(true), () => setOnline(false));
    return cleanup;
  }, []);

  const handleSelection = (condition) => {
    setSelections({ ...selections, condition });
    setStep(1);
  };

  const startInference = (count) => {
    setSelections({ ...selections, count });
    setPhase('inference_active');
    
    setTimeout(() => {
      const result = {
        severity: selections.condition.sev,
        severity_code: selections.condition.sev === 'critical' ? 'C1' : 'C2',
        people_count: count,
        condition_code: selections.condition.id,
        zone: 'Z-04',
        confidence: 0.9842,
        reasoning: "SEMANTIC_MATCH: HIGH_THREAT_KEYWORDS // PRIORITY_BOOST_ACTIVE",
        timestamp: new Date().toISOString()
      };
      const pkt = encodePacket(result, 'NODE-' + Math.random().toString(36).slice(2,5).toUpperCase());
      setPacket(pkt);
      setPhase('review');
    }, 2200);
  };

  const finalizeRelay = () => {
    enqueue(packet);
    if (effectiveOnline) {
      setSyncing(true);
      simulateSync([packet], (id) => markSynced(id), () => {
        setSyncing(false);
        setPhase('success');
        onPacketSent && onPacketSent();
      });
    } else {
      setPhase('offline_buffered');
    }
  };

  return (
    <div style={VictimStyles.root}>
      {/* Device Telemetry Header */}
      <div style={VictimStyles.telemetry}>
        <div style={VictimStyles.telGroup}>
          <span style={VictimStyles.telLabel}>GPS</span>
          <span style={{...VictimStyles.telVal, color: '#10b981'}}>LOCKED</span>
        </div>
        <div style={VictimStyles.telGroup}>
          <span style={VictimStyles.telLabel}>RSSI</span>
          <span style={VictimStyles.telVal}>-82 dBm</span>
        </div>
        <div style={VictimStyles.telGroup}>
          <span style={VictimStyles.telLabel}>BATT</span>
          <span style={VictimStyles.telVal}>84%</span>
        </div>
      </div>

      <header style={VictimStyles.nav}>
        <div style={VictimStyles.brand}>SYNC_BRIDGE // V.04</div>
        <button 
          style={{ ...VictimStyles.signalBadge, background: effectiveOnline ? '#10b98120' : '#f43f5e20', color: effectiveOnline ? '#10b981' : '#f43f5e' }}
          onClick={() => setSimOffline(!simOffline)}
        >
          {effectiveOnline ? '● NETWORK_READY' : '○ MESH_ONLY'}
        </button>
      </header>

      <main style={VictimStyles.body}>
        {phase === 'idle' && step === 0 && (
          <div style={VictimStyles.view}>
            <div style={VictimStyles.headerSection}>
              <h1 style={VictimStyles.title}>INCIDENT_REPORT</h1>
              <p style={VictimStyles.subtitle}>SELECT_PRIMARY_SITUATION_CODE</p>
            </div>
            <div style={VictimStyles.grid}>
              {INCIDENT_TYPES.map(type => (
                <button key={type.id} style={VictimStyles.typeCard} onClick={() => handleSelection(type)}>
                  <div style={VictimStyles.typeIndicator} />
                  <div style={VictimStyles.typeInfo}>
                    <div style={VictimStyles.typeLabel}>{type.label}</div>
                    <div style={VictimStyles.typeSub}>{type.sub}</div>
                  </div>
                  <div style={VictimStyles.typeCode}>{type.id}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {phase === 'idle' && step === 1 && (
          <div style={VictimStyles.view}>
             <div style={VictimStyles.headerSection}>
              <h1 style={VictimStyles.title}>PERSONNEL_COUNT</h1>
              <p style={VictimStyles.subtitle}>ESTIMATE_VICTIMS_IN_VICINITY</p>
            </div>
             <div style={VictimStyles.countGrid}>
               {[1, 2, 5, 10].map(n => (
                 <button key={n} style={VictimStyles.countBtn} onClick={() => startInference(n)}>
                   {n === 10 ? '10+' : n}
                 </button>
               ))}
             </div>
             <button style={VictimStyles.backBtn} onClick={() => setStep(0)}>← RETURN_TO_SELECTION</button>
          </div>
        )}

        {phase === 'inference_active' && (
          <div style={VictimStyles.inferenceView}>
            <div style={VictimStyles.terminal}>
              <div style={VictimStyles.termLine}>[ SYS ] TPU_INIT // OK</div>
              <div style={VictimStyles.termLine}>[ SYS ] LOADING_INT8_QUANT_WEIGHTS</div>
              <div style={VictimStyles.termLine}>[ AI ] ANALYZING_INCIDENT_VECTOR...</div>
              <div style={VictimStyles.termLine}>[ AI ] CONFIDENCE_SCORE: 0.9842</div>
              <div style={VictimStyles.termLine}>[ AI ] RESULT: {selections.condition?.label}</div>
              <div style={VictimStyles.termLine}>[ MESH ] PREPARING_ENCODED_PACKET</div>
              <div className="pulse-text" style={{...VictimStyles.termLine, color: '#3b82f6'}}>PROCESSING_UPLINK...</div>
            </div>
          </div>
        )}

        {phase === 'review' && (
          <div style={VictimStyles.view}>
            <div style={VictimStyles.reviewCard}>
              <div style={VictimStyles.reviewHeader}>
                <span>LOCAL_INFERENCE_DATA</span>
                <span>ZONE: Z-04</span>
              </div>
              <div style={VictimStyles.reviewMain}>
                <div style={VictimStyles.reviewType}>{selections.condition.label}</div>
                <div style={VictimStyles.reviewCount}>{selections.count} PERSONNEL_REPORTED</div>
              </div>
            </div>

            <div style={VictimStyles.packetInfo}>
              <div style={VictimStyles.packetHeader}>
                <span style={VictimStyles.packetLabel}>ENCODED_HEX_DATA</span>
                <span style={VictimStyles.packetSize}>42 BYTES</span>
              </div>
              <div style={VictimStyles.packetData}>{packet.packet.match(/.{1,8}/g).join(' ')}</div>
            </div>

            <SOSButton 
              label={effectiveOnline ? "UPLINK_TO_CLOUD" : "STORE_IN_MESH_QUEUE"}
              color={effectiveOnline ? "#3b82f6" : "#f59e0b"}
              onClick={finalizeRelay}
              loading={syncing}
            />
            <button style={VictimStyles.backBtn} onClick={() => setPhase('idle')}>ABORT_AND_RETRY</button>
          </div>
        )}

        {phase === 'success' && (
          <div style={VictimStyles.resultView}>
            <div style={VictimStyles.successIcon}>[ TRANSMISSION_COMPLETE ]</div>
            <h2 style={VictimStyles.resultTitle}>SIGNAL_UPLINKED</h2>
            <p style={VictimStyles.resultSub}>Packet successfully synchronized with cloud persistence layer.</p>
            <button style={VictimStyles.finishBtn} onClick={() => window.location.reload()}>ACKNOWLEDGE</button>
          </div>
        )}

        {phase === 'offline_buffered' && (
          <div style={VictimStyles.resultView}>
            <div style={VictimStyles.bufferIcon}>[ BUFFERED_OFFLINE ]</div>
            <h2 style={VictimStyles.resultTitle}>SIGNAL_PERSISTED</h2>
            <p style={VictimStyles.resultSub}>No network path. Report stored in local cache. Will relay via mesh-bridge automatically.</p>
            <button style={VictimStyles.finishBtn} onClick={() => window.location.reload()}>ACKNOWLEDGE</button>
          </div>
        )}
      </main>
    </div>
  );
}

const VictimStyles = {
  root: { height: '100%', background: '#05070a', color: '#fff', display: 'flex', flexDirection: 'column', fontFamily: '"JetBrains Mono"', position: 'relative' },
  telemetry: { display: 'flex', gap: 16, padding: '8px 20px', background: '#000', borderBottom: '1px solid #1f2937', fontSize: '0.5rem', color: '#475569', fontWeight: 800 },
  telGroup: { display: 'flex', gap: 4 },
  telLabel: { color: '#1e293b' },
  telVal: { color: '#94a3b8' },
  
  nav: { padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1f2937' },
  brand: { fontSize: '0.6rem', fontWeight: 900, color: '#fff', letterSpacing: '0.1em' },
  signalBadge: { fontSize: '0.55rem', fontWeight: 900, border: 'none', padding: '4px 8px', borderRadius: 2, cursor: 'pointer', fontFamily: '"JetBrains Mono"' },
  
  body: { flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column' },
  view: { display: 'flex', flexDirection: 'column', gap: 24, animation: 'fadeIn 0.3s ease' },
  headerSection: { borderLeft: '2px solid #3b82f6', paddingLeft: 12 },
  title: { fontSize: '1.4rem', fontWeight: 900, letterSpacing: '-0.02em', margin: 0, color: '#fff' },
  subtitle: { fontSize: '0.55rem', color: '#475569', fontWeight: 800, margin: '4px 0 0 0', letterSpacing: '0.1em' },
  
  grid: { display: 'flex', flexDirection: 'column', gap: 8 },
  typeCard: { background: '#0a0c10', border: '1px solid #1f2937', padding: '16px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', textAlign: 'left', color: '#fff', position: 'relative' },
  typeIndicator: { width: 4, height: 24, background: '#1e293b' },
  typeInfo: { flex: 1 },
  typeLabel: { fontSize: '0.75rem', fontWeight: 800, color: '#fff' },
  typeSub: { fontSize: '0.55rem', color: '#475569', fontWeight: 600 },
  typeCode: { fontSize: '0.6rem', color: '#1e293b', fontWeight: 900, fontFamily: '"JetBrains Mono"' },
  
  countGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  countBtn: { background: '#0a0c10', border: '1px solid #1f2937', color: '#fff', fontSize: '1.2rem', fontWeight: 900, padding: '24px', cursor: 'pointer' },
  
  backBtn: { background: 'none', border: 'none', color: '#475569', fontSize: '0.55rem', fontWeight: 800, cursor: 'pointer', alignSelf: 'center', marginTop: 12, letterSpacing: '0.05em' },
  
  inferenceView: { display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center' },
  terminal: { width: '100%', background: '#000', padding: '20px', border: '1px solid #1f2937', borderRadius: 4 },
  termLine: { fontSize: '0.65rem', color: '#10b981', marginBottom: 6, opacity: 0.9 },
  
  reviewCard: { background: '#0a0c10', border: '1px solid #3b82f6', padding: '24px', position: 'relative' },
  reviewHeader: { display: 'flex', justifyContent: 'space-between', fontSize: '0.5rem', fontWeight: 800, color: '#3b82f6', marginBottom: 16, letterSpacing: '0.1em' },
  reviewType: { fontSize: '1.2rem', fontWeight: 900, color: '#fff' },
  reviewCount: { fontSize: '0.7rem', color: '#475569', marginTop: 4 },
  
  packetInfo: { background: '#000', padding: '16px', border: '1px solid #1f2937' },
  packetHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: 12 },
  packetLabel: { fontSize: '0.55rem', fontWeight: 900, color: '#1e293b' },
  packetSize: { fontSize: '0.55rem', color: '#475569' },
  packetData: { fontSize: '0.75rem', color: '#3b82f6', fontWeight: 800, wordBreak: 'break-all', lineHeight: 1.5 },
  
  resultView: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, textAlign: 'center', gap: 24 },
  successIcon: { color: '#10b981', fontSize: '0.65rem', fontWeight: 900 },
  bufferIcon: { color: '#f59e0b', fontSize: '0.65rem', fontWeight: 900 },
  resultTitle: { fontSize: '1.5rem', fontWeight: 900, margin: 0 },
  resultSub: { fontSize: '0.75rem', color: '#475569', maxWidth: 260, lineHeight: 1.6 },
  finishBtn: { background: '#1f2937', border: 'none', color: '#fff', padding: '12px 32px', fontWeight: 900, fontSize: '0.7rem', cursor: 'pointer', letterSpacing: '0.1em' }
};

const VictimStyles = {
  root: { height: '100%', background: '#0a0c10', color: '#fff', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif" },
  nav: { padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1f2937' },
  brand: { fontSize: '0.65rem', fontWeight: 900, color: '#4a9eff', letterSpacing: '0.15em' },
  signalBadge: { fontSize: '0.55rem', fontWeight: 800, border: 'none', padding: '4px 10px', borderRadius: 4, cursor: 'pointer' },
  body: { flex: 1, padding: '24px', overflowY: 'auto' },
  view: { display: 'flex', flexDirection: 'column', gap: 24, animation: 'fadeIn 0.4s ease' },
  title: { fontSize: '2.2rem', fontWeight: 900, lineHeight: 1, letterSpacing: '-0.02em', margin: 0 },
  grid: { display: 'flex', flexDirection: 'column', gap: 12 },
  typeCard: { background: '#111827', border: '1px solid #1f2937', borderRadius: 12, padding: '16px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer', textAlign: 'left', color: '#fff' },
  typeIcon: { fontSize: '1.8rem' },
  typeInfo: { display: 'flex', flexDirection: 'column' },
  typeLabel: { fontSize: '0.9rem', fontWeight: 700 },
  typeSub: { fontSize: '0.7rem', color: '#6b7280' },
  countGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  countBtn: { background: '#111827', border: '1px solid #1f2937', color: '#fff', fontSize: '1.5rem', fontWeight: 800, padding: '24px', borderRadius: 12, cursor: 'pointer' },
  backBtn: { background: 'none', border: 'none', color: '#6b7280', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', alignSelf: 'center' },
  inferenceView: { display: 'flex', flexDirection: 'column', gap: 30, alignItems: 'center', justifyContent: 'center', height: '100%' },
  scanner: { width: '100%', height: 100, background: '#111827', borderRadius: 12, border: '1px solid #1f2937', position: 'relative', overflow: 'hidden' },
  scanLine: { position: 'absolute', top: 0, width: '100%', height: 2, background: '#4a9eff', boxShadow: '0 0 10px #4a9eff' },
  terminal: { width: '100%', background: '#000', padding: '16px', borderRadius: 8, border: '1px solid #1f2937', fontFamily: "'JetBrains Mono'", fontSize: '0.65rem' },
  termLine: { color: '#10b981', opacity: 0.8, marginBottom: 4 },
  reviewCard: { background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', borderRadius: 16, border: '1px solid #334155', padding: '24px' },
  reviewHeader: { display: 'flex', justifyContent: 'space-between', fontSize: '0.55rem', fontWeight: 800, color: '#64748b', marginBottom: 16, letterSpacing: '0.1em' },
  reviewType: { fontSize: '1.5rem', fontWeight: 900, marginBottom: 4 },
  reviewCount: { fontSize: '0.9rem', color: '#94a3b8' },
  packetInfo: { background: '#000', padding: '16px', borderRadius: 12, border: '1px solid #1f2937' },
  packetLabel: { fontSize: '0.55rem', fontWeight: 800, color: '#4b5563', marginBottom: 8, letterSpacing: '0.1em' },
  packetData: { fontFamily: "'JetBrains Mono'", fontSize: '0.9rem', color: '#4a9eff', fontWeight: 700 },
  resultView: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', gap: 20 },
  successCircle: { width: 72, height: 72, background: '#10b981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem' },
  bufferCircle: { width: 72, height: 72, background: '#f59e0b', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem' },
  resultTitle: { fontSize: '1.8rem', fontWeight: 900, margin: 0 },
  resultSub: { fontSize: '0.9rem', color: '#6b7280', maxWidth: 240 },
  finishBtn: { background: 'rgba(255,255,255,0.05)', border: '1px solid #1f2937', color: '#fff', padding: '12px 32px', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }
};
