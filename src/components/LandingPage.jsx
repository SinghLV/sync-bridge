import React from 'react';

const LandingPage = ({ onAction }) => {
  return (
    <div style={S.container} className="animate-fade-in">
      <div style={S.noise} />
      <div style={S.gridOverlay} />
      
      <div style={S.hero}>
        <div style={S.brandTag}>NEURAL MESH PROTOCOL</div>
        <h1 style={S.title}>SYNC BRIDGE</h1>
        <p style={S.subtitle}>
          AI-Driven Disaster Triage & Offline Synchronization. <br />
          <span style={{ color: '#4a9eff', opacity: 0.8, fontSize: '0.85rem', fontWeight: 800 }}>ESTABLISHING MESH NODE // 2026</span>
        </p>
        
        <div style={S.ctaArea}>
          <button style={S.primaryBtn} onClick={() => onAction('victim')}>
            <span>SOS BEACON</span>
            <div style={S.btnGlow} />
          </button>
          <button style={S.secondaryBtn} onClick={() => onAction('dashboard')}>
            <span>COMMAND CENTER</span>
          </button>
        </div>
      </div>

      <div style={S.footer}>
        <div style={S.statItem}>
          <div style={S.statVal}>0ms</div>
          <div style={S.statLabel}>LATENCY</div>
        </div>
        <div style={S.statItem}>
          <div style={S.statVal}>12B</div>
          <div style={S.statLabel}>PACKET SIZE</div>
        </div>
        <div style={S.statItem}>
          <div style={S.statVal}>EDGE</div>
          <div style={S.statLabel}>AI TRIAGE</div>
        </div>
      </div>
    </div>
  );
};

const S = {
  container: { height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#02040a', position: 'relative', overflow: 'hidden', color: '#fff', textAlign: 'center' },
  noise: { position: 'absolute', inset: 0, background: 'url(https://grainy-gradients.vercel.app/noise.svg)', opacity: 0.05, pointerEvents: 'none' },
  gridOverlay: { position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(74, 158, 255, 0.05) 1px, transparent 0)', backgroundSize: '40px 40px', pointerEvents: 'none' },
  hero: { position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 },
  brandTag: { fontSize: '0.65rem', fontWeight: 900, letterSpacing: '0.3em', color: '#4a9eff', marginBottom: -10 },
  title: { fontSize: '6rem', fontWeight: 900, letterSpacing: '-0.04em', margin: 0, background: 'linear-gradient(180deg, #fff 0%, rgba(255,255,255,0.4) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  subtitle: { fontSize: '1.2rem', lineHeight: 1.6, color: '#8899bb', fontWeight: 500 },
  ctaArea: { display: 'flex', gap: 20, marginTop: 20 },
  primaryBtn: { position: 'relative', background: '#fff', color: '#000', border: 'none', padding: '16px 40px', borderRadius: 100, fontWeight: 800, fontSize: '1rem', cursor: 'pointer', overflow: 'hidden' },
  btnGlow: { position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)', transform: 'translateX(-100%)', animation: 'shimmer 3s infinite' },
  secondaryBtn: { background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '16px 40px', borderRadius: 100, fontWeight: 800, fontSize: '1rem', cursor: 'pointer', backdropFilter: 'blur(10px)' },
  footer: { position: 'absolute', bottom: 60, display: 'flex', gap: 80 },
  statItem: { display: 'flex', flexDirection: 'column', gap: 4 },
  statVal: { fontSize: '1.5rem', fontWeight: 900, fontFamily: "'JetBrains Mono'" },
  statLabel: { fontSize: '0.6rem', fontWeight: 800, color: '#4a5878', letterSpacing: '0.1em' }
};

export default LandingPage;
