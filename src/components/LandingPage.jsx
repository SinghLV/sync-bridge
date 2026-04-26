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
      
      <div style={LandingStyles.mainContent}>
        <div style={LandingStyles.identity}>
          <div style={LandingStyles.tagline}>PROJECT_SYNC_BRIDGE // TERMINAL_01</div>
          <h1 style={LandingStyles.heroText}>SYNC_BRIDGE</h1>
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
        </div>

        <div style={LandingStyles.actionGrid}>
          <button 
            style={LandingStyles.btnPrimary} 
            onClick={() => onAction('victim')}
          >
            [ START_BEACON_UPLINK ]
          </button>
          
          <button 
            style={LandingStyles.btnSecondary} 
            onClick={() => onAction('dashboard')}
          >
            [ ACCESS_COMMAND_CENTER ]
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
  
  mainContent: {
    zIndex: 10,
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 60
  },
  identity: { display: 'flex', flexDirection: 'column', gap: 12 },
  tagline: { fontSize: '0.6rem', fontWeight: 900, color: '#3b82f6', letterSpacing: '0.4em', fontFamily: '"JetBrains Mono"' },
  heroText: { 
    fontSize: '6rem', 
    lineHeight: 0.9, 
    margin: 0, 
    fontWeight: 900, 
    letterSpacing: '-0.02em',
    color: '#fff',
  },
  
  specGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 40, borderTop: '1px solid #1e293b', borderBottom: '1px solid #1e293b', padding: '24px 0' },
  specItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  specLabel: { fontSize: '0.5rem', color: '#475569', fontWeight: 900, letterSpacing: '0.1em' },
  specVal: { fontSize: '0.7rem', color: '#94a3b8', fontWeight: 800, fontFamily: '"JetBrains Mono"' },

  actionGrid: { display: 'flex', gap: 24 },
  btnPrimary: { 
    background: '#fff', 
    color: '#000', 
    border: 'none', 
    padding: '16px 32px', 
    fontWeight: 900, 
    fontSize: '0.75rem', 
    cursor: 'pointer',
    letterSpacing: '0.05em',
    fontFamily: '"JetBrains Mono"'
  },
  btnSecondary: { 
    background: 'transparent', 
    color: '#fff', 
    border: '1px solid #1e293b', 
    padding: '16px 32px', 
    fontWeight: 900, 
    fontSize: '0.75rem', 
    cursor: 'pointer',
    letterSpacing: '0.05em',
    fontFamily: '"JetBrains Mono"'
  },

  footer: { position: 'absolute', bottom: 60, width: '100%', padding: '0 60px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  footerItem: { display: 'flex', flexDirection: 'column', gap: 4 },
  footerLabel: { fontSize: '0.5rem', fontWeight: 900, color: '#1e293b', letterSpacing: '0.1em' },
  footerValue: { fontSize: '0.65rem', fontWeight: 800, color: '#475569', fontFamily: '"JetBrains Mono"' },
};

export default LandingPage;
