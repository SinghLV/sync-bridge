/** SYNC BRIDGE — OFFLINE QUEUE ENGINE */

const QUEUE_KEY  = 'sync_bridge_queue';
const SYNCED_KEY = 'sync_bridge_synced';

export function enqueue(packet) {
  const queue = getQueue();
  queue.unshift({ ...packet, queuedAt: new Date().toISOString(), synced: false });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  return queue;
}

export function getQueue() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch { return []; }
}

export function getSynced() {
  try { return JSON.parse(localStorage.getItem(SYNCED_KEY) || '[]'); } catch { return []; }
}

export function markSynced(packetId) {
  const queue  = getQueue();
  const synced = getSynced();
  const idx    = queue.findIndex(p => p.id === packetId);
  if (idx !== -1) {
    const [packet] = queue.splice(idx, 1);
    packet.synced   = true;
    packet.syncedAt = new Date().toISOString();
    synced.unshift(packet);
    localStorage.setItem(QUEUE_KEY,  JSON.stringify(queue));
    localStorage.setItem(SYNCED_KEY, JSON.stringify(synced));
    return packet;
  }
  return null;
}

export function getAllPackets() {
  return [...getSynced(), ...getQueue()];
}

export function getQueueStats() {
  const queue  = getQueue();
  const synced = getSynced();
  const all    = [...queue, ...synced];
  return {
    pending:  queue.length,
    synced:   synced.length,
    total:    all.length,
    critical: all.filter(p => p.severity === 'critical').length,
    urgent:   all.filter(p => p.severity === 'urgent').length,
    standard: all.filter(p => p.severity === 'standard' || p.severity === 'safe').length,
  };
}
