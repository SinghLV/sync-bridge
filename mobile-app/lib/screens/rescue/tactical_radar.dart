import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../models/incident.dart';

class TacticalRadar extends StatefulWidget {
  final List<Incident> incidents;

  const TacticalRadar({super.key, required this.incidents});

  @override
  State<TacticalRadar> createState() => _TacticalRadarState();
}

class _TacticalRadarState extends State<TacticalRadar>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 4),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AspectRatio(
      aspectRatio: 1,
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, child) {
          return CustomPaint(
            painter: RadarPainter(
              angle: _controller.value * 2 * math.pi,
              incidents: widget.incidents,
            ),
          );
        },
      ),
    );
  }
}

class RadarPainter extends CustomPainter {
  final double angle;
  final List<Incident> incidents;

  RadarPainter({required this.angle, required this.incidents});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2;

    final circlePaint = Paint()
      ..color = const Color(0xFF3B82F6).withValues(alpha: 0.1)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1;

    for (int i = 1; i <= 4; i++) {
      canvas.drawCircle(center, radius * (i / 4), circlePaint);
    }

    canvas.drawLine(
      Offset(center.dx - radius, center.dy),
      Offset(center.dx + radius, center.dy),
      circlePaint,
    );
    canvas.drawLine(
      Offset(center.dx, center.dy - radius),
      Offset(center.dx, center.dy + radius),
      circlePaint,
    );

    final sweepPaint = Paint()
      ..shader = SweepGradient(
        center: Alignment.center,
        startAngle: angle - 0.5,
        endAngle: angle,
        colors: [
          const Color(0xFF3B82F6).withValues(alpha: 0.0),
          const Color(0xFF3B82F6).withValues(alpha: 0.3),
        ],
        stops: const [0.0, 1.0],
      ).createShader(Rect.fromCircle(center: center, radius: radius));

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      angle - 0.5,
      0.5,
      true,
      sweepPaint,
    );

    for (var inc in incidents) {
      final seed = inc.id.hashCode;
      final r = (0.2 + (seed % 70) / 100) * radius;
      final theta = (seed % 360) * math.pi / 180;

      final x = center.dx + r * math.cos(theta);
      final y = center.dy + r * math.sin(theta);

      final isCritical = inc.severity == IncidentSeverity.critical;
      final pingColor =
          isCritical ? const Color(0xFFF43F5E) : const Color(0xFF3B82F6);

      final pulse = (math.sin(DateTime.now().millisecondsSinceEpoch / 200) + 1) / 2;

      final pingPaint = Paint()
        ..color = pingColor
        ..style = PaintingStyle.fill;

      canvas.drawCircle(
        Offset(x, y),
        (isCritical ? 4.0 : 3.0) + (pulse * 2),
        pingPaint,
      );

      canvas.drawCircle(
        Offset(x, y),
        (isCritical ? 8.0 : 6.0) + (pulse * 4),
        Paint()
          ..color = pingColor.withValues(alpha: 0.2 * (1 - pulse))
          ..style = PaintingStyle.fill,
      );
    }
  }

  @override
  bool shouldRepaint(covariant RadarPainter oldDelegate) => true;
}
