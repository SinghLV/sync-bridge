import 'dart:typed_data';
import '../models/incident.dart';

/// PACKET SHREDDER — SYNC BRIDGE
/// Compresses emergency data into a 12-byte binary packet for 2G/Mesh transmission.
class PacketShredder {
  /// Converts an Incident into a 12-byte binary representation.
  static Uint8List shred(Incident incident) {
    final bytes = ByteData(12);

    // 1. Latitude (4 bytes) - Fixed point: lat * 1,000,000
    int latInt = (incident.latitude * 1000000).toInt();
    bytes.setInt32(0, latInt);

    // 2. Longitude (4 bytes) - Fixed point: lon * 1,000,000
    int lonInt = (incident.longitude * 1000000).toInt();
    bytes.setInt32(4, lonInt);

    // 3. Severity (1 byte)
    bytes.setUint8(8, incident.severity.index);

    // 4. Category (1 byte)
    // Map categories to simple IDs
    int categoryId = _mapCategoryToId(incident.category);
    bytes.setUint8(9, categoryId);

    // 5. People Count (2 bytes)
    bytes.setUint16(10, incident.peopleCount);

    return bytes.buffer.asUint8List();
  }

  /// Reconstructs partial data from a shredded packet (for Dashboard simulation).
  static Map<String, dynamic> unshred(Uint8List packet) {
    if (packet.length != 12) throw Exception("Invalid packet length");
    final bytes = ByteData.sublistView(packet);

    double lat = bytes.getInt32(0) / 1000000.0;
    double lon = bytes.getInt32(4) / 1000000.0;
    int sevIdx = bytes.getUint8(8);
    int catId = bytes.getUint8(9);
    int people = bytes.getUint16(10);

    return {
      'lat': lat,
      'lon': lon,
      'severity_index': sevIdx,
      'category_id': catId,
      'people_count': people,
    };
  }

  static int _mapCategoryToId(String category) {
    switch (category.toUpperCase()) {
      case 'MEDICAL': return 1;
      case 'TRAPPED': return 2;
      case 'FIRE': return 3;
      case 'FLOOD': return 4;
      default: return 0;
    }
  }
}
