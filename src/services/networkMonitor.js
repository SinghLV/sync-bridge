/** SYNC BRIDGE — NETWORK MONITOR */

export function isOnline() {
  return navigator.onLine;
}

export function watchNetwork(onOnline, onOffline) {
  window.addEventListener('online',  onOnline);
  window.addEventListener('offline', onOffline);
  return () => {
    window.removeEventListener('online',  onOnline);
    window.removeEventListener('offline', onOffline);
  };
}

export async function simulateSync(packets, onPacketSynced, onComplete) {
  for (const packet of packets) {
    await delay(400 + Math.random() * 600);
    onPacketSynced(packet.id);
  }
  onComplete();
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
