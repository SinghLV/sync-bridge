import React from 'react';

const LandingPage = ({ onAction }) => {
  return (
    <div style={LandingStyles.wrapper}>
      <div className="noise-overlay" />
      
      {/* Engineering Grid & Accents */}
      <div style={LandingStyles.gridOverlay} />
      <div style={LandingStyles.crossTL}>+</div>
      <div style={LandingStyles.crossTR}>+</div>
      <div style={LandingStyles.crossBL}>+</div>
      <div style={LandingStyles.crossBR}>+</div>
      
      <div style={LandingStyles.scanningRay} />
      
      <div style={LandingStyles.mainContent}>
        <div style={LandingStyles.identity}>
          <div style={LandingStyles.liveStatus}>
            <span style={LandingStyles.pulseDot} />
            LIVE_DEMO // ACTIVE_SESSION_NODE
          </div>
          <div style={LandingStyles.tagline}>PROJECT_SYNC_BRIDGE // TERMINAL_01</div>
          <h1 style={LandingStyles.heroText}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#3b82f6" style={{ marginRight: 12, verticalAlign: 'middle' }}>
              <path d="M12 2L14.85 9.15L22 12L14.85 14.85L12 22L9.15 14.85L2 12L9.15 9.15L12 2Z" />
            </svg>
            SYNC_BRIDGE
          </h1>
        </div>

        <div style={LandingStyles.specGrid}>
          <div style={LandingStyles.specItem}>
            <span style={LandingStyles.specLabel}>CORE_PROTOCOL</span>
            <span style={LandingStyles.specVal}>DECENTRALIZED_MESH_V1</span>
          </div>
          <div style={LandingStyles.specItem}>
            <span style={LandingStyles.specLabel}>LATENCY_CAP</span>
            <span style={LandingStyles.specVal}>&lt; 42MS_LOCAL_RELAY</span>
          </div>
          <div style={LandingStyles.specItem}>
            <span style={LandingStyles.specLabel}>AI_QUANTIZATION</span>
            <span style={LandingStyles.specVal}>INT8_TPU_OPTIMIZED</span>
          </div>
          <div style={LandingStyles.specItem}>
            <span style={LandingStyles.specLabel}>SYNC_ENGINE</span>
            <span style={LandingStyles.specVal}>ULTRA_LIGHT_HYBRID</span>
          </div>
        </div>

        <div style={LandingStyles.actionGrid}>
          <button 
            style={LandingStyles.btnPrimary} 
            onClick={() => onAction('victim')}
          >
            [ INITIATE_BEACON_UPLINK ]
          </button>
          
          <button 
            style={LandingStyles.btnSecondary} 
            onClick={() => onAction('dashboard')}
          >
            [ ACCESS_MISSION_CONTROL ]
          </button>
        </div>
      </div>

      <footer style={LandingStyles.footer}>
        <div style={LandingStyles.footerItem}>
          <span style={LandingStyles.footerLabel}>COORDINATES</span>
          <span style={LandingStyles.footerValue}>38.8951° N, 77.0364° W</span>
        </div>
        <div style={LandingStyles.footerItem}>
          <span style={LandingStyles.footerLabel}>UPLINK_STATUS</span>
          <span style={{...LandingStyles.footerValue, color: '#10b981'}}>SIGNAL_NOMINAL</span>
        </div>
      </footer>
    </div>
  );
};

const LandingStyles = {
  wrapper: {
    height: '100vh',
    background: '#05070a',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    fontFamily: '"Space Grotesk"',
    overflow: 'hidden'
  },
  gridOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundImage: 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 0)',
    backgroundSize: '40px 40px',
    pointerEvents: 'none'
  },
  crossTL: { position: 'absolute', top: 40, left: 40, color: '#1e293b', fontSize: '1.2rem', fontWeight: 200 },
  crossTR: { position: 'absolute', top: 40, right: 40, color: '#1e293b', fontSize: '1.2rem', fontWeight: 200 },
  crossBL: { position: 'absolute', bottom: 40, left: 40, color: '#1e293b', fontSize: '1.2rem', fontWeight: 200 },
  crossBR: { position: 'absolute', bottom: 40, right: 40, color: '#1e293b', fontSize: '1.2rem', fontWeight: 200 },
  
  liveStatus: { fontSize: '0.65rem', fontWeight: 900, color: '#10b981', letterSpacing: '0.15em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 },
  pulseDot: { width: 6, height: 6, borderRadius: '50%', background: '#10b981', animation: 'pulse 1.5s infinite' },
  scanningRay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'linear-gradient(to bottom, transparent 0%, rgba(59, 130, 246, 0.05) 50%, transparent 100%)',
    backgroundSize: '100% 400%',
    animation: 'scan 8s linear infinite',
    pointerEvents: 'none',
    zIndex: 1
  },
  mainContent: {
    zIndex: 10,
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 60
  },
  identity: { display: 'flex', flexDirection: 'column', gap: 12 },
  heroText: { fontSize: '4.5rem', fontWeight: 900, letterSpacing: '-0.04em', margin: 0, lineHeight: 1 },
  tagline: { fontSize: '0.75rem', fontWeight: 800, color: '#475569', letterSpacing: '0.2em' },
  specGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 40, width: '100%', maxWidth: 1000 },
  specItem: { display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' },
  specLabel: { fontSize: '0.6rem', fontWeight: 800, color: '#1e293b', letterSpacing: '0.1em' },
  specVal: { fontSize: '0.8rem', fontWeight: 900, color: '#475569', fontFamily: "'JetBrains Mono'" },
  actionGrid: { display: 'flex', gap: 24 },
  btnPrimary: { background: '#fff', color: '#000', border: 'none', padding: '16px 40px', fontSize: '0.85rem', fontWeight: 900, cursor: 'pointer', transition: 'all 0.2s ease', letterSpacing: '0.05em' },
  btnSecondary: { background: 'transparent', color: '#fff', border: '1px solid #1e293b', padding: '16px 40px', fontSize: '0.85rem', fontWeight: 900, cursor: 'pointer', transition: 'all 0.2s ease', letterSpacing: '0.05em' },
  footer: { position: 'absolute', bottom: 40, display: 'flex', gap: 60 },
  footerItem: { display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' },
  footerLabel: { fontSize: '0.55rem', fontWeight: 800, color: '#1e293b', letterSpacing: '0.1em' },
  footerValue: { fontSize: '0.75rem', fontWeight: 900, color: '#475569', fontFamily: "'JetBrains Mono'" }
};

export default LandingPage;
