import 'package:flutter/material.dart';

class TacticalContainer extends StatelessWidget {
  final Widget child;
  final Color borderColor;
  final bool showGlow;
  final double padding;
  final bool animate;

  const TacticalContainer({
    super.key,
    required this.child,
    this.borderColor = const Color(0xFF1F2937),
    this.showGlow = false,
    this.padding = 16.0,
    this.animate = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF05070A).withValues(alpha: 0.8),
        border: Border.all(
          color: showGlow ? borderColor : borderColor.withValues(alpha: 0.3),
          width: 1,
        ),
        boxShadow: showGlow ? [
          BoxShadow(
            color: borderColor.withValues(alpha: 0.1),
            blurRadius: 10,
            spreadRadius: 2,
          )
        ] : null,
      ),
      child: Stack(
        children: [
          // Corner accents
          Positioned(top: 0, left: 0, child: _Corner(color: borderColor, isTop: true, isLeft: true)),
          Positioned(top: 0, right: 0, child: _Corner(color: borderColor, isTop: true, isLeft: false)),
          Positioned(bottom: 0, left: 0, child: _Corner(color: borderColor, isTop: false, isLeft: true)),
          Positioned(bottom: 0, right: 0, child: _Corner(color: borderColor, isTop: false, isLeft: false)),
          
          Padding(
            padding: EdgeInsets.all(padding),
            child: child,
          ),
        ],
      ),
    );
  }
}

class _Corner extends StatelessWidget {
  final Color color;
  final bool isTop;
  final bool isLeft;

  const _Corner({required this.color, required this.isTop, required this.isLeft});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 8,
      height: 8,
      decoration: BoxDecoration(
        border: Border(
          top: isTop ? BorderSide(color: color, width: 2) : BorderSide.none,
          bottom: !isTop ? BorderSide(color: color, width: 2) : BorderSide.none,
          left: isLeft ? BorderSide(color: color, width: 2) : BorderSide.none,
          right: !isLeft ? BorderSide(color: color, width: 2) : BorderSide.none,
        ),
      ),
    );
  }
}

class ScanlineOverlay extends StatelessWidget {
  const ScanlineOverlay({super.key});

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      child: Opacity(
        opacity: 0.24,
        child: CustomPaint(
          painter: _ScanlinePainter(),
          child: const SizedBox.expand(),
        ),
      ),
    );
  }
}

class _ScanlinePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final linePaint = Paint()
      ..color = const Color(0xFF3B82F6).withValues(alpha: 0.06)
      ..strokeWidth = 1;

    for (double y = 0; y < size.height; y += 6) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), linePaint);
    }

    final vignettePaint = Paint()
      ..shader = const RadialGradient(
        colors: [
          Color(0x00000000),
          Color(0x22060B14),
        ],
        radius: 1.05,
      ).createShader(Offset.zero & size);

    canvas.drawRect(Offset.zero & size, vignettePaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
