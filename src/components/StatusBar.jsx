import React from 'react';

export default function StatusBar({ online, syncing, pending, sent }) {
  let status, color, icon, label;

  if (syncing) {
    status = 'syncing';
    color  = '#4a9eff';
    icon   = '↑';
    label  = 'Syncing...';
  } else if (!online) {
    status = 'offline';
    color  = '#ff3d55';
    icon   = '✕';
    label  = `OFFLINE${pending > 0 ? ` · ${pending} queued` : ''}`;
  } else if (pending > 0) {
    status = 'pending';
    color  = '#ff9500';
    icon   = '●';
    label  = `${pending} pending`;
  } else {
    status = 'online';
    color  = '#30d158';
    icon   = '●';
    label  = sent > 0 ? `${sent} sent` : 'Ready';
  }

  return (
    <div style={{ ...styles.bar, borderColor: color + '44', background: color + '11' }}>
      <span
        style={{
          ...styles.dot,
          background: color,
          animation: syncing ? 'spin 1s linear infinite' : status === 'offline' ? 'none' : 'pulse-dot 1.5s ease-in-out infinite',
        }}
      >
        {syncing ? '' : ''}
      </span>
      <span style={{ ...styles.label, color }}>{label}</span>
    </div>
  );
}

const styles = {
  bar: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '5px 12px',
    borderRadius: 20,
    border: '1px solid',
    transition: 'all 0.4s ease',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    flexShrink: 0,
    transition: 'background 0.4s ease',
  },
  label: {
    fontSize: '0.7rem',
    fontWeight: 700,
    fontFamily: "'JetBrains Mono', monospace",
    letterSpacing: '0.05em',
    transition: 'color 0.4s ease',
    whiteSpace: 'nowrap',
  },
};
