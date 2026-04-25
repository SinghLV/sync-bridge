import React, { useState } from 'react';
import VictimApp from './components/VictimApp.jsx';
import RescueDashboard from './components/RescueDashboard.jsx';

export default function App() {
  const [view, setView]             = useState('split');     // split | victim | dashboard
  const [dashRefresh, setRefresh]   = useState(0);

  function handlePacketSent() {
    setRefresh(r => r + 1);
  }

  return (
    <div style={styles.root}>
      {/* Top Navigation */}
      <nav style={styles.nav}>
        <div style={styles.brand}>
          <div style={styles.brandIcon}>⚡</div>
          <div>
            <div style={styles.brandName}>Sync Bridge</div>
            <div style={styles.brandTag}>When Networks Fail, Communication Survives</div>
          </div>
        </div>
        <div style={styles.navTabs}>
          {[
            { id: 'victim',    icon: '📱', label: 'Victim App' },
            { id: 'split',     icon: '⚡', label: 'Split Demo' },
            { id: 'dashboard', icon: '🛡', label: 'Rescue Ops' },
          ].map(tab => (
            <button
              key={tab.id}
              style={{ ...styles.tab, ...(view === tab.id ? styles.tabActive : {}) }}
              onClick={() => setView(tab.id)}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
        <div style={styles.navRight}>
          <div style={styles.hackBadge}>🏆 Google Hackathon 2026</div>
        </div>
      </nav>

      {/* Demo Banner */}
      <div style={styles.demoBanner}>
        <span style={styles.demoIcon}>💡</span>
        <span>
          <strong>Live Demo:</strong> Use the victim app to send a SOS → toggle airplane mode → watch the queue → restore network → see dashboard update in real-time.
        </span>
      </div>

      {/* Main Content */}
      <main style={styles.main}>
        {view === 'split' && (
          <div style={styles.splitLayout}>
            {/* Phone mockup for victim app */}
            <div style={styles.phonePanel}>
              <div style={styles.phoneMockup}>
                <div style={styles.phoneSpeaker} />
                <div style={styles.phoneScreen}>
                  <VictimApp onPacketSent={handlePacketSent} />
                </div>
                <div style={styles.phoneHome} />
              </div>
              <div style={styles.phoneLabel}>📱 Victim Client — Offline-First Mobile App</div>
            </div>

            {/* Divider */}
            <div style={styles.divider}>
              <div style={styles.dividerLine} />
              <div style={styles.dividerIcon}>⚡</div>
              <div style={styles.dividerLine} />
              <div style={styles.dividerLabel}>SYNC</div>
            </div>

            {/* Dashboard */}
            <div style={styles.dashPanel}>
              <RescueDashboard refreshTrigger={dashRefresh} />
            </div>
          </div>
        )}

        {view === 'victim' && (
          <div style={styles.centered}>
            <div style={styles.phoneMockupLarge}>
              <div style={styles.phoneSpeaker} />
              <div style={styles.phoneScreenLarge}>
                <VictimApp onPacketSent={handlePacketSent} />
              </div>
              <div style={styles.phoneHome} />
            </div>
          </div>
        )}

        {view === 'dashboard' && (
          <div style={styles.fullDash}>
            <RescueDashboard refreshTrigger={dashRefresh} />
          </div>
        )}
      </main>

      {/* Architecture Footer */}
      <div style={styles.footer}>
        <ArchStep icon="💬" label="User Input" />
        <Arrow />
        <ArchStep icon="🧠" label="Edge AI" highlight />
        <Arrow />
        <ArchStep icon="📦" label="Packet Encode" />
        <Arrow />
        <ArchStep icon="💾" label="Local Queue" />
        <Arrow />
        <ArchStep icon="📡" label="Network Detect" />
        <Arrow />
        <ArchStep icon="☁" label="Cloud Sync" />
        <Arrow />
        <ArchStep icon="🗺" label="Dashboard" highlight />
      </div>
    </div>
  );
}

function ArchStep({ icon, label, highlight }) {
  return (
    <div style={{ ...styles.archStep, ...(highlight ? styles.archStepHL : {}) }}>
      <span style={styles.archIcon}>{icon}</span>
      <span style={styles.archLabel}>{label}</span>
    </div>
  );
}

function Arrow() {
  return <div style={styles.arrow}>→</div>;
}

const styles = {
  root: { display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'var(--bg-primary)' },

  nav: { display: 'flex', alignItems: 'center', padding: '10px 24px', gap: 20, background: 'rgba(5,8,16,0.95)', borderBottom: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)', zIndex: 10, flexShrink: 0 },
  brand: { display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 },
  brandIcon: { width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#4a9eff,#9b7fe8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', boxShadow: '0 0 20px rgba(74,158,255,0.3)' },
  brandName: { fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: '1.05rem', background: 'linear-gradient(135deg,#63b3ed,#b794f4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  brandTag: { fontSize: '0.6rem', color: '#2a3450', letterSpacing: '0.05em' },

  navTabs: { display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 4, border: '1px solid rgba(255,255,255,0.06)' },
  tab: { display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 7, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '0.78rem', color: '#4a5878', fontWeight: 500, fontFamily: "'Inter', sans-serif", transition: 'all 0.2s' },
  tabActive: { background: 'rgba(74,158,255,0.15)', color: '#4a9eff', fontWeight: 700, boxShadow: '0 0 0 1px rgba(74,158,255,0.3)' },

  navRight: { marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 },
  hackBadge: { fontSize: '0.7rem', background: 'linear-gradient(135deg,rgba(74,158,255,0.15),rgba(155,127,232,0.15))', border: '1px solid rgba(74,158,255,0.25)', borderRadius: 20, padding: '4px 12px', color: '#8899bb', fontWeight: 600 },

  demoBanner: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 24px', background: 'rgba(74,158,255,0.05)', borderBottom: '1px solid rgba(74,158,255,0.1)', fontSize: '0.73rem', color: '#8899bb', flexShrink: 0 },
  demoIcon: { fontSize: '1rem', flexShrink: 0 },

  main: { flex: 1, overflow: 'hidden', position: 'relative' },

  splitLayout: { display: 'flex', height: '100%' },
  phonePanel: { width: 380, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(5,8,16,0.5)', gap: 12 },
  phoneMockup: { display: 'flex', flexDirection: 'column', width: 320, background: '#0a0f1e', borderRadius: 36, overflow: 'hidden', border: '2px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05), 0 0 40px rgba(74,158,255,0.08)', height: '85vh', maxHeight: 680 },
  phoneSpeaker: { height: 4, width: 50, background: 'rgba(255,255,255,0.12)', borderRadius: 2, margin: '10px auto 0' },
  phoneScreen: { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  phoneHome: { height: 4, width: 100, background: 'rgba(255,255,255,0.12)', borderRadius: 2, margin: '8px auto 12px' },
  phoneLabel: { fontSize: '0.7rem', color: '#4a5878', textAlign: 'center' },

  phoneMockupLarge: { display: 'flex', flexDirection: 'column', width: 390, background: '#0a0f1e', borderRadius: 40, overflow: 'hidden', border: '2px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 80px rgba(0,0,0,0.7), 0 0 60px rgba(74,158,255,0.1)', height: '90vh', maxHeight: 820 },
  phoneScreenLarge: { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' },

  divider: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 10px', gap: 6 },
  dividerLine: { flex: 1, width: 1, background: 'linear-gradient(to bottom, transparent, rgba(74,158,255,0.3), transparent)' },
  dividerIcon: { fontSize: '1rem', width: 32, height: 32, borderRadius: '50%', background: 'rgba(74,158,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(74,158,255,0.25)', animation: 'glow-pulse 2s ease-in-out infinite' },
  dividerLabel: { fontSize: '0.55rem', color: '#2a3450', letterSpacing: '0.15em', fontFamily: "'JetBrains Mono', monospace", writingMode: 'vertical-rl' },

  dashPanel: { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' },

  centered: { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(ellipse at center, rgba(74,158,255,0.04) 0%, transparent 60%)' },
  fullDash: { height: '100%', display: 'flex', flexDirection: 'column' },

  footer: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '8px 20px', background: 'rgba(5,8,16,0.9)', borderTop: '1px solid rgba(255,255,255,0.05)', flexShrink: 0, overflowX: 'auto' },
  archStep: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '4px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 },
  archStepHL: { background: 'rgba(74,158,255,0.08)', border: '1px solid rgba(74,158,255,0.2)' },
  archIcon: { fontSize: '0.9rem' },
  archLabel: { fontSize: '0.58rem', color: '#4a5878', whiteSpace: 'nowrap', fontFamily: "'JetBrains Mono', monospace" },
  arrow: { color: '#2a3450', fontSize: '0.8rem', flexShrink: 0 },
};
