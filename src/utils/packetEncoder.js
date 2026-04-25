/** 
 * SYNC BRIDGE — MICRO-PACKET ENCODER v2.4 (LORA/BLE Optimized)
 * 
 * DESIGN NOTES:
 * Using a dash-separated hex/token format for reliability over unstable links.
 * TODO: Move from String-based tokens to 8-bit bitfields to save another 40% bandwidth.
 * Current implementation tested with Semtech SX1276 (LoRa) at 125kHz BW.
 */

export function encodePacket(classification, userId = 'U0') {
  const { severity_code, people_count, condition_code, zone, gps, timestamp } = classification;
  const peopleToken   = `P${Math.min(people_count, 9)}`;
  const locationToken = `L${zone}`;
  const packetString  = `${severity_code}-${peopleToken}-${condition_code}-${locationToken}`;

  return {
    id:       generateId(),
    packet:   packetString,
    userId,
    severity: classification.severity,
    lat:      gps?.lat,
    lng:      gps?.lng,
    ts:       timestamp,
    synced:   false,
  };
}

export function decodePacket(packetStr) {
  if (!packetStr) return null;
  const parts = packetStr.split('-');
  if (parts.length < 4) return null;
  const SEVERITY_MAP  = { C1: 'Critical', C2: 'Urgent', C3: 'Safe' };
  const CONDITION_MAP = { TI: 'Trapped + Injured', TU: 'Trapped', MH: 'Medical Emergency', FI: 'Fire', FL: 'Flood', GE: 'General Emergency' };
  return {
    severity:  SEVERITY_MAP[parts[0]]  || parts[0],
    people:    parseInt(parts[1]?.replace('P', '')) || 1,
    condition: CONDITION_MAP[parts[2]] || parts[2],
    zone:      parseInt(parts[3]?.replace('L', '')) || 0,
  };
}

export function getCompressionStats(originalMessage, packetString) {
  const originalBytes  = new TextEncoder().encode(originalMessage).length;
  const packetBytes    = new TextEncoder().encode(packetString).length;
  const savedBytes     = originalBytes - packetBytes;
  const compressionPct = Math.round((savedBytes / originalBytes) * 100);
  return { originalBytes, packetBytes, savedBytes, compressionPct };
}

function generateId() {
  return `SB-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}
