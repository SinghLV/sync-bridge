import React, { useState, useEffect, useRef } from 'react';
import { classifyMessage, SEVERITY_LABELS } from '../../services/classifier.js';
import { encodePacket } from '../../services/packetEncoder.js';
import { enqueue, getQueue, markSynced, getSynced } from '../../services/offlineQueue.js';
import { isOnline, watchNetwork, simulateSync } from '../../services/networkMonitor.js';
import SOSButton from './SOSButton.jsx';

const TRIAGE_STEPS = [
  { id: 'condition', title: 'What is the situation?', options: [
    { id: 'TI', label: 'Trapped & Injured', icon: '🆘', sev: 'critical' },
    { id: 'TU', label: 'Trapped (Safe)', icon: '🏚️', sev: 'urgent' },
    { id: 'MH', label: 'Medical Emergency', icon: '🏥', sev: 'critical' },
    { id: 'FI', label: 'Fire / Smoke', icon: '🔥', sev: 'critical' },
    { id: 'FL', label: 'Flood / Water', icon: '🌊', sev: 'urgent' },
    { id: 'GE', label: 'General Help', icon: '🙋', sev: 'standard' },
  ]},
  { id: 'people', title: 'How many people?', options: [
    { id: 1, label: 'Just Me', icon: '👤' },
    { id: 2, label: 'Two People', icon: '👥' },
    { id: 5, label: 'Small Group (3-5)', icon: '👨‍👩‍👧' },
    { id: 9, label: 'Large Group (5+)', icon: '🏢' },
  ]}
];

export default function VictimApp({ onPacketSent }) {
  const [online, setOnline] = useState(isOnline());
  const [simOffline, setSimOffline] = useState(false);
  const [batterySaver, setBatterySaver] = useState(false);
  const [step, setStep] = useState(0); // 0: Triage, 1: People, 2: Review/Send
  const [selections, setSelections] = useState({ condition: null, people: null });
  const [phase, setPhase] = useState('idle');
  const [packet, setPacket] = useState(null);
  const [syncing, setSyncing] = useState(false);
  
  const effectiveOnline = online && !simOffline;

  useEffect(() => {
    const cleanup = watchNetwork(() => setOnline(true), () => setOnline(false));
    return cleanup;
  }, []);

  const handleSelect = (key, val) => {
    const newSelections = { ...selections, [key]: val };
    setSelections(newSelections);
    
    if (step < TRIAGE_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      processTriage(newSelections);
    }
  };

  const processTriage = (finalSelections) => {
    setPhase('processing');
    setTimeout(() => {
      const mockCls = {
        severity: finalSelections.condition.sev,
        severity_code: finalSelections.condition.sev === 'critical' ? 'C1' : 'C2',
        people_count: finalSelections.people.id,
        condition_code: finalSelections.condition.id,
        zone: Math.floor(Math.random() * 9) + 1,
        timestamp: new Date().toISOString()
      };
      const pkt = encodePacket(mockCls, 'U-' + Math.random().toString(36).slice(2,5).toUpperCase());
      setPacket(pkt);
      setPhase('ready');
      setStep(2);
    }, 1000);
  };

  const handleSend = () => {
    enqueue(packet);
    if (effectiveOnline) {
      setSyncing(true);
      simulateSync([packet], (id) => markSynced(id), () => {
        setSyncing(false);
        setPhase('sent');
        onPacketSent && onPacketSent();
      });
    } else {
      setPhase('queued');
    }
  };

  return (
    <div className={`phone-frame ${batterySaver ? 'battery-saver' : ''}`} style={S.phoneFrame}>
      <div style={S.container}>
        <div style={S.header}>
          <div style={S.logo}>⚡ SYNC BRIDGE</div>
          <div style={S.signalGrp}>
             <span style={{ fontSize: '0.6rem', color: effectiveOnline ? '#30d158' : '#ff3d55' }}>
               {effectiveOnline ? 'MESH ACTIVE' : 'OFFLINE'}
             </span>
             <button style={S.miniBtn} onClick={() => setSimOffline(!simOffline)}>📡</button>
          </div>
        </div>

        <div style={S.content}>
          {phase === 'sent' ? (
            <div style={S.successView} className="animate-fade-in">
              <div style={S.bigCheck}>✓</div>
              <h2 style={S.successTitle}>SOS BROADCASTED</h2>
              <p style={S.successSub}>Your location and status are being relayed through the mesh network.</p>
              <button style={S.resetBtn} onClick={() => { setStep(0); setPhase('idle'); }}>New Report</button>
            </div>
          ) : phase === 'queued' ? (
            <div style={S.queuedView} className="animate-fade-in">
              <div style={S.bigIcon}>📥</div>
              <h2 style={S.queueTitle}>QUEUED FOR RELAY</h2>
              <p style={S.successSub}>No signal detected. Packet stored in local buffer. Will auto-sync when a bridge node is in range.</p>
              <button style={S.resetBtn} onClick={() => { setStep(0); setPhase('idle'); }}>Back</button>
            </div>
          ) : step < 2 ? (
            <div className="animate-slide-up">
              <div style={S.progress}>Step {step + 1} of 2</div>
              <h2 style={S.stepTitle}>{TRIAGE_STEPS[step].title}</h2>
              <div style={S.optionsGrid}>
                {TRIAGE_STEPS[step].options.map(opt => (
                  <button key={opt.id} style={S.optionCard} onClick={() => handleSelect(TRIAGE_STEPS[step].id, opt)}>
                    <div style={S.optionIcon}>{opt.icon}</div>
                    <div style={S.optionLabel}>{opt.label}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="animate-slide-up" style={S.reviewView}>
              <h2 style={S.stepTitle}>Review & Send</h2>
              <div style={S.summaryCard}>
                <div style={S.summaryRow}><span>STATUS</span> <b>{selections.condition.label}</b></div>
                <div style={S.summaryRow}><span>PEOPLE</span> <b>{selections.people.label}</b></div>
                <div style={S.summaryRow}><span>SEVERITY</span> <b style={{ color: SEVERITY_LABELS[packet.severity].color }}>{packet.severity.toUpperCase()}</b></div>
              </div>
              
              <div style={S.packetBox}>
                <div style={S.packetLabel}>MICRO-PACKET (12 BYTES)</div>
                <div style={S.packetVal}>{packet.packet}</div>
              </div>

              <SOSButton 
                label={effectiveOnline ? "BROADCAST SOS" : "QUEUE OFFLINE"} 
                color={effectiveOnline ? "#ff3d55" : "#ff9500"}
                onClick={handleSend}
                loading={syncing}
              />
              <button style={S.backLink} onClick={() => setStep(0)}>Edit Information</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const S = {
  phoneFrame: { width: '100%', height: '100%', background: '#05070a', position: 'relative', overflow: 'hidden' },
  container: { height: '100%', display: 'flex', flexDirection: 'column' },
  header: { padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' },
  logo: { fontFamily: "'Space Grotesk'", fontWeight: 900, fontSize: '0.8rem', letterSpacing: '0.1em', color: '#4a9eff' },
  signalGrp: { display: 'flex', alignItems: 'center', gap: 8 },
  miniBtn: { background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 4, padding: '2px 4px', cursor: 'pointer' },
  content: { flex: 1, padding: '20px', display: 'flex', flexDirection: 'column' },
  progress: { fontSize: '0.6rem', color: '#4a5878', fontWeight: 800, marginBottom: 8 },
  stepTitle: { fontSize: '1.4rem', fontWeight: 800, marginBottom: 24, color: '#f0f4ff' },
  optionsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  optionCard: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, cursor: 'pointer', transition: 'all 0.2s' },
  optionIcon: { fontSize: '2rem' },
  optionLabel: { fontSize: '0.75rem', fontWeight: 700, color: '#8899bb', textAlign: 'center' },
  reviewView: { flex: 1, display: 'flex', flexDirection: 'column', gap: 20 },
  summaryCard: { background: 'rgba(74, 158, 255, 0.05)', border: '1px solid rgba(74, 158, 255, 0.2)', borderRadius: 16, padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 },
  summaryRow: { display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' },
  packetBox: { background: '#000', borderRadius: 12, padding: '16px', border: '1px solid rgba(255,255,255,0.05)' },
  packetLabel: { fontSize: '0.55rem', color: '#4a5878', fontWeight: 800, marginBottom: 8 },
  packetVal: { fontFamily: "'JetBrains Mono'", fontSize: '1rem', color: '#4a9eff', fontWeight: 700 },
  backLink: { background: 'none', border: 'none', color: '#4a5878', fontSize: '0.75rem', cursor: 'pointer', marginTop: 10 },
  successView: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 20 },
  bigCheck: { width: 80, height: 80, background: '#30d158', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', color: '#fff', boxShadow: '0 0 30px rgba(48,209,88,0.3)' },
  successTitle: { fontSize: '1.5rem', fontWeight: 900, color: '#30d158' },
  successSub: { fontSize: '0.9rem', color: '#8899bb', lineHeight: 1.5 },
  resetBtn: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px 24px', borderRadius: 12, color: '#fff', fontWeight: 700, cursor: 'pointer' },
  queuedView: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 20 },
  bigIcon: { fontSize: '4rem' },
  queueTitle: { fontSize: '1.5rem', fontWeight: 900, color: '#ff9500' },
};
