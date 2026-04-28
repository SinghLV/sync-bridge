const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { PubSub } = require('@google-cloud/pubsub');

admin.initializeApp();
const pubsub = new PubSub();

/**
 * INGEST PACKET — SYNC BRIDGE
 * Receives shredded binary packets from devices on the edge.
 * In a real-world high-traffic disaster, this function acts as a high-speed buffer.
 */
exports.ingestPacket = functions.https.onRequest(async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    try {
        const payload = req.body; // Expecting { data: "base64_shredded_packet", id: "unique_id" }
        
        console.log(`📦 Received packet for ID: ${payload.id}`);

        // 1. Publish to Pub/Sub for asynchronous processing
        const topicName = 'emergency-packets';
        const dataBuffer = Buffer.from(JSON.stringify(payload));
        
        await pubsub.topic(topicName).publish(dataBuffer);

        return res.status(202).send({ status: 'Accepted', message: 'Packet queued for sync.' });
    } catch (error) {
        console.error('❌ Ingestion Error:', error);
        return res.status(500).send('Internal Server Error');
    }
});

/**
 * PROCESS PACKET — SYNC BRIDGE
 * Triggered by Pub/Sub to unshred data and save to Firestore.
 */
exports.processEmergencyPacket = functions.pubsub.topic('emergency-packets').onPublish(async (message) => {
    const payload = message.json;
    
    // In a production app, the "Unshredding" logic from PacketShredder.dart 
    // would be mirrored here in Node.js to decode the 12-byte binary.
    
    console.log(`🔄 Processing packet: ${payload.id}`);

    // Update Firestore status to 'delivered'
    await admin.firestore().collection('incidents').doc(payload.id).update({
        networkStatus: 'delivered',
        lastBridgeSync: admin.firestore.FieldValue.serverTimestamp()
    });
});
