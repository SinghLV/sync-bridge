import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';

class DeviceLocationException implements Exception {
  final String message;

  const DeviceLocationException(this.message);

  @override
  String toString() => message;
}

class LiveLocationLock {
  final double latitude;
  final double longitude;
  final double? accuracyMeters;

  const LiveLocationLock({
    required this.latitude,
    required this.longitude,
    this.accuracyMeters,
  });
}

class DeviceLocationService {
  Future<LiveLocationLock> acquireCurrentLocation() async {
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      throw const DeviceLocationException('LOCATION_SERVICES_OFFLINE');
    }

    var permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }

    if (permission == LocationPermission.denied) {
      throw const DeviceLocationException('LOCATION_PERMISSION_DENIED');
    }

    if (permission == LocationPermission.deniedForever) {
      throw const DeviceLocationException('LOCATION_PERMISSION_LOCKED');
    }

    final fallback = await _safeLastKnownPosition();

    try {
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 12),
      ).timeout(const Duration(seconds: 12));

      return LiveLocationLock(
        latitude: position.latitude,
        longitude: position.longitude,
        accuracyMeters: position.accuracy,
      );
    } on PermissionDeniedException {
      throw kIsWeb
          ? const DeviceLocationException('BROWSER_LOCATION_DENIED')
          : const DeviceLocationException('LOCATION_PERMISSION_DENIED');
    } on LocationServiceDisabledException {
      throw const DeviceLocationException('LOCATION_SERVICES_OFFLINE');
    } on UnsupportedError {
      throw kIsWeb
          ? const DeviceLocationException('BROWSER_GEOLOCATION_UNSUPPORTED')
          : const DeviceLocationException('GPS_FIX_UNAVAILABLE');
    } on TimeoutException {
      if (fallback != null) {
        return LiveLocationLock(
          latitude: fallback.latitude,
          longitude: fallback.longitude,
          accuracyMeters: fallback.accuracy,
        );
      }
      throw const DeviceLocationException('GPS_LOCK_TIMEOUT');
    } catch (_) {
      if (fallback != null) {
        return LiveLocationLock(
          latitude: fallback.latitude,
          longitude: fallback.longitude,
          accuracyMeters: fallback.accuracy,
        );
      }
      throw const DeviceLocationException('GPS_FIX_UNAVAILABLE');
    }
  }

  Future<Position?> _safeLastKnownPosition() async {
    try {
      return await Geolocator.getLastKnownPosition();
    } on UnsupportedError {
      return null;
    } catch (_) {
      return null;
    }
  }
}
