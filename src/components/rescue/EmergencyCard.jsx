import React from 'react';
import { SEVERITY_LABELS } from '../../services/classifier.js';

export default function EmergencyCard({ packet, onClaim, showClaim }) {
  const { severity, ts, id, status, team } = packet;
  const config = SEVERITY_LABELS[severity] || SEVERITY_LABELS.standard;

  return (
    <div style={{ ...CardStyles.wrapper, borderColor: config.color + '22' }} className="glass-panel stagger-in">
      {/* Tactical Sidebar */}
      <div style={{ ...CardStyles.sidebar, background: config.color }}>
        <span style={CardStyles.sidebarText}>{severity.toUpperCase()}</span>
      </div>

      <div style={CardStyles.content}>
        <div style={CardStyles.header}>
          <div style={CardStyles.headerLeft}>
            <div className="technical-data" style={{ color: config.color }}>
              REF_ID: {id.slice(0, 8)}
            </div>
            {packet.data?.hasImage && (
              <div style={CardStyles.evidenceBadge}>
                <span style={CardStyles.evidenceDot}></span>
                EVIDENCE_LOCKED
              </div>
            )}
            {packet.data?.conflict_warning && (
              <div style={CardStyles.conflictBadge}>
                <span style={CardStyles.conflictDot}></span>
                SENSORY_CONFLICT_DETECTED
              </div>
            )}
          </div>
          <div style={CardStyles.timestamp}>
            REC_T: {new Date(ts).toLocaleTimeString()}
          </div>
        </div>

        <div style={CardStyles.body}>
          <div style={CardStyles.mainData}>
            SIGNAL: <span className="technical-data" style={CardStyles.pktVal}>{packet.packet}</span>
          </div>
          <div style={CardStyles.metadataGrid}>
            <div style={CardStyles.metaItem}>
              <span style={CardStyles.metaLabel}>ENTITY_COUNT:</span>
              <span className="technical-data">{packet.people_count || 'ERR_NULL'}</span>
            </div>
            <div style={CardStyles.metaItem}>
              <span style={CardStyles.metaLabel}>SECTOR_LOC:</span>
              <span className="technical-data">ZN-{packet.zone || '00'}</span>
            </div>
          </div>
        </div>

        <div style={CardStyles.footer}>
          {status === 'claimed' ? (
            <div style={{ ...CardStyles.claimedIndicator, borderColor: config.color }}>
              <div style={CardStyles.claimedLabel}>ASSIGNED_TO</div>
              <div className="technical-data" style={CardStyles.teamName}>{team || 'STRIKE_TEAM'}</div>
            </div>
          ) : showClaim ? (
            <button style={CardStyles.actionBtn} onClick={onClaim}>
              INITIATE_RESPONSE_SEQUENCE
            </button>
          ) : (
            <div style={CardStyles.statusText}>STATUS: WAITING_FOR_UPLINK</div>
          )}
        </div>
      </div>
    </div>
  );
}

const CardStyles = {
  wrapper: { display: 'flex', borderRadius: '4px 12px 12px 4px', overflow: 'hidden', borderLeft: 'none', transition: 'all 0.2s ease' },
  sidebar: { width: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  sidebarText: { transform: 'rotate(-90deg)', whiteSpace: 'nowrap', fontSize: '0.55rem', fontWeight: 900, color: '#000', letterSpacing: '0.1em' },
  content: { flex: 1, padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerLeft: { display: 'flex', flexDirection: 'column', gap: 4 },
  evidenceBadge: { display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.45rem', color: '#10b981', fontWeight: 900, background: 'rgba(16, 185, 129, 0.1)', padding: '2px 6px', borderRadius: 2, letterSpacing: '0.05em' },
  evidenceDot: { width: 4, height: 4, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 4px #10b981' },
  conflictBadge: { display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.45rem', color: '#f59e0b', fontWeight: 900, background: 'rgba(245, 158, 11, 0.1)', padding: '2px 6px', borderRadius: 2, letterSpacing: '0.05em', marginTop: 2 },
  conflictDot: { width: 4, height: 4, borderRadius: '50%', background: '#f59e0b', animation: 'pulse 1s infinite' },
  timestamp: { fontSize: '0.6rem', color: '#475569', fontWeight: 700 },
  body: { display: 'flex', flexDirection: 'column', gap: 8 },
  mainData: { fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8' },
  pktVal: { color: '#fff', fontSize: '0.85rem' },
  metadataGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: '8px 0', borderTop: '1px solid rgba(255,255,255,0.03)' },
  metaItem: { display: 'flex', flexDirection: 'column', gap: 2 },
  metaLabel: { fontSize: '0.55rem', color: '#475569', fontWeight: 800 },
  footer: { marginTop: 4 },
  actionBtn: { width: '100%', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#3b82f6', borderRadius: 4, padding: '10px', fontSize: '0.65rem', fontWeight: 900, cursor: 'pointer', letterSpacing: '0.05em', transition: 'all 0.2s' },
  claimedIndicator: { padding: '8px 12px', border: '1px solid', background: 'rgba(255,255,255,0.02)', borderRadius: 4 },
  claimedLabel: { fontSize: '0.5rem', color: '#475569', fontWeight: 800 },
  teamName: { color: '#fff', fontSize: '0.7rem' },
  statusText: { fontSize: '0.6rem', color: '#475569', fontWeight: 900, letterSpacing: '0.05em' },
};
