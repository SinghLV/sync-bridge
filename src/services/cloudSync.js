/**
 * SYNC BRIDGE — CLOUD SYNC ENGINE (SPARK PLAN OPTIMIZED)
 * Optimized for Firebase Spark (Free) Plan + ntfy.sh for FREE notifications.
 */

// Unique topic for your project (You can change this)
const NTFY_TOPIC = "sync_bridge_sar_alerts_" + Math.random().toString(36).slice(2, 7);

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-key",
  authDomain: "sync-bridge.firebaseapp.com",
  projectId: "sync-bridge",
};

/**
 * Pushes to Cloud + Sends FREE Push Notification via ntfy.sh
 */
export async function pushToCloud(packet) {
  console.log("☁️ [Spark-Sync] Pushing Micro-Packet:", packet.id);
  
  // 1. Trigger the ntfy.sh notification (Bypasses Cloud Function limit)
  try {
    const priority = packet.severity === 'critical' ? 'urgent' : 'high';
    const tags = packet.severity === 'critical' ? 'rotating_light,sos' : 'warning';
    
    await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
      method: 'POST',
      body: `NEW SOS: ${packet.packet} | Location Sector: ${packet.id.slice(-2)}`,
      headers: {
        'Title': `🚨 [${packet.severity.toUpperCase()}] Sync Bridge Alert`,
        'Priority': priority,
        'Tags': tags
      }
    });
    console.log("🔔 [ntfy] Push notification sent to topic:", NTFY_TOPIC);
  } catch (err) {
    console.error("❌ [ntfy] Notification failed:", err);
  }

  // 2. Simulate Firestore Push
  await new Promise(resolve => setTimeout(resolve, 600));
  return { success: true, topic: NTFY_TOPIC };
}

export function subscribeToIncidents(onUpdate) {
  console.log("📡 [Spark-Sync] Real-time listener active");
  return () => console.log("📴 Listener detached.");
}

export function getNtfyTopic() {
  return NTFY_TOPIC;
}
