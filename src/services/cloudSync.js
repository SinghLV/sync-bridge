/**
 * SYNC BRIDGE — PRODUCTION CLOUD SYNC ENGINE
 * Designed for High-Throughput sync on Firebase Spark.
 */
import { db } from "../firebase";
import { collection, doc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { normalizeIncident, toFirestoreIncident } from "./incidentBridge";

const NTFY_TOPIC = "sync_bridge_sar_alerts_2026_main";

/**
 * Pushes a local SOS packet to the global mesh cloud.
 */
export async function pushToCloud(packet) {
  console.log("☁️ [CloudSync] Synchronizing Packet:", packet.id);
  const incident = toFirestoreIncident(packet);

  try {
    await setDoc(doc(db, "incidents", incident.id), incident, { merge: true });
    console.log("✅ [Firestore] Data persistent in cloud:", incident.id);

    try {
      await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
        method: 'POST',
        body: `CRITICAL ALERT: ${incident.category} // ${incident.people_count} survivor(s) // ID ${incident.id}`,
        headers: {
          'Title': `SYNC BRIDGE [${incident.severity.toUpperCase()}]`,
          'Priority': incident.severity === 'critical' ? '5' : '4',
          'Tags': 'rotating_light,sos',
        },
      });
    } catch (notificationError) {
      console.warn("⚠️ [CloudSync] Notification relay skipped:", notificationError.message);
    }

    return { success: true, cloudId: incident.id };
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

  return onSnapshot(collection(db, "incidents"), (snapshot) => {
    const incidents = snapshot.docs
      .map((snapshotDoc) => normalizeIncident(snapshotDoc.data(), snapshotDoc.id))
      .sort((left, right) => right.ts - left.ts);

    onUpdate(incidents);
  }, (err) => {
    console.error("❌ [CloudSync] Firestore Subscription Error:", err);
  });
}

export async function claimIncident(docId, teamName = 'STRIKE_ALPHA') {
  await updateDoc(doc(db, "incidents", docId), {
    status: 'claimed',
    claimed_by: teamName,
  });
}

export function getNtfyTopic() {
  return NTFY_TOPIC;
}
