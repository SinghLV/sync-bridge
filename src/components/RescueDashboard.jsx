import React, { useState, useEffect } from 'react';
import { getAllPackets, getQueueStats } from '../utils/offlineQueue.js';
import { decodePacket } from '../utils/packetEncoder.js';
import { SEVERITY_LABELS } from '../utils/classifier.js';
import MapView from './MapView.jsx';
import EmergencyCard from './EmergencyCard.jsx';

export default function RescueDashboard({ refreshTrigger }) {
  const [packets, setPackets]     = useState([]);
  const [stats, setStats]         = useState({});
  const [filter, setFilter]       = useState('all');
  const [selected, setSelected]   = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    refresh();
  }, [refreshTrigger]);

  // Poll for new data every 3s to catch live syncs
  useEffect(() => {
    const iv = setInterval(refresh, 3000);
    return () => clearInterval(iv);
  }, []);

  function refresh() {
    const all = getAllPackets();
    setPackets(all);
    setStats(getQueueStats());
    setLastUpdate(new Date());
  }

  const filtered = filter === 'all' ? packets : packets.filter(p => p.severity === filter);
  const critical  = packets.filter(p => p.severity === 'critical');
  const urgent    = packets.filter(p => p.severity === 'urgent');
  const safe      = packets.filter(p => p.severity === 'safe');

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={styles.title}>
            <span style={styles.titleIcon}>🛡</span>
            <span>Rescue Operations Center</span>
            <div style={styles.liveBadge}>
              <span style={styles.liveDot} />
              LIVE
            </div>
          </div>
          <div style={styles.subtitle}>
            Sync Bridge · Real-time Emergency Feed · Updated {formatTime(lastUpdate)}
          </div>
        </div>
        <button style={styles.refreshBtn} onClick={refresh}>↻ Refresh</button>
      </div>

      {/* Stats Row */}
      <div style={styles.statsRow}>
        <StatCard value={packets.length} label="Total Alerts" color="#4a9eff" icon="📡" />
        <StatCard value={critical.length} label="Critical" color="#ff3d55" icon="🔴" onClick={() => setFilter('critical')} active={filter === 'critical'} />
        <StatCard value={urgent.length}   label="Urgent"   color="#ff9500" icon="🟠" onClick={() => setFilter('urgent')}   active={filter === 'urgent'} />
        <StatCard value={safe.length}     label="Safe"     color="#30d158" icon="🟢" onClick={() => setFilter('safe')}     active={filter === 'safe'} />
        <StatCard value={stats.synced || 0} label="Synced" color="#9b7fe8" icon="✅" />
      </div>

      {/* Main Content */}
      <div style={styles.main}>
        {/* Map */}
        <div style={styles.mapPanel}>
          <div style={styles.panelTitle}>
            🗺 Zone Map — Active Incidents
            {filter !== 'all' && (
              <button style={styles.clearFilter} onClick={() => setFilter('all')}>✕ Clear Filter</button>
            )}
          </div>
          <MapView packets={filtered} selected={selected} onSelect={setSelected} />
          <div style={styles.legend}>
            {['critical','urgent','safe'].map(s => (
              <div key={s} style={styles.legendItem}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: SEVERITY_LABELS[s].color }} />
                <span style={styles.legendLabel}>{SEVERITY_LABELS[s].label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Emergency List */}
        <div style={styles.listPanel}>
          <div style={styles.panelTitle}>
            📋 Emergency Queue
            <span style={styles.filterPill}>{filter === 'all' ? 'All' : filter.toUpperCase()}</span>
          </div>
          <div style={styles.list}>
            {filtered.length === 0 ? (
              <EmptyState filter={filter} />
            ) : (
              filtered.map((pkt, i) => (
                <EmergencyCard
                  key={pkt.id}
                  packet={pkt}
                  index={i}
                  decoded={decodePacket(pkt.packet)}
                  selected={selected === pkt.id}
                  onSelect={() => setSelected(pkt.id === selected ? null : pkt.id)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ value, label, color, icon, onClick, active }) {
  return (
    <div
      style={{
        ...styles.statCard,
        borderColor: active ? color + '88' : color + '22',
        background: active ? color + '18' : color + '08',
        cursor: onClick ? 'pointer' : 'default',
        transform: active ? 'scale(1.02)' : 'scale(1)',
      }}
      onClick={onClick}
    >
      <div style={styles.statIcon}>{icon}</div>
      <div style={{ ...styles.statValue, color }}>{value}</div>
      <div style={styles.statLabel}>{label}</div>
    </div>
  );
}

function EmptyState({ filter }) {
  return (
    <div style={styles.empty}>
      <div style={styles.emptyIcon}>📭</div>
      <div style={styles.emptyTitle}>No {filter === 'all' ? '' : filter} emergencies yet</div>
      <div style={styles.emptySub}>Use the Victim App to send an SOS message.</div>
    </div>
  );
}

function formatTime(d) {
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' },
  header: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(10,15,30,0.9)' },
  title: { display: 'flex', alignItems: 'center', gap: 10, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: '1.1rem', color: '#f0f4ff', marginBottom: 4 },
  titleIcon: { fontSize: '1.2rem' },
  liveBadge: { display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(48,209,88,0.1)', border: '1px solid rgba(48,209,88,0.3)', borderRadius: 20, padding: '2px 9px', fontSize: '0.65rem', color: '#30d158', fontWeight: 800, letterSpacing: '0.1em' },
  liveDot: { width: 6, height: 6, borderRadius: '50%', background: '#30d158', animation: 'pulse-dot 1s ease-in-out infinite' },
  subtitle: { fontSize: '0.7rem', color: '#4a5878', fontFamily: "'JetBrains Mono', monospace" },
  refreshBtn: { padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', cursor: 'pointer', color: '#8899bb', fontSize: '0.75rem', marginTop: 4 },
  statsRow: { display: 'flex', gap: 10, padding: '14px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', overflowX: 'auto' },
  statCard: { flex: '1 0 80px', minWidth: 80, borderRadius: 12, border: '1px solid', padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, transition: 'all 0.25s', cursor: 'default' },
  statIcon: { fontSize: '1.1rem' },
  statValue: { fontSize: '1.6rem', fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1 },
  statLabel: { fontSize: '0.62rem', color: '#4a5878', textTransform: 'uppercase', letterSpacing: '0.07em', textAlign: 'center' },
  main: { flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 },
  mapPanel: { flex: 1.4, borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  listPanel: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 280 },
  panelTitle: { padding: '10px 16px', fontSize: '0.75rem', fontWeight: 700, color: '#8899bb', letterSpacing: '0.05em', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 8 },
  filterPill: { marginLeft: 'auto', fontSize: '0.65rem', background: 'rgba(74,158,255,0.15)', color: '#4a9eff', border: '1px solid rgba(74,158,255,0.3)', borderRadius: 20, padding: '1px 8px' },
  clearFilter: { marginLeft: 'auto', fontSize: '0.65rem', background: 'transparent', border: 'none', color: '#ff3d55', cursor: 'pointer' },
  list: { flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 },
  legend: { display: 'flex', gap: 16, padding: '8px 16px', borderTop: '1px solid rgba(255,255,255,0.05)', justifyContent: 'center' },
  legendItem: { display: 'flex', alignItems: 'center', gap: 5 },
  legendLabel: { fontSize: '0.65rem', color: '#4a5878', textTransform: 'uppercase', letterSpacing: '0.07em' },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10, color: '#4a5878', padding: 24, textAlign: 'center' },
  emptyIcon: { fontSize: '2.5rem' },
  emptyTitle: { fontWeight: 600, fontSize: '0.9rem', color: '#8899bb' },
  emptySub: { fontSize: '0.75rem' },
};
