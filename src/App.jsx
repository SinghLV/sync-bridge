import React, { useEffect, useState } from 'react';
import LandingPage from './components/LandingPage.jsx';
import VictimApp from './components/victim/VictimApp.jsx';
import RescueDashboard from './components/rescue/RescueDashboard.jsx';

const VIEWS = {
  landing: 'landing',
  victim: 'victim',
  split: 'split',
  dashboard: 'dashboard',
};

const NAV_ITEMS = [
  { id: VIEWS.victim, label: 'BEACON_MODE' },
  { id: VIEWS.split, label: 'DUAL_UPLINK_DEMO' },
  { id: VIEWS.dashboard, label: 'COMMAND_CENTER' },
];

function resolveView(search = window.location.search) {
  const params = new URLSearchParams(search);
  const requestedView = params.get('view') || VIEWS.landing;
  return Object.values(VIEWS).includes(requestedView) ? requestedView : VIEWS.landing;
}

function syncUrl(view, replace = false) {
  const url = new URL(window.location.href);

  if (view === VIEWS.landing) {
    url.searchParams.delete('view');
  } else {
    url.searchParams.set('view', view);
  }

  window.history[replace ? 'replaceState' : 'pushState']({}, '', `${url.pathname}${url.search}${url.hash}`);
}

export default function App() {
  const [view, setView] = useState(() => resolveView());
  const [dashRefresh, setRefresh] = useState(0);

  useEffect(() => {
    const syncFromBrowser = () => setView(resolveView());

    syncUrl(resolveView(), true);
    window.addEventListener('popstate', syncFromBrowser);

    return () => {
      window.removeEventListener('popstate', syncFromBrowser);
    };
  }, []);

  const navigate = (nextView) => {
    const resolvedView = Object.values(VIEWS).includes(nextView)
      ? nextView
      : VIEWS.landing;
    setView(resolvedView);
    syncUrl(resolvedView);
  };

  const handlePacketSent = () => setRefresh((current) => current + 1);

  if (view === VIEWS.landing) {
    return <LandingPage onAction={navigate} />;
  }

  return (
    <div style={AppStyles.root}>
      <div className="noise-overlay" />
      <div className="scanlines" />

      <div style={AppStyles.frameTL}>[ SYS_REF_A1 ]</div>
      <div style={AppStyles.frameTR}>PRTCL_V.1.0.4</div>
      <div style={AppStyles.frameBL}>// MESH_SYNC_ACTIVE</div>
      <div style={AppStyles.frameBR}>[ 38.8951° N, 77.0364° W ]</div>

      <nav style={AppStyles.nav}>
        <div style={AppStyles.brand} onClick={() => navigate(VIEWS.landing)}>
          <div style={AppStyles.brandName}>SYNC_BRIDGE</div>
          <div style={AppStyles.brandTag}>OFFLINE_SIGNAL_PERSISTENCE</div>
        </div>

        <div style={AppStyles.navTabs}>
          {NAV_ITEMS.map((tab) => (
            <button
              key={tab.id}
              style={{ ...AppStyles.tab, ...(view === tab.id ? AppStyles.tabActive : {}) }}
              onClick={() => navigate(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      <main style={AppStyles.main}>
        {view === VIEWS.victim && (
          <section style={AppStyles.dashboardStage}>
            <VictimApp onPacketSent={handlePacketSent} layout="desktop" />
          </section>
        )}

        {view === VIEWS.split && (
          <div style={AppStyles.splitLayout}>
            <section style={AppStyles.beaconStage}>
              <div style={AppStyles.phonePanel}>
                <div style={AppStyles.phoneMockup}>
                  <div style={AppStyles.phoneSpeaker} />
                  <div style={AppStyles.phoneScreen}>
                    <VictimApp onPacketSent={handlePacketSent} />
                  </div>
                  <div style={AppStyles.phoneHome} />
                </div>
              </div>
            </section>

            <section style={AppStyles.dashboardStage}>
              <RescueDashboard refreshTrigger={dashRefresh} />
            </section>
          </div>
        )}

        {view === VIEWS.dashboard && (
          <section style={AppStyles.dashboardStage}>
            <RescueDashboard refreshTrigger={dashRefresh} />
          </section>
        )}
      </main>

      <footer style={AppStyles.footer}>
        <div style={AppStyles.pathLabel}>PATH:</div>
        <PathStep label="USER_INPUT" />
        <PathStep label="EDGE_AI_INFERENCE" active />
        <PathStep label="PACKET_ENCODE" />
        <PathStep label="MESH_QUEUE" />
        <PathStep label="CLOUD_SYNCHRONIZATION" />
        <PathStep label="TACTICAL_DISPLAY" active />
      </footer>
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
  root: {
    height: '100vh',
    width: '100vw',
    background: '#05070a',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative',
  },
  frameTL: { position: 'fixed', top: 12, left: 16, fontSize: '0.55rem', color: '#1e293b', fontWeight: 800, zIndex: 100, fontFamily: '"JetBrains Mono"' },
  frameTR: { position: 'fixed', top: 12, right: 16, fontSize: '0.55rem', color: '#1e293b', fontWeight: 800, zIndex: 100, fontFamily: '"JetBrains Mono"' },
  frameBL: { position: 'fixed', bottom: 12, left: 16, fontSize: '0.55rem', color: '#1e293b', fontWeight: 800, zIndex: 100, fontFamily: '"JetBrains Mono"' },
  frameBR: { position: 'fixed', bottom: 12, right: 16, fontSize: '0.55rem', color: '#1e293b', fontWeight: 800, zIndex: 100, fontFamily: '"JetBrains Mono"' },

  nav: {
    display: 'flex',
    alignItems: 'center',
    padding: '24px 32px',
    gap: 40,
    borderBottom: '1px solid rgba(255,255,255,0.03)',
    zIndex: 10,
  },
  brand: {
    display: 'flex',
    flexDirection: 'column',
    cursor: 'pointer',
  },
  brandName: { fontSize: '1.2rem', fontWeight: 900, letterSpacing: '0.05em', color: '#fff', fontFamily: '"Space Grotesk"' },
  brandTag: { fontSize: '0.55rem', color: '#475569', fontWeight: 800, letterSpacing: '0.1em' },

  navTabs: { display: 'flex', background: '#0a0c10', padding: 4, borderRadius: 4, border: '1px solid #1f2937' },
  tab: { background: 'none', border: 'none', color: '#475569', padding: '8px 16px', fontSize: '0.65rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s' },
  tabActive: { background: '#1f2937', color: '#fff' },

  main: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
    padding: '24px 32px 32px',
    minHeight: 0,
  },
  splitLayout: {
    display: 'grid',
    gridTemplateColumns: 'minmax(460px, 0.92fr) minmax(0, 1.28fr)',
    gap: 24,
    height: '100%',
    minHeight: 0,
  },
  beaconStage: {
    height: '100%',
    minHeight: 0,
    width: '100%',
    overflow: 'hidden',
    display: 'flex',
    background: 'rgba(5, 7, 10, 0.92)',
    border: '1px solid #18202d',
    borderRadius: 18,
    boxShadow: '0 18px 60px rgba(0,0,0,0.28)',
  },
  beaconStageFull: {
    height: '100%',
    minHeight: 0,
    width: '100%',
    overflow: 'hidden',
    display: 'flex',
    background: 'rgba(5, 7, 10, 0.92)',
    border: '1px solid #18202d',
    borderRadius: 18,
    boxShadow: '0 18px 60px rgba(0,0,0,0.28)',
  },
  centeredBeacon: {
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.05) 0%, transparent 62%)',
  },
  phonePanel: {
    height: '100%',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  phoneMockup: {
    display: 'flex',
    flexDirection: 'column',
    width: 320,
    height: '100%',
    maxHeight: 680,
    background: '#0a0f1e',
    borderRadius: 36,
    overflow: 'hidden',
    border: '2px solid rgba(255,255,255,0.1)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05), 0 0 40px rgba(59,130,246,0.08)',
  },
  phoneMockupLarge: {
    display: 'flex',
    flexDirection: 'column',
    width: 390,
    height: '100%',
    maxHeight: 820,
    background: '#0a0f1e',
    borderRadius: 40,
    overflow: 'hidden',
    border: '2px solid rgba(255,255,255,0.1)',
    boxShadow: '0 20px 80px rgba(0,0,0,0.7), 0 0 60px rgba(59,130,246,0.1)',
  },
  phoneSpeaker: {
    height: 4,
    width: 50,
    background: 'rgba(255,255,255,0.12)',
    borderRadius: 2,
    margin: '10px auto 0',
    flexShrink: 0,
  },
  phoneScreen: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  phoneScreenLarge: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  phoneHome: {
    height: 4,
    width: 100,
    background: 'rgba(255,255,255,0.12)',
    borderRadius: 2,
    margin: '8px auto 12px',
    flexShrink: 0,
  },
  dashboardStage: {
    height: '100%',
    minHeight: 0,
    overflow: 'hidden',
    background: 'rgba(5, 7, 10, 0.92)',
    border: '1px solid #18202d',
    borderRadius: 18,
    boxShadow: '0 18px 60px rgba(0,0,0,0.28)',
  },

  footer: { display: 'flex', padding: '12px 32px', background: '#000', borderTop: '1px solid #1f2937', gap: 24, alignItems: 'center', overflowX: 'auto' },
  pathLabel: { fontSize: '0.6rem', color: '#1e293b', fontWeight: 900 },
  pathStep: { display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.6rem', fontWeight: 800, fontFamily: '"JetBrains Mono"', whiteSpace: 'nowrap' },
  activeDot: { width: 6, height: 6, background: '#3b82f6', borderRadius: '50%', boxShadow: '0 0 10px #3b82f6' },
};
