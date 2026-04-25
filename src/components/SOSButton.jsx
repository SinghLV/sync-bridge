import React from 'react';

export default function SOSButton({ onClick, label, color = '#ff3d55' }) {
  const isRed = color === '#ff3d55';
  return (
    <div style={styles.wrapper}>
      {isRed && (
        <>
          <div style={{ ...styles.ring, animationDelay: '0s' }} />
          <div style={{ ...styles.ring, animationDelay: '0.7s' }} />
        </>
      )}
      <button
        style={{
          ...styles.button,
          background: `linear-gradient(135deg, ${color}, ${color}cc)`,
          boxShadow: `0 4px 24px ${color}55, 0 0 0 1px ${color}33`,
        }}
        onClick={onClick}
      >
        {label}
      </button>
    </div>
  );
}

const styles = {
  wrapper: { position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 },
  ring: {
    position: 'absolute', width: '100%', height: '100%', borderRadius: 12,
    border: '2px solid rgba(255,61,85,0.5)', animation: 'pulse-ring 2s ease-out infinite', pointerEvents: 'none',
  },
  button: {
    position: 'relative', width: '100%', padding: '14px 20px', borderRadius: 12,
    border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: '0.9rem', color: '#fff',
    letterSpacing: '0.02em', transition: 'transform 0.15s, opacity 0.15s', zIndex: 1,
    fontFamily: "'Inter', sans-serif",
  },
};
