import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../models/incident.dart';

class TacticalMapView extends StatefulWidget {
  final List<Incident> incidents;

  const TacticalMapView({super.key, required this.incidents});

  @override
  State<TacticalMapView> createState() => _TacticalMapViewState();
}

class _TacticalMapViewState extends State<TacticalMapView>
    with SingleTickerProviderStateMixin {
  static const _fallbackCenterLat = 38.8951;
  static const _fallbackCenterLon = -77.0364;

  late final AnimationController _controller;
  String? _selectedIncidentId;

  @override
  void initState() {
    super.initState();
    _selectedIncidentId =
        widget.incidents.isNotEmpty ? widget.incidents.first.id : null;
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 3),
    )..repeat();
  }

  @override
  void didUpdateWidget(covariant TacticalMapView oldWidget) {
    super.didUpdateWidget(oldWidget);
    final selectedStillExists = widget.incidents.any(
      (incident) => incident.id == _selectedIncidentId,
    );

    if (!selectedStillExists) {
      _selectedIncidentId =
          widget.incidents.isNotEmpty ? widget.incidents.first.id : null;
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        final projected = _projectIncidents(widget.incidents);
        final selected = _resolveSelected(projected);

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFF05070A),
                border: Border.all(color: const Color(0xFF1F2937)),
              ),
              child: Row(
                children: [
                  Text(
                    'GRID: RELIEF_PROJECTION',
                    style: GoogleFonts.jetBrainsMono(
                      fontSize: 7,
                      color: const Color(0xFF475569),
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const Spacer(),
                  Text(
                    'MAP_LAYER: LOCAL_TACTICAL_FIELD',
                    style: GoogleFonts.jetBrainsMono(
                      fontSize: 7,
                      color: const Color(0xFF475569),
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: LayoutBuilder(
                builder: (context, constraints) {
                  return Container(
                    width: double.infinity,
                    decoration: const BoxDecoration(
                      gradient: RadialGradient(
                        center: Alignment.center,
                        radius: 1.05,
                        colors: [
                          Color.fromARGB(40, 59, 130, 246),
                          Color(0xFF020617),
                          Color(0xFF05070A),
                        ],
                        stops: [0.0, 0.58, 1.0],
                      ),
                    ),
                    child: Stack(
                      children: [
                        Positioned.fill(
                          child: CustomPaint(
                            painter: _MapProjectionPainter(
                              projected: projected,
                              pulse: _controller.value,
                            ),
                          ),
                        ),
                        if (projected.isEmpty)
                          Center(
                            child: Text(
                              '[ COORDINATE_LOCK_PENDING ]',
                              style: GoogleFonts.jetBrainsMono(
                                fontSize: 10,
                                color: const Color(0xFF3B82F6),
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          )
                        else ...[
                          Positioned(
                            right: 16,
                            bottom: 16,
                            child: Text(
                              'ACTIVE_MESH_NODES: ${projected.length.toString().padLeft(3, '0')}',
                              style: GoogleFonts.jetBrainsMono(
                                fontSize: 9,
                                color: const Color(0xFF3B82F6),
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                          if (selected != null)
                            Positioned(
                              left: 16,
                              bottom: 16,
                              child: _DetailCard(incident: selected.incident),
                            ),
                          for (final point in projected)
                            Positioned(
                              left: point.x * constraints.maxWidth - 18,
                              top: point.y * constraints.maxHeight - 18,
                              child: _MapMarker(
                                point: point,
                                pulse: _controller.value,
                                isSelected: point.incident.id == selected?.incident.id,
                                onTap: () => setState(
                                  () => _selectedIncidentId = point.incident.id,
                                ),
                              ),
                            ),
                        ],
                      ],
                    ),
                  );
                },
              ),
            ),
          ],
        );
      },
    );
  }

  _ProjectedIncident? _resolveSelected(List<_ProjectedIncident> projected) {
    if (projected.isEmpty) return null;
    return projected.firstWhere(
      (point) => point.incident.id == _selectedIncidentId,
      orElse: () => projected.first,
    );
  }

  List<_ProjectedIncident> _projectIncidents(List<Incident> incidents) {
    if (incidents.isEmpty) return const [];

    final points = incidents.take(18).toList().asMap().entries.map((entry) {
      final index = entry.key;
      final incident = entry.value;
      final coordinate = _resolveCoordinate(incident, index);
      return _ProjectedIncident(
        incident: incident,
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
        x: 0,
        y: 0,
      );
    }).toList();

    final lats = points.map((point) => point.latitude).toList();
    final lngs = points.map((point) => point.longitude).toList();
    final minLat = lats.reduce(math.min);
    final maxLat = lats.reduce(math.max);
    final minLng = lngs.reduce(math.min);
    final maxLng = lngs.reduce(math.max);

    final latSpan = math.max(maxLat - minLat, 0.04);
    final lngSpan = math.max(maxLng - minLng, 0.04);

    return points.asMap().entries.map((entry) {
      final index = entry.key;
      final point = entry.value;
      final baseX = 0.12 + ((point.longitude - minLng) / lngSpan) * 0.76;
      final baseY = 0.14 + ((maxLat - point.latitude) / latSpan) * 0.70;
      final jitterX = ((index % 3) - 1) * 0.014;
      final jitterY = (((index + 1) % 3) - 1) * 0.012;

      return point.copyWith(
        x: _clamp(baseX + jitterX, 0.08, 0.92),
        y: _clamp(baseY + jitterY, 0.10, 0.88),
      );
    }).toList();
  }

  _Coordinate _resolveCoordinate(Incident incident, int index) {
    final hasCoordinate = incident.latitude != 0 || incident.longitude != 0;
    if (hasCoordinate) {
      return _Coordinate(incident.latitude, incident.longitude);
    }

    final angle = (index / 8) * math.pi * 2;
    return _Coordinate(
      _fallbackCenterLat + math.sin(angle) * 0.04,
      _fallbackCenterLon + math.cos(angle) * 0.05,
    );
  }

  double _clamp(double value, double min, double max) {
    return math.min(max, math.max(min, value));
  }
}

class _DetailCard extends StatelessWidget {
  final Incident incident;

  const _DetailCard({required this.incident});

  @override
  Widget build(BuildContext context) {
    final isCritical = incident.severity == IncidentSeverity.critical;
    final color = isCritical ? const Color(0xFFF43F5E) : const Color(0xFF60A5FA);

    return Container(
      width: 240,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: const Color.fromARGB(214, 2, 6, 23),
        border: Border.all(color: const Color.fromARGB(48, 59, 130, 246)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            incident.id,
            style: GoogleFonts.jetBrainsMono(
              fontSize: 9,
              color: Colors.white,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 10),
          _DetailRow(
            label: 'SEVERITY',
            value: incident.severity.name.toUpperCase(),
            valueColor: color,
          ),
          const SizedBox(height: 6),
          _DetailRow(
            label: 'CATEGORY',
            value: incident.category,
          ),
          const SizedBox(height: 6),
          _DetailRow(
            label: 'COORD',
            value:
                '${incident.latitude.toStringAsFixed(4)}, ${incident.longitude.toStringAsFixed(4)}',
          ),
        ],
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  final String label;
  final String value;
  final Color? valueColor;

  const _DetailRow({
    required this.label,
    required this.value,
    this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: GoogleFonts.jetBrainsMono(
            fontSize: 8,
            color: const Color(0xFF64748B),
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            value,
            textAlign: TextAlign.right,
            overflow: TextOverflow.ellipsis,
            style: GoogleFonts.jetBrainsMono(
              fontSize: 8,
              color: valueColor ?? Colors.white,
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
      ],
    );
  }
}

class _MapMarker extends StatelessWidget {
  final _ProjectedIncident point;
  final double pulse;
  final bool isSelected;
  final VoidCallback onTap;

  const _MapMarker({
    required this.point,
    required this.pulse,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final isCritical = point.incident.severity == IncidentSeverity.critical;
    final color = isCritical ? const Color(0xFFF43F5E) : const Color(0xFF3B82F6);
    final scale = isSelected ? 1.0 + (math.sin(pulse * math.pi * 2) * 0.10) : 1.0;

    return GestureDetector(
      onTap: onTap,
      child: Transform.scale(
        scale: scale,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (isSelected)
              Padding(
                padding: const EdgeInsets.only(left: 14, bottom: 4),
                child: Text(
                  point.incident.id,
                  style: GoogleFonts.jetBrainsMono(
                    fontSize: 7,
                    color: const Color(0xFFDBEAFE),
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            Container(
              width: 12,
              height: 12,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: color,
                border: Border.all(color: Colors.white, width: 2),
                boxShadow: [
                  BoxShadow(
                    color: color.withValues(alpha: 0.7),
                    blurRadius: isSelected ? 16 : 10,
                    spreadRadius: isSelected ? 2 : 0,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MapProjectionPainter extends CustomPainter {
  final List<_ProjectedIncident> projected;
  final double pulse;

  const _MapProjectionPainter({
    required this.projected,
    required this.pulse,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final gridPaint = Paint()
      ..color = const Color(0xFF3B82F6).withValues(alpha: 0.05)
      ..strokeWidth = 1;

    const spacing = 44.0;
    for (double x = 0; x < size.width; x += spacing) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), gridPaint);
    }
    for (double y = 0; y < size.height; y += spacing) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), gridPaint);
    }

    final axisPaint = Paint()
      ..color = const Color(0xFF3B82F6).withValues(alpha: 0.08)
      ..strokeWidth = 1;
    canvas.drawLine(
      Offset(0, size.height / 2),
      Offset(size.width, size.height / 2),
      axisPaint,
    );
    canvas.drawLine(
      Offset(size.width / 2, 0),
      Offset(size.width / 2, size.height),
      axisPaint,
    );

    final ringPaint = Paint()
      ..color = const Color(0xFF3B82F6).withValues(alpha: 0.16)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1;

    canvas.drawOval(
      Rect.fromLTWH(
        size.width * 0.10,
        size.height * 0.12,
        size.width * 0.80,
        size.height * 0.76,
      ),
      ringPaint,
    );
    canvas.drawOval(
      Rect.fromLTWH(
        size.width * 0.22,
        size.height * 0.20,
        size.width * 0.56,
        size.height * 0.60,
      ),
      ringPaint,
    );
    canvas.drawOval(
      Rect.fromLTWH(
        size.width * 0.36,
        size.height * 0.34,
        size.width * 0.28,
        size.height * 0.32,
      ),
      ringPaint,
    );

    if (projected.length > 1) {
      final routePaint = Paint()
        ..color = const Color(0xFF3B82F6).withValues(
          alpha: 0.15 + (math.sin(pulse * math.pi * 2) * 0.04),
        )
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.4;

      final path = Path();
      final first = projected.first;
      path.moveTo(first.x * size.width, first.y * size.height);

      for (final point in projected.skip(1)) {
        path.lineTo(point.x * size.width, point.y * size.height);
      }

      canvas.drawPath(path, routePaint);
    }
  }

  @override
  bool shouldRepaint(covariant _MapProjectionPainter oldDelegate) {
    return oldDelegate.projected != projected || oldDelegate.pulse != pulse;
  }
}

class _Coordinate {
  final double latitude;
  final double longitude;

  const _Coordinate(this.latitude, this.longitude);
}

class _ProjectedIncident {
  final Incident incident;
  final double latitude;
  final double longitude;
  final double x;
  final double y;

  const _ProjectedIncident({
    required this.incident,
    required this.latitude,
    required this.longitude,
    required this.x,
    required this.y,
  });

  _ProjectedIncident copyWith({
    double? x,
    double? y,
  }) {
    return _ProjectedIncident(
      incident: incident,
      latitude: latitude,
      longitude: longitude,
      x: x ?? this.x,
      y: y ?? this.y,
    );
  }
}
