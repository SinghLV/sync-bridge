/**
 * SYNC BRIDGE — DATA PROCESSOR SERVICE
 * Handles deduplication and packet validation.
 */

const packetCache = new Set();

/**
 * Deduplicates incoming packets. 
 * In a mesh network, multiple nodes might relay the same packet.
 * This ensures the dashboard only shows unique incidents.
 */
export function deduplicatePackets(newPackets, existingPackets) {
  const unique = [];
  const existingIds = new Set(existingPackets.map(p => p.id));

  newPackets.forEach(p => {
    if (!existingIds.has(p.id) && !packetCache.has(p.id)) {
      unique.push(p);
      packetCache.add(p.id);
    }
  });

  return [...existingPackets, ...unique];
}

/**
 * Validates packet integrity (Simulated HMAC check).
 * Ensures SOS wasn't tampered with during mesh-hopping.
 */
export function validatePacket(packet) {
  // Real implementation would use crypto.subtle.verify
  return packet.packet && packet.packet.split('-').length === 4;
}
