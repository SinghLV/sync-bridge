/** 
 * SYNC BRIDGE — MICRO-PACKET ENCODER v2.4 (LORA/BLE Optimized)
 * 
 * DESIGN NOTES:
 * Using a dash-separated hex/token format for reliability over unstable links.
 * TODO: Move from String-based tokens to 8-bit bitfields to save another 40% bandwidth.
 * Current implementation tested with Semtech SX1276 (LoRa) at 125kHz BW.
 */

const CATEGORY_BY_CODE = {
  TI: 'CRITICAL_INJURY',
  TU: 'TRAPPED',
  MH: 'MEDICAL',
  FI: 'FIRE',
  FL: 'FLOOD',
  GE: 'GENERAL',
  OT: 'CUSTOM_INCIDENT',
};

export function encodePacket(classification, userId = 'U0') {
  const { severity_code, people_count, condition_code, zone, gps, timestamp } = classification;
  const severity = classification.severity === 'safe' ? 'standard' : classification.severity;
  const resolvedSeverityCode =
    severity_code || (severity === 'critical' ? 'C1' : severity === 'urgent' ? 'C2' : 'C3');
  const resolvedConditionCode = condition_code || 'GE';
  const normalizedZone = String(zone || 'Z04').replace(/[^A-Za-z0-9]/g, '') || 'Z04';
  const peopleToken   = `P${Math.min(people_count || 1, 9)}`;
  const locationToken = `L${normalizedZone}`;
  const packetString  = `${resolvedSeverityCode}-${peopleToken}-${resolvedConditionCode}-${locationToken}`;
  const ts = typeof timestamp === 'number' ? timestamp : Date.parse(timestamp || new Date().toISOString());
  const lon = gps?.lng;

  return {
    id:       generateId(),
    packet:   packetString,
    userId,
    severity,
    lat:      gps?.lat,
    lon,
    lng:      lon,
    ts,
    timestamp: ts,
    category: CATEGORY_BY_CODE[resolvedConditionCode] || classification.condition?.toUpperCase() || 'GENERAL',
    category_code: resolvedConditionCode,
    condition: classification.condition ?? CATEGORY_BY_CODE[resolvedConditionCode] ?? 'GENERAL',
    people_count: people_count || 1,
    confidence: classification.confidence ?? 0,
    status: 'active',
    description: classification.description ?? null,
    phone: classification.phone ?? classification.phoneNumber ?? null,
    data: {
      ai_source: classification.ai_source,
      people_count: people_count || 1,
      reasoning: classification.reasoning,
      sensor_conflict: classification.sensor_conflict,
      sensors: classification.sensors,
      triage_code: classification.triage_code || resolvedSeverityCode,
      truth_score: classification.truth_score,
    },
    synced:   false,
  };
}

export function decodePacket(packetStr) {
  if (!packetStr) return null;
  const parts = packetStr.split('-');
  if (parts.length < 4) return null;
  const SEVERITY_MAP  = { C1: 'Critical', C2: 'Urgent', C3: 'Standard' };
  const CONDITION_MAP = {
    TI: 'Trapped + Injured',
    TU: 'Trapped',
    MH: 'Medical Emergency',
    FI: 'Fire',
    FL: 'Flood',
    GE: 'General Emergency',
    OT: 'Custom Incident',
  };
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
