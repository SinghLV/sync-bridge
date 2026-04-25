import React, { useState, useEffect, useRef } from 'react';
import { classifyMessage, SEVERITY_LABELS } from '../utils/classifier.js';
import { encodePacket, getCompressionStats } from '../utils/packetEncoder.js';
import { enqueue, getQueue, markSynced, getSynced } from '../utils/offlineQueue.js';
import { isOnline, watchNetwork, simulateSync } from '../utils/networkMonitor.js';
import SOSButton from './SOSButton.jsx';
import StatusBar from './StatusBar.jsx';

const DEMO_SCENARIOS = [
  "I'm trapped under debris on the 3rd floor. My companion is bleeding badly and unconscious. We need help immediately.",
  "Building collapsed. Two of us are stuck. I have a broken leg and cannot move.",
  "Flood water rising fast. There are 4 people here including elderly. Cannot exit safely.",
  "Earthquake. I'm buried under rubble. Severe pain in my chest. Please send help.",
  "Family of 3 trapped in elevator. No injuries but fire on floor below. Smoke visible.",
];

export default function VictimApp({ onPacketSent }) {
  const [online, setOnline]           = useState(isOnline());
  const [simOffline, setSimOffline]   = useState(false);
  const [message, setMessage]         = useState('');
  const [phase, setPhase]             = useState('idle');
  const [classification, setClass]    = useState(null);
  const [packet, setPacket]           = useState(null);
  const [compressionStats, setStats]  = useState(null);
  const [queue, setQueue]             = useState(getQueue());
  const [syncing, setSyncing]         = useState(false);
  const [history, setHistory]         = useState(getSynced());
  const [demoIdx, setDemoIdx]         = useState(0);
  const textRef = useRef(null);

  const effectiveOnline = online && !simOffline;

  useEffect(() => {
    const cleanup = watchNetwork(() => setOnline(true), () => setOnline(false));
    return cleanup;
  }, []);

  useEffect(() => {
    const pending = getQueue();
    if (effectiveOnline && pending.length > 0 && !syncing) {
      triggerSync(pending);
    }
  }, [effectiveOnline]);

  async function triggerSync(pending = getQueue()) {
    if (pending.length === 0 || syncing) return;
    setSyncing(true);
    setPhase('syncing');
    await simulateSync(
      pending,
      (id) => { markSynced(id); setQueue(getQueue()); setHistory(getSynced()); },
      () => {
        setSyncing(false);
        setPhase('sent');
        setHistory(getSynced());
        onPacketSent && onPacketSent(getSynced());
        setTimeout(() => setPhase('idle'), 3000);
      }
    );
  }

  function handleClassify() {
    if (!message.trim()) return;
    setPhase('classifying');
    setTimeout(() => {
      const cls   = classifyMessage(message);
      const pkt   = encodePacket(cls, 'U-' + Math.random().toString(36).slice(2,5).toUpperCase());
      const stats = getCompressionStats(message, pkt.packet);
      setClass(cls); setPacket(pkt); setStats(stats);
      setPhase('classified');
    }, 1400);
  }

  function handleQueueOrSend() {
    if (!packet) return;
    const newQueue = enqueue(packet);
    setQueue(newQueue);
    onPacketSent && onPacketSent(getSynced());
    if (effectiveOnline) { triggerSync(newQueue); } else { setPhase('queued'); }
  }

  function handleReset() {
    setMessage(''); setClass(null); setPacket(null); setStats(null); setPhase('idle');
    setTimeout(() => textRef.current?.focus(), 100);
  }

  function loadDemo() {
    setMessage(DEMO_SCENARIOS[demoIdx % DEMO_SCENARIOS.length]);
    setDemoIdx(d => d + 1); setPhase('idle'); setClass(null); setPacket(null); setStats(null);
    setTimeout(() => textRef.current?.focus(), 100);
  }

  const pending = queue.length;
  const sev = classification ? SEVERITY_LABELS[classification.severity] : null;

  return (
    <div style={S.container}>
      <div style={S.header}>
        <div style={S.logo}>
          <div style={S.logoIcon}>⚡</div>
          <div>
            <div style={S.logoName}>Sync Bridge</div>
            <div style={S.logoTag}>Victim Client v1.0</div>
          </div>
        </div>
        <StatusBar online={effectiveOnline} syncing={syncing} pending={pending} sent={history.length} />
      </div>

      {/* Offline Simulator */}
      <div style={S.simBar}>
        <span style={S.simLabel}>✈ Mode:</span>
        <button
          style={{ ...S.toggle, background: simOffline ? '#ff3d55' : '#30d158' }}
          onClick={() => setSimOffline(v => !v)}
        >
          {simOffline ? '📵 OFFLINE (Airplane Mode)' : '📶 ONLINE — Tap to simulate outage'}
        </button>
        {!effectiveOnline && pending > 0 && (
          <button style={S.syncBtn} onClick={() => setSimOffline(false)}>↑ Restore & Sync</button>
        )}
      </div>

      <div style={S.panel}>
        {/* Step 1 */}
        <div style={S.section}>
          <StepBadge n={1} label="Enter Emergency Message" />
          <textarea
            ref={textRef}
            style={S.textarea}
            placeholder="Describe your emergency... (e.g., I'm trapped under debris, 2 people, need immediate help)"
            value={message}
            onChange={e => { setMessage(e.target.value); setPhase('typing'); }}
            rows={4}
            disabled={phase === 'classifying' || phase === 'syncing'}
          />
          <div style={S.inputActions}>
            <button style={S.demoBtn} onClick={loadDemo}>💡 Load Demo Scenario</button>
            <span style={S.charCount}>{message.length} chars</span>
          </div>
        </div>

        {/* Classify Button */}
        {(phase === 'idle' || phase === 'typing') && message.trim() && (
          <button style={S.classifyBtn} onClick={handleClassify} className="animate-slide-up">
            🧠 Classify with Edge AI (On-Device)
          </button>
        )}

        {/* Classifying */}
        {phase === 'classifying' && (
          <div style={S.classifying} className="animate-fade-in">
            <div style={S.spinner} className="animate-spin" />
            <div style={S.classTitle}>On-Device AI Processing...</div>
            <div style={S.classSub}>No network required · Running locally</div>
            <div style={S.classSteps}>
              {['Scanning keywords', 'Detecting severity', 'Identifying condition', 'Encoding packet'].map((s,i) => (
                <div key={i} style={S.classStep}><span style={{ color: '#30d158' }}>✓</span> {s}</div>
              ))}
            </div>
          </div>
        )}

        {/* Result */}
        {(phase === 'classified' || phase === 'queued' || phase === 'syncing' || phase === 'sent') && classification && (
          <div style={{ ...S.result, borderColor: sev.color + '44', background: sev.color + '0a' }} className="animate-slide-up">
            <StepBadge n={2} label="Edge AI Classification Result" />
            <div style={{ ...S.sevBadge, background: sev.color + '22', border: `1px solid ${sev.color}55` }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: sev.color, animation: 'pulse-dot 1.5s infinite' }} />
              <span style={{ color: sev.color, fontWeight: 800, fontSize: '1.05rem', letterSpacing: '0.1em' }}>
                {sev.icon} {sev.label}
              </span>
              <span style={S.confidence}>AI Confidence: {classification.confidence}%</span>
            </div>

            <div style={S.grid}>
              <DetailItem label="Condition"     value={condLabel(classification.condition)} />
              <DetailItem label="People"        value={`${classification.people_count} Person${classification.people_count > 1?'s':''}`} />
              <DetailItem label="Location Zone" value={`Zone L${classification.zone}`} />
              <DetailItem label="Keywords"      value={classification.keywords_matched.join(', ') || 'General'} />
            </div>

            <StepBadge n={3} label="Micro-Packet Generated" />
            <div style={S.packetBox}>
              <div style={S.packetStr}>{packet?.packet}</div>
              <div style={S.breakdown}>
                {packet?.packet.split('-').map((t,i) => (
                  <div key={i} style={S.tokenPill}>
                    <span style={S.tokenCode}>{t}</span>
                    <span style={S.tokenLabel}>{tokenMeaning(t,i)}</span>
                  </div>
                ))}
              </div>
              {compressionStats && (
                <div style={S.compBar}>
                  <CompStat label="Original" value={compressionStats.originalBytes + 'B'} />
                  <span style={{ color: '#2a3450' }}>→</span>
                  <CompStat label="Packet" value={compressionStats.packetBytes + 'B'} green />
                  <div style={{ textAlign: 'center', marginLeft: 8 }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#30d158', fontFamily: "'JetBrains Mono'" }}>{compressionStats.compressionPct}%</div>
                    <div style={{ fontSize: '0.58rem', color: '#4a5878' }}>smaller</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        {phase === 'classified' && (
          <div style={S.actionRow} className="animate-slide-up">
            {effectiveOnline
              ? <SOSButton onClick={handleQueueOrSend} label="🚀 Sync to Cloud Now" color="#4a9eff" />
              : <SOSButton onClick={handleQueueOrSend} label="📥 Queue Offline" color="#ff9500" />
            }
            <button style={S.resetBtn} onClick={handleReset}>✕</button>
          </div>
        )}

        {/* Queued */}
        {phase === 'queued' && (
          <div style={S.infoBox('#ff9500')} className="animate-fade-in">
            <div style={{ fontSize: '2rem' }}>📥</div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#ff9500' }}>Message Queued Offline</div>
            <div style={S.infoSub}>Saved locally. Will sync the moment network is detected.</div>
            <div style={{ fontSize: '0.7rem', color: '#ff9500', background: 'rgba(255,149,0,0.1)', padding: '3px 12px', borderRadius: 20 }}>{pending} message{pending!==1?'s':''} queued</div>
            <button style={S.resetBtn} onClick={handleReset}>Send Another</button>
          </div>
        )}

        {/* Syncing */}
        {phase === 'syncing' && (
          <div style={S.infoBox('#4a9eff')} className="animate-fade-in">
            <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(74,158,255,0.2)', borderTopColor: '#4a9eff' }} className="animate-spin" />
            <div style={{ fontWeight: 700, color: '#4a9eff' }}>Syncing to Cloud...</div>
            <div style={S.infoSub}>Transmitting packets to Firebase</div>
          </div>
        )}

        {/* Sent */}
        {phase === 'sent' && (
          <div style={S.infoBox('#30d158')} className="animate-slide-up">
            <div style={{ fontSize: '2.5rem' }}>✅</div>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#30d158' }}>Successfully Synced!</div>
            <div style={S.infoSub}>Rescue dashboard updated. Response team alerted.</div>
            <button style={S.classifyBtn} onClick={handleReset}>Send Another SOS</button>
          </div>
        )}

        {/* Queue Summary */}
        {(queue.length > 0 || history.length > 0) && phase === 'idle' && (
          <div style={S.queueSummary}>
            <div style={{ fontSize: '0.72rem', color: '#8899bb', marginBottom: 8, fontWeight: 600 }}>📋 Message Queue</div>
            <div style={{ display: 'flex', gap: 20 }}>
              <QueueStat num={queue.length}   label="Pending" color="#ff9500" />
              <QueueStat num={history.length} label="Synced"  color="#30d158" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StepBadge({ n, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg,#4a9eff,#9b7fe8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, color: '#fff', flexShrink: 0 }}>{n}</div>
      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#8899bb', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '8px 12px' }}>
      <div style={{ fontSize: '0.62rem', color: '#4a5878', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: '0.8rem', color: '#f0f4ff', fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function CompStat({ label, value, green }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: green ? '#30d158' : '#f0f4ff', fontFamily: "'JetBrains Mono'" }}>{value}</div>
      <div style={{ fontSize: '0.58rem', color: '#4a5878', textTransform: 'uppercase' }}>{label}</div>
    </div>
  );
}

function QueueStat({ num, label, color }) {
  return (
    <div>
      <div style={{ fontSize: '1.4rem', fontWeight: 800, color, fontFamily: "'JetBrains Mono'" }}>{num}</div>
      <div style={{ fontSize: '0.62rem', color: '#4a5878', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
    </div>
  );
}

function condLabel(c) {
  const m = { trapped_injured:'Trapped + Injured', trapped_uninjured:'Trapped (Stable)', medical:'Medical Emergency', fire:'Fire Emergency', flood:'Flood / Rising Water', general:'General Emergency' };
  return m[c] || c;
}

function tokenMeaning(t, i) {
  const m = { C1:'Critical',C2:'Urgent',C3:'Safe',TI:'Trapped+Injured',TU:'Trapped',MH:'Medical',FI:'Fire',FL:'Flood',GE:'General' };
  if (m[t]) return m[t];
  if (t.startsWith('P')) return `${t.slice(1)} Person(s)`;
  if (t.startsWith('L')) return `Zone ${t.slice(1)}`;
  return t;
}

const S = {
  container: { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', fontFamily: "'Inter', sans-serif" },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(10,15,30,0.95)', flexShrink: 0 },
  logo: { display: 'flex', alignItems: 'center', gap: 8 },
  logoIcon: { fontSize: '1.2rem', background: 'linear-gradient(135deg,#4a9eff,#9b7fe8)', width: 32, height: 32, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  logoName: { fontFamily: "'Space Grotesk'", fontWeight: 700, fontSize: '0.95rem', color: '#f0f4ff' },
  logoTag: { fontSize: '0.6rem', color: '#4a5878', fontFamily: "'JetBrains Mono'" },
  simBar: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.04)', flexWrap: 'wrap', flexShrink: 0 },
  simLabel: { fontSize: '0.65rem', color: '#4a5878', fontFamily: "'JetBrains Mono'", flexShrink: 0 },
  toggle: { padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.68rem', color: '#fff', transition: 'all 0.3s' },
  syncBtn: { padding: '5px 12px', borderRadius: 20, border: '1px solid #4a9eff', background: 'rgba(74,158,255,0.1)', cursor: 'pointer', fontWeight: 600, fontSize: '0.68rem', color: '#4a9eff' },
  panel: { flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 },
  section: { display: 'flex', flexDirection: 'column', gap: 8 },
  textarea: { width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#f0f4ff', fontFamily: "'Inter'", fontSize: '0.86rem', padding: '10px 12px', resize: 'vertical', outline: 'none', lineHeight: 1.6, minHeight: 90 },
  inputActions: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  demoBtn: { padding: '4px 10px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', cursor: 'pointer', fontSize: '0.68rem', color: '#8899bb' },
  charCount: { fontSize: '0.65rem', color: '#4a5878', fontFamily: "'JetBrains Mono'" },
  classifyBtn: { padding: '13px', borderRadius: 11, border: 'none', background: 'linear-gradient(135deg,#4a9eff,#9b7fe8)', cursor: 'pointer', fontWeight: 700, fontSize: '0.86rem', color: '#fff', fontFamily: "'Inter'" },
  classifying: { background: 'rgba(74,158,255,0.06)', border: '1px solid rgba(74,158,255,0.2)', borderRadius: 12, padding: '18px', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', textAlign: 'center' },
  spinner: { width: 32, height: 32, borderRadius: '50%', border: '3px solid rgba(74,158,255,0.2)', borderTopColor: '#4a9eff' },
  classTitle: { fontWeight: 700, fontSize: '0.9rem', color: '#4a9eff' },
  classSub: { fontSize: '0.68rem', color: '#4a5878', fontFamily: "'JetBrains Mono'" },
  classSteps: { display: 'flex', flexWrap: 'wrap', gap: '5px 14px', justifyContent: 'center' },
  classStep: { fontSize: '0.68rem', color: '#30d158', display: 'flex', alignItems: 'center', gap: 4 },
  result: { borderRadius: 12, border: '1px solid', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 },
  sevBadge: { borderRadius: 9, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8 },
  confidence: { marginLeft: 'auto', fontSize: '0.68rem', color: '#8899bb', fontFamily: "'JetBrains Mono'" },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 },
  packetBox: { background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 },
  packetStr: { fontSize: '1.4rem', fontWeight: 800, letterSpacing: '0.15em', color: '#4a9eff', textAlign: 'center', fontFamily: "'JetBrains Mono'" },
  breakdown: { display: 'flex', gap: 5, justifyContent: 'center', flexWrap: 'wrap' },
  tokenPill: { background: 'rgba(255,255,255,0.06)', borderRadius: 7, padding: '4px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 },
  tokenCode: { fontSize: '0.8rem', color: '#f0f4ff', fontWeight: 700, fontFamily: "'JetBrains Mono'" },
  tokenLabel: { fontSize: '0.58rem', color: '#4a5878' },
  compBar: { display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '8px 12px' },
  actionRow: { display: 'flex', gap: 10, alignItems: 'center' },
  resetBtn: { padding: '10px 16px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', cursor: 'pointer', color: '#8899bb', fontSize: '0.8rem', flexShrink: 0, fontFamily: "'Inter'" },
  infoBox: (c) => ({ background: c + '08', border: `1px solid ${c}33`, borderRadius: 12, padding: '18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center' }),
  infoSub: { fontSize: '0.76rem', color: '#8899bb', maxWidth: 260 },
  queueSummary: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '12px 14px' },
};
