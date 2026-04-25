import React, { useState, useEffect, useRef } from 'react';
import { classifyMessage, SEVERITY_LABELS } from '../utils/classifier.js';
import { encodePacket, getCompressionStats } from '../utils/packetEncoder.js';
import { enqueue, getQueue, markSynced, getSynced } from '../utils/offlineQueue.js';
import { isOnline, watchNetwork, simulateSync } from '../utils/networkMonitor.js';
import SOSButton from './SOSButton.jsx';
import StatusBar from './StatusBar.jsx';

const DEMO_SCENARIOS = [
  "Trapped under debris on 3rd floor. Companion is bleeding and unconscious. Need help NOW.",
  "Flood water rising fast. 4 people trapped on roof including 2 children.",
  "Fire on 2nd floor. Building exit blocked. 3 people trapped in office.",
  "Chest pain and difficulty breathing. Diabetic patient. Need medical assist.",
];

export default function VictimApp({ onPacketSent }) {
  const [online, setOnline] = useState(isOnline());
  const [simOffline, setSimOffline] = useState(false);
  const [batterySaver, setBatterySaver] = useState(false);
  const [signal, setSignal] = useState(100);
  const [message, setMessage] = useState('');
  const [phase, setPhase] = useState('idle');
  const [classification, setClass] = useState(null);
  const [packet, setPacket] = useState(null);
  const [queue, setQueue] = useState(getQueue());
  const [syncing, setSyncing] = useState(false);
  const [history, setHistory] = useState(getSynced());
  
  const effectiveOnline = online && !simOffline;

  useEffect(() => {
    const cleanup = watchNetwork(() => setOnline(true), () => setOnline(false));
    // Simulate signal fluctuation
    const interval = setInterval(() => {
      if (!simOffline) setSignal(Math.floor(Math.random() * 40) + 60);
      else setSignal(0);
    }, 3000);
    return () => { cleanup(); clearInterval(interval); };
  }, [simOffline]);

  const handleClassify = () => {
    if (!message.trim()) return;
    setPhase('classifying');
    setTimeout(() => {
      const cls = classifyMessage(message);
      const pkt = encodePacket(cls, 'U-V' + Math.random().toString(36).slice(2,4).toUpperCase());
      setClass(cls);
      setPacket(pkt);
      setPhase('classified');
    }, 1500);
  };

  const handleSend = () => {
    const newQueue = enqueue(packet);
    setQueue(newQueue);
    if (effectiveOnline) {
      setSyncing(true);
      simulateSync(newQueue, (id) => markSynced(id), () => {
        setSyncing(false);
        setPhase('sent');
        setHistory(getSynced());
        onPacketSent && onPacketSent(getSynced());
      });
    } else {
      setPhase('queued');
    }
  };

  const loadDemo = () => {
    setMessage(DEMO_SCENARIOS[Math.floor(Math.random() * DEMO_SCENARIOS.length)]);
    setPhase('idle'); setClass(null); setPacket(null);
  };

  return (
    <div className={`phone-frame ${batterySaver ? 'battery-saver' : ''}`} style={S.phoneFrame}>
      <div style={S.phoneNotch} />
      
      <div style={S.container}>
        {/* Phone Status Bar */}
        <div style={S.phoneStatus}>
          <div style={S.time}>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          <div style={S.statusIcons}>
            <SignalIcon strength={signal} />
            <div style={S.battery}>
              <div style={{ ...S.batteryLevel, width: batterySaver ? '15%' : '85%', background: batterySaver ? '#ff3d55' : '#30d158' }} />
            </div>
          </div>
        </div>

        <div style={S.header}>
          <div style={S.logo}>⚡ Sync Bridge</div>
          <button 
            style={{ ...S.powerBtn, color: batterySaver ? '#30d158' : '#8899bb' }} 
            onClick={() => setBatterySaver(!batterySaver)}
          >
            {batterySaver ? '🔋 Normal Mode' : '🪫 Battery Saver'}
          </button>
        </div>

        <div style={S.content}>
          <div style={S.simBar}>
            <button 
              style={{ ...S.toggle, background: simOffline ? '#ff3d55' : '#1e293b' }}
              onClick={() => setSimOffline(!simOffline)}
            >
              {simOffline ? '📵 Airplane Mode (No Signal)' : '📶 Connected to Bridge'}
            </button>
          </div>

          <div style={S.inputArea}>
            <div style={S.label}>EMERGENCY MESSAGE</div>
            <textarea 
              style={S.textarea}
              placeholder="What is your emergency?"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={phase === 'classifying' || phase === 'sent'}
            />
            <div style={S.inputActions}>
              <button style={S.demoBtn} onClick={loadDemo}>💡 Demo Idea</button>
              <span style={S.charCount}>{message.length} chars</span>
            </div>
          </div>

          {phase === 'idle' && message.length > 5 && (
            <button style={S.actionBtn} onClick={handleClassify} className="animate-slide-up">
              🧠 Process with Edge AI
            </button>
          )}

          {phase === 'classifying' && (
            <div style={S.processing}>
              <div className="animate-spin" style={S.spinner} />
              <div style={S.procText}>Analyzing Severity...</div>
              <div style={S.procSub}>Running Locally (No Data Required)</div>
            </div>
          )}

          {classification && (
            <div style={S.resultCard} className="animate-slide-up">
              <div style={S.resultHead}>
                <div style={{ ...S.sevTag, color: SEVERITY_LABELS[classification.severity].color }}>
                  {SEVERITY_LABELS[classification.severity].label}
                </div>
                <div style={S.conf}>Conf: {classification.confidence}%</div>
              </div>
              <div style={S.packetStr}>PACKET: <span style={S.packetVal}>{packet.packet}</span></div>
              
              <div style={S.actionRow}>
                <SOSButton 
                  label={effectiveOnline ? "SEND TO RESCUE" : "QUEUE OFFLINE"} 
                  color={effectiveOnline ? "#4a9eff" : "#ff9500"}
                  onClick={handleSend}
                />
              </div>
            </div>
          )}

          {phase === 'sent' && (
            <div style={S.success} className="animate-fade-in">
              <div style={S.check}>✓</div>
              <div style={S.successMsg}>SOS SENT SUCCESSFULLY</div>
              <button style={S.resetBtn} onClick={() => { setPhase('idle'); setMessage(''); setClass(null); }}>Send New SOS</button>
            </div>
          )}

          {phase === 'queued' && (
            <div style={S.queued} className="animate-fade-in">
              <div style={S.queueIcon}>📥</div>
              <div style={S.queueMsg}>QUEUED OFFLINE</div>
              <div style={S.queueSub}>Will sync automatically when signal returns</div>
              <button style={S.resetBtn} onClick={() => { setPhase('idle'); setMessage(''); setClass(null); }}>Back</button>
            </div>
          )}
        </div>

        <div style={S.homeBar} />
      </div>
    </div>
  );
}

function SignalIcon({ strength }) {
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 12 }}>
      {[1, 2, 3, 4].map((bar, i) => (
        <div 
          key={bar} 
          style={{ 
            width: 3, 
            height: (i + 1) * 3, 
            background: strength > (i * 25) ? '#f0f4ff' : 'rgba(255,255,255,0.2)',
            borderRadius: 1
          }} 
        />
      ))}
    </div>
  );
}

const S = {
  phoneFrame: {
    width: '320px',
    height: '640px',
    background: '#000',
    borderRadius: '40px',
    border: '8px solid #1e293b',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
  },
  phoneNotch: {
    position: 'absolute',
    top: 0, left: '50%',
    transform: 'translateX(-50%)',
    width: '120px', height: '25px',
    background: '#1e293b',
    borderRadius: '0 0 15px 15px',
    zIndex: 100,
  },
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    background: '#05070a',
    position: 'relative',
  },
  phoneStatus: {
    padding: '12px 24px 4px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  time: { fontSize: '0.75rem', fontWeight: 700, color: '#f0f4ff' },
  statusIcons: { display: 'flex', gap: 8, alignItems: 'center' },
  battery: { width: 20, height: 10, border: '1px solid rgba(255,255,255,0.3)', borderRadius: 2, padding: 1 },
  batteryLevel: { height: '100%', borderRadius: 1 },
  header: { padding: '20px 20px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  logo: { fontFamily: "'Space Grotesk'", fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.02em' },
  powerBtn: { background: 'none', border: 'none', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer' },
  content: { flex: 1, padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 16 },
  simBar: { background: 'rgba(255,255,255,0.03)', padding: 8, borderRadius: 12 },
  toggle: { width: '100%', padding: '8px', border: 'none', borderRadius: 8, color: '#fff', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' },
  inputArea: { display: 'flex', flexDirection: 'column', gap: 8 },
  label: { fontSize: '0.6rem', color: '#8899bb', fontWeight: 700, letterSpacing: '0.1em' },
  textarea: { 
    background: 'rgba(255,255,255,0.05)', 
    border: '1px solid rgba(255,255,255,0.1)', 
    borderRadius: 12, padding: 12, color: '#f0f4ff',
    height: '120px', resize: 'none', fontFamily: "'Inter'", fontSize: '0.9rem'
  },
  inputActions: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  demoBtn: { background: 'none', border: 'none', color: '#4a9eff', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 600 },
  charCount: { fontSize: '0.6rem', color: '#4a5878' },
  actionBtn: { padding: '14px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #4a9eff, #9b7fe8)', color: '#fff', fontWeight: 800, cursor: 'pointer' },
  processing: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: 20 },
  spinner: { width: 30, height: 30, border: '3px solid rgba(74, 158, 255, 0.2)', borderTopColor: '#4a9eff', borderRadius: '50%' },
  procText: { fontSize: '0.9rem', fontWeight: 700, color: '#4a9eff' },
  procSub: { fontSize: '0.65rem', color: '#4a5878' },
  resultCard: { background: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 16, border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: 12 },
  resultHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  sevTag: { fontSize: '0.9rem', fontWeight: 900, letterSpacing: '0.1em' },
  conf: { fontSize: '0.65rem', color: '#8899bb' },
  packetStr: { fontSize: '0.75rem', color: '#8899bb', fontFamily: "'JetBrains Mono'" },
  packetVal: { color: '#4a9eff', fontWeight: 700 },
  actionRow: { marginTop: 8 },
  success: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 },
  check: { width: 60, height: 60, borderRadius: '50%', background: '#30d158', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', color: '#fff' },
  successMsg: { fontWeight: 800, fontSize: '1rem', color: '#30d158' },
  queued: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 },
  queueIcon: { fontSize: '3rem' },
  queueMsg: { fontWeight: 800, fontSize: '1.2rem', color: '#ff9500' },
  queueSub: { fontSize: '0.8rem', color: '#8899bb', textAlign: 'center' },
  resetBtn: { background: 'rgba(255,255,255,0.1)', border: 'none', padding: '10px 20px', borderRadius: 8, color: '#fff', cursor: 'pointer', marginTop: 10 },
  homeBar: { width: '100px', height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '10px', position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)' },
};
