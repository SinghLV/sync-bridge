/**
 * SYNC BRIDGE — PRODUCTION CLOUD SYNC ENGINE
 * Designed for High-Throughput sync on Firebase Spark.
 */
import { db } from "../firebase";
import { collection, addDoc, onSnapshot, query, orderBy, limit } from "firebase/firestore";

const NTFY_TOPIC = "sync_bridge_sar_alerts_2026_main";

/**
 * Pushes a local SOS packet to the global mesh cloud.
 */
export async function pushToCloud(packet) {
  console.log("☁️ [CloudSync] Synchronizing Packet:", packet.id);
  
  try {
    // 1. Push to Firestore (The Real Backend)
    const docRef = await addDoc(collection(db, "incidents"), {
      ...packet,
      timestamp: Date.now(),
      syncedAt: new Date().toISOString()
    });
    console.log("✅ [Firestore] Data persistent in cloud:", docRef.id);

    // 2. Trigger FREE Push Notification (For Judge's phone)
    await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
      method: 'POST',
      body: `CRITICAL ALERT: ${packet.triage.status} at Sector ${packet.id.slice(-3)}. (ID: ${packet.id})`,
      headers: {
        'Title': `🚨 [${packet.severity.toUpperCase()}] SYNC BRIDGE`,
        'Priority': packet.severity === 'critical' ? '5' : '4',
        'Tags': 'rotating_light,sos'
      }
    });

    return { success: true, cloudId: docRef.id };
  } catch (err) {
    console.warn("⚠️ [CloudSync] Using Fallback (No Internet or Invalid Keys):", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Real-time listener for the Rescue Dashboard.
 */
export function subscribeToIncidents(onUpdate) {
  console.log("📡 [CloudSync] Real-time Firestore stream connected");
  
  const q = query(collection(db, "incidents"), orderBy("timestamp", "desc"), limit(50));
  
  return onSnapshot(q, (snapshot) => {
    const incidents = snapshot.docs.map(doc => ({
      ...doc.data(),
      cloudId: doc.id
    }));
    onUpdate(incidents);
  }, (err) => {
    console.error("❌ [CloudSync] Firestore Subscription Error:", err);
  });
}

export function getNtfyTopic() {
  return NTFY_TOPIC;
}
