import React, { useState } from 'react';
import LandingPage from './components/landingPage.jsx';
import VictimApp from './components/victim/VictimApp.jsx';
import RescueDashboard from './components/rescue/RescueDashboard.jsx';

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const initialView = params.get('view') || 'landing';
  
  const [view, setView] = useState(initialView); 
  const [dashRefresh, setRefresh] = useState(0);

  const isStandalone = params.get('view') === 'victim';

  const handlePacketSent = () => setRefresh(r => r + 1);

  if (view === 'landing') return <LandingPage onAction={setView} />;

  return (
    <div style={AppStyles.root}>
      {/* Global Engineering Overlays */}
      <div className="noise-overlay" />
      <div className="scanlines" />
      
      {/* Structural Framing */}
      <div style={AppStyles.frameTL}>[ SYS_REF_A1 ]</div>
      <div style={AppStyles.frameTR}>PRTCL_V.1.0.4</div>
      <div style={AppStyles.frameBL}>// MESH_SYNC_ACTIVE</div>
      <div style={AppStyles.frameBR}>[ 38.8951° N, 77.0364° W ]</div>

      {!isStandalone && (
        <nav style={AppStyles.nav}>
          <div style={AppStyles.brand}>
            <div style={AppStyles.brandName}>SYNC_BRIDGE</div>
            <div style={AppStyles.brandTag}>OFFLINE_SIGNAL_PERSISTENCE</div>
          </div>
          <div style={AppStyles.navTabs}>
            {[
              { id: 'victim', label: 'BEACON_MODE' },
              { id: 'split', label: 'DUAL_UPLINK_DEMO' },
              { id: 'dashboard', label: 'COMMAND_CENTER' },
            ].map(tab => (
              <button
                key={tab.id}
                style={{ ...AppStyles.tab, ...(view === tab.id ? AppStyles.tabActive : {}) }}
                onClick={() => setView(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </nav>
      )}

      <main style={AppStyles.main}>
        {view === 'split' && (
          <div style={AppStyles.splitLayout}>
            <div style={AppStyles.phonePanel}>
              <div style={AppStyles.phoneMockup}>
                <div style={AppStyles.phoneSpeaker} />
                <div style={AppStyles.phoneScreen}>
                  <VictimApp onPacketSent={handlePacketSent} />
                </div>
              </div>
              <div style={AppStyles.label}>MOBILE_UPLINK_STATION_01</div>
            </div>

            <div style={AppStyles.divider}>
              <div style={AppStyles.dividerLine} />
              <div style={AppStyles.dividerLabel}>CORE_RELAY</div>
              <div style={AppStyles.dividerLine} />
            </div>

            <div style={AppStyles.dashPanel}>
              <RescueDashboard refreshTrigger={dashRefresh} />
            </div>
          </div>
        )}

        {view === 'victim' && (
          <div style={AppStyles.centered}>
            <div style={AppStyles.phoneMockupLarge}>
              <div style={AppStyles.phoneScreenLarge}>
                <VictimApp onPacketSent={handlePacketSent} />
              </div>
            </div>
          </div>
        )}

        {view === 'dashboard' && (
          <div style={AppStyles.fullDash}>
            <RescueDashboard refreshTrigger={dashRefresh} />
          </div>
        )}
      </main>

      {!isStandalone && (
        <footer style={AppStyles.footer}>
          <div style={AppStyles.pathLabel}>PATH:</div>
          <PathStep label="USER_INPUT" />
          <PathStep label="EDGE_AI_INFERENCE" active />
          <PathStep label="PACKET_ENCODE" />
          <PathStep label="MESH_QUEUE" />
          <PathStep label="CLOUD_SYNCHRONIZATION" />
          <PathStep label="TACTICAL_DISPLAY" active />
        </footer>
      )}
    </div>
  );
}

function PathStep({ label, active }) {
  return (
    <div style={{ ...AppStyles.pathStep, color: active ? '#3b82f6' : '#475569' }}>
      {active && <span style={AppStyles.activeDot} />}
      {label}
    </div>
  );
}

const AppStyles = {
  root: { height: '100vh', width: '100vw', background: '#05070a', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' },
  frameTL: { position: 'fixed', top: 12, left: 16, fontSize: '0.55rem', color: '#1e293b', fontWeight: 800, zIndex: 100, fontFamily: '"JetBrains Mono"' },
  frameTR: { position: 'fixed', top: 12, right: 16, fontSize: '0.55rem', color: '#1e293b', fontWeight: 800, zIndex: 100, fontFamily: '"JetBrains Mono"' },
  frameBL: { position: 'fixed', bottom: 12, left: 16, fontSize: '0.55rem', color: '#1e293b', fontWeight: 800, zIndex: 100, fontFamily: '"JetBrains Mono"' },
  frameBR: { position: 'fixed', bottom: 12, right: 16, fontSize: '0.55rem', color: '#1e293b', fontWeight: 800, zIndex: 100, fontFamily: '"JetBrains Mono"' },
  
  nav: { display: 'flex', alignItems: 'center', padding: '24px 32px', gap: 40, borderBottom: '1px solid rgba(255,255,255,0.03)', zIndex: 10 },
  brand: { display: 'flex', flexDirection: 'column' },
  brandName: { fontSize: '1.2rem', fontWeight: 900, letterSpacing: '0.05em', color: '#fff', fontFamily: '"Space Grotesk"' },
  brandTag: { fontSize: '0.55rem', color: '#475569', fontWeight: 800, letterSpacing: '0.1em' },
  
  navTabs: { display: 'flex', background: '#0a0c10', padding: 4, borderRadius: 4, border: '1px solid #1f2937' },
  tab: { background: 'none', border: 'none', color: '#475569', padding: '8px 16px', fontSize: '0.65rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s' },
  tabActive: { background: '#1f2937', color: '#fff' },
  
  main: { flex: 1, overflow: 'hidden', position: 'relative' },
  splitLayout: { display: 'flex', height: '100%', padding: '0 32px 32px 32px', gap: 32 },
  phonePanel: { width: 340, display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', justifyContent: 'center' },
  phoneMockup: { width: '100%', height: '85%', background: '#000', borderRadius: 24, border: '1px solid #1f2937', padding: 12, display: 'flex', flexDirection: 'column', boxShadow: '0 0 40px rgba(0,0,0,0.5)' },
  phoneSpeaker: { height: 4, width: 40, background: '#1f2937', borderRadius: 2, margin: '0 auto 12px auto' },
  phoneScreen: { flex: 1, overflow: 'hidden', borderRadius: 12 },
  label: { fontSize: '0.6rem', color: '#475569', fontWeight: 900, letterSpacing: '0.1em' },
  
  divider: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  dividerLine: { flex: 1, width: 1, background: '#1f2937' },
  dividerLabel: { fontSize: '0.55rem', color: '#3b82f6', fontFamily: '"JetBrains Mono"', writingMode: 'vertical-rl', letterSpacing: '0.2em' },
  
  dashPanel: { flex: 1, overflow: 'hidden' },
  centered: { height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  phoneMockupLarge: { width: 360, height: '90%', background: '#000', borderRadius: 32, border: '1px solid #1f2937', padding: 12 },
  phoneScreenLarge: { height: '100%', borderRadius: 20, overflow: 'hidden' },
  fullDash: { height: '100%' },

  footer: { display: 'flex', padding: '12px 32px', background: '#000', borderTop: '1px solid #1f2937', gap: 24, alignItems: 'center', overflowX: 'auto' },
  pathLabel: { fontSize: '0.6rem', color: '#1e293b', fontWeight: 900 },
  pathStep: { display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.6rem', fontWeight: 800, fontFamily: '"JetBrains Mono"', whiteSpace: 'nowrap' },
  activeDot: { width: 6, height: 6, background: '#3b82f6', borderRadius: '50%', boxShadow: '0 0 10px #3b82f6' }
};
