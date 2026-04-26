import React from 'react';

export default function LandingPage({ onEnter }) {
  return (
    <div style={S.container} className="animate-fade-in">
      <div style={S.noise} />
      <div style={S.hero}>
        <h1 style={S.title}>SYNC BRIDGE</h1>
        <p style={S.subtitle}>
          When the grid goes dark, we light the path. <br />
          Decentralized disaster communication powered by Edge AI.
        </p>
        
        <div style={S.ctaRow}>
          <button style={S.primaryBtn} onClick={() => onEnter('split')}>
            Launch Simulation Center
          </button>
          <button style={S.secondaryBtn} onClick={() => window.open('https://github.com/SinghLV/sync-bridge', '_blank')}>
            View Protocol Source
          </button>
        </div>
      </div>

      <div style={S.grid}>
        <FeatureCard 
          icon="📡" 
          title="Offline Mesh" 
          desc="Transmits data over LoRa and Bluetooth without cellular towers or internet." 
        />
        <FeatureCard 
          icon="🧠" 
          title="Edge AI Triage" 
          desc="On-device Gemini Nano & TFLite models classify severity instantly." 
        />
        <FeatureCard 
          icon="📦" 
          title="Micro-Packets" 
          desc="12-byte header encoding allows 94% faster transmission on weak signals." 
        />
      </div>

      <div style={S.footer}>
        <div style={S.footerText}>© 2026 SYNC BRIDGE FOUNDATION // FOR GOOGLE HACKATHON</div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div style={S.card}>
      <div style={S.cardIcon}>{icon}</div>
      <h3 style={S.cardTitle}>{title}</h3>
      <p style={S.cardDesc}>{desc}</p>
    </div>
  );
}

const S = {
  container: { height: '100vh', display: 'flex', flexDirection: 'column', background: '#05070a', color: '#fff', position: 'relative', overflow: 'hidden' },
  noise: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'url(https://grainy-gradients.vercel.app/noise.svg)', opacity: 0.05, pointerEvents: 'none' },
  hero: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 20px', zIndex: 1 },
  badge: { fontSize: '0.7rem', color: '#4a9eff', border: '1px solid #4a9eff', padding: '6px 12px', borderRadius: 4, fontWeight: 900, marginBottom: 24, letterSpacing: '0.2em' },
  title: { fontSize: '6rem', fontWeight: 900, margin: 0, letterSpacing: '-0.05em', background: 'linear-gradient(to bottom, #fff, #4a5878)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  subtitle: { fontSize: '1.2rem', color: '#8899bb', maxWidth: '600px', lineHeight: 1.6, marginBottom: 40 },
  ctaRow: { display: 'flex', gap: 20 },
  primaryBtn: { background: '#fff', color: '#000', border: 'none', padding: '16px 32px', borderRadius: 8, fontWeight: 800, fontSize: '1rem', cursor: 'pointer', transition: 'all 0.2s' },
  secondaryBtn: { background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', padding: '16px 32px', borderRadius: 8, fontWeight: 800, fontSize: '1rem', cursor: 'pointer' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 30, padding: '0 60px 80px', zIndex: 1 },
  card: { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: '30px', textAlign: 'center' },
  cardIcon: { fontSize: '2.5rem', marginBottom: 20 },
  cardTitle: { fontSize: '1.2rem', fontWeight: 800, marginBottom: 12 },
  cardDesc: { fontSize: '0.9rem', color: '#4a5878', lineHeight: 1.5 },
  footer: { padding: '40px', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.03)' },
  footerText: { fontSize: '0.6rem', color: '#2a3450', letterSpacing: '0.3em' },
};
