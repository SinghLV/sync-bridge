import React from 'react';
import { decodePacket } from '../utils/packetEncoder.js';

export default function EmergencyCard({ packet }) {
  const data = decodePacket(packet.packet);
  const isCritical = packet.severity === 'critical';

  return (
    <div style={{ 
      ...S.card, 
      borderColor: isCritical ? 'rgba(255, 61, 85, 0.3)' : 'rgba(255, 255, 255, 0.1)',
      background: isCritical ? 'rgba(255, 61, 85, 0.03)' : 'rgba(255, 255, 255, 0.02)'
    }} className="animate-slide-up">
      <div style={S.header}>
        <div style={{ ...S.sevTag, background: isCritical ? '#ff3d55' : '#ff9500' }}>
          {packet.severity.toUpperCase()}
        </div>
        <div style={S.id}>ID: {packet.id.slice(-6)}</div>
        <div style={S.time}>{new Date(packet.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
      </div>

      <div style={S.body}>
        <div style={S.condition}>{data.condition}</div>
        <div style={S.details}>
          <div style={S.detailItem}>
            <span style={S.label}>PEOPLE</span>
            <span style={S.val}>{data.people}</span>
          </div>
          <div style={S.detailItem}>
            <span style={S.label}>ZONE</span>
            <span style={S.val}>L{data.zone}</span>
          </div>
          <div style={S.detailItem}>
            <span style={S.label}>LAT/LNG</span>
            <span style={S.val}>{packet.lat.toFixed(3)}, {packet.lng.toFixed(3)}</span>
          </div>
        </div>
      </div>

      <div style={S.footer}>
        <div style={S.packetLabel}>RAW PACKET</div>
        <div style={S.packetVal}>{packet.packet}</div>
      </div>
    </div>
  );
}

const S = {
  card: {
    borderRadius: 12,
    border: '1px solid',
    padding: 14,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    transition: 'all 0.3s',
  },
  header: { display: 'flex', alignItems: 'center', gap: 10 },
  sevTag: { fontSize: '0.6rem', color: '#fff', fontWeight: 900, padding: '2px 6px', borderRadius: 4, letterSpacing: '0.05em' },
  id: { fontSize: '0.65rem', color: '#4a5878', fontFamily: "'JetBrains Mono'" },
  time: { marginLeft: 'auto', fontSize: '0.65rem', color: '#8899bb', fontWeight: 600 },
  body: { display: 'flex', flexDirection: 'column', gap: 8 },
  condition: { fontSize: '1rem', fontWeight: 800, color: '#f0f4ff' },
  details: { display: 'flex', gap: 20 },
  detailItem: { display: 'flex', flexDirection: 'column', gap: 2 },
  label: { fontSize: '0.55rem', color: '#4a5878', fontWeight: 700, letterSpacing: '0.1em' },
  val: { fontSize: '0.75rem', color: '#f0f4ff', fontWeight: 700, fontFamily: "'JetBrains Mono'" },
  footer: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: 12, 
    marginTop: 4, 
    paddingTop: 10, 
    borderTop: '1px solid rgba(255,255,255,0.05)' 
  },
  packetLabel: { fontSize: '0.5rem', color: '#4a5878', fontWeight: 700 },
  packetVal: { fontSize: '0.7rem', color: '#4a9eff', fontFamily: "'JetBrains Mono'", fontWeight: 700, letterSpacing: '0.1em' },
};
