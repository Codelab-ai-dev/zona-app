import 'package:flutter/material.dart';
import 'dart:math' as math;

/// A premium stadium-inspired background with animated elements
class StadiumBackground extends StatefulWidget {
  final Widget? child;

  const StadiumBackground({super.key, this.child});

  @override
  State<StadiumBackground> createState() => _StadiumBackgroundState();
}

class _StadiumBackgroundState extends State<StadiumBackground>
    with TickerProviderStateMixin {
  late AnimationController _pulseController;
  late AnimationController _spotlightController;
  late Animation<double> _pulseAnimation;
  late Animation<double> _spotlightAnimation;

  @override
  void initState() {
    super.initState();

    // Subtle pulse animation for the glow effects
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 3),
    )..repeat(reverse: true);

    _pulseAnimation = Tween<double>(begin: 0.3, end: 0.6).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    // Spotlight sweep animation
    _spotlightController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 8),
    )..repeat();

    _spotlightAnimation = Tween<double>(begin: -0.5, end: 1.5).animate(
      CurvedAnimation(parent: _spotlightController, curve: Curves.linear),
    );
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _spotlightController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: Listenable.merge([_pulseAnimation, _spotlightAnimation]),
      builder: (context, child) {
        return Container(
          decoration: const BoxDecoration(
            // Deep dark gradient - stadium night sky
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                Color(0xFF0A0A0A), // Almost black
                Color(0xFF0D1F0D), // Very dark green tint
                Color(0xFF0A1A0A), // Dark green-black
                Color(0xFF050505), // Pure dark
              ],
              stops: [0.0, 0.3, 0.7, 1.0],
            ),
          ),
          child: Stack(
            children: [
              // Pitch lines pattern
              Positioned.fill(
                child: CustomPaint(
                  painter: PitchPatternPainter(
                    lineOpacity: 0.06,
                  ),
                ),
              ),

              // Animated spotlight effect from top-left
              Positioned(
                top: -100,
                left: MediaQuery.of(context).size.width * _spotlightAnimation.value - 200,
                child: Container(
                  width: 400,
                  height: 600,
                  decoration: BoxDecoration(
                    gradient: RadialGradient(
                      colors: [
                        const Color(0xFF00FF7F).withOpacity(0.03 * _pulseAnimation.value),
                        Colors.transparent,
                      ],
                    ),
                  ),
                ),
              ),

              // Static glow spots (stadium lights effect)
              Positioned(
                top: -50,
                left: -50,
                child: Container(
                  width: 300,
                  height: 300,
                  decoration: BoxDecoration(
                    gradient: RadialGradient(
                      colors: [
                        const Color(0xFF00FF7F).withOpacity(0.08 * _pulseAnimation.value),
                        Colors.transparent,
                      ],
                    ),
                  ),
                ),
              ),

              Positioned(
                top: -80,
                right: -80,
                child: Container(
                  width: 350,
                  height: 350,
                  decoration: BoxDecoration(
                    gradient: RadialGradient(
                      colors: [
                        const Color(0xFFFFD700).withOpacity(0.04 * _pulseAnimation.value),
                        Colors.transparent,
                      ],
                    ),
                  ),
                ),
              ),

              // Bottom accent glow
              Positioned(
                bottom: -100,
                left: 0,
                right: 0,
                child: Container(
                  height: 300,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.bottomCenter,
                      end: Alignment.topCenter,
                      colors: [
                        const Color(0xFF00FF7F).withOpacity(0.05),
                        Colors.transparent,
                      ],
                    ),
                  ),
                ),
              ),

              // Noise texture overlay for depth
              Positioned.fill(
                child: ShaderMask(
                  shaderCallback: (bounds) => LinearGradient(
                    colors: [
                      Colors.white.withOpacity(0.02),
                      Colors.white.withOpacity(0.01),
                    ],
                  ).createShader(bounds),
                  child: Container(
                    color: Colors.white,
                  ),
                ),
              ),

              // Main content
              if (widget.child != null) widget.child!,
            ],
          ),
        );
      },
    );
  }
}

/// Custom painter for football pitch lines pattern
class PitchPatternPainter extends CustomPainter {
  final double lineOpacity;

  PitchPatternPainter({this.lineOpacity = 0.1});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFF00FF7F).withOpacity(lineOpacity)
      ..strokeWidth = 1.0
      ..style = PaintingStyle.stroke;

    final centerX = size.width / 2;
    final centerY = size.height / 2;

    // Center circle
    canvas.drawCircle(
      Offset(centerX, centerY),
      80,
      paint,
    );

    // Center line (horizontal)
    canvas.drawLine(
      Offset(0, centerY),
      Offset(size.width, centerY),
      paint,
    );

    // Outer rectangle (pitch boundary)
    final pitchRect = RRect.fromRectAndRadius(
      Rect.fromLTWH(
        size.width * 0.05,
        size.height * 0.15,
        size.width * 0.9,
        size.height * 0.7,
      ),
      const Radius.circular(4),
    );
    canvas.drawRRect(pitchRect, paint);

    // Top penalty area
    final topPenaltyRect = Rect.fromLTWH(
      size.width * 0.25,
      size.height * 0.15,
      size.width * 0.5,
      size.height * 0.12,
    );
    canvas.drawRect(topPenaltyRect, paint);

    // Bottom penalty area
    final bottomPenaltyRect = Rect.fromLTWH(
      size.width * 0.25,
      size.height * 0.73,
      size.width * 0.5,
      size.height * 0.12,
    );
    canvas.drawRect(bottomPenaltyRect, paint);

    // Goal areas (smaller boxes)
    final topGoalRect = Rect.fromLTWH(
      size.width * 0.35,
      size.height * 0.15,
      size.width * 0.3,
      size.height * 0.05,
    );
    canvas.drawRect(topGoalRect, paint);

    final bottomGoalRect = Rect.fromLTWH(
      size.width * 0.35,
      size.height * 0.8,
      size.width * 0.3,
      size.height * 0.05,
    );
    canvas.drawRect(bottomGoalRect, paint);

    // Corner arcs
    final cornerRadius = 20.0;

    // Top-left corner
    canvas.drawArc(
      Rect.fromCircle(
        center: Offset(size.width * 0.05, size.height * 0.15),
        radius: cornerRadius,
      ),
      0,
      math.pi / 2,
      false,
      paint,
    );

    // Top-right corner
    canvas.drawArc(
      Rect.fromCircle(
        center: Offset(size.width * 0.95, size.height * 0.15),
        radius: cornerRadius,
      ),
      math.pi / 2,
      math.pi / 2,
      false,
      paint,
    );

    // Bottom-left corner
    canvas.drawArc(
      Rect.fromCircle(
        center: Offset(size.width * 0.05, size.height * 0.85),
        radius: cornerRadius,
      ),
      -math.pi / 2,
      math.pi / 2,
      false,
      paint,
    );

    // Bottom-right corner
    canvas.drawArc(
      Rect.fromCircle(
        center: Offset(size.width * 0.95, size.height * 0.85),
        radius: cornerRadius,
      ),
      math.pi,
      math.pi / 2,
      false,
      paint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Glassmorphism container for premium UI elements
class GlassContainer extends StatelessWidget {
  final Widget child;
  final double borderRadius;
  final EdgeInsets padding;
  final Color? borderColor;
  final double borderWidth;

  const GlassContainer({
    super.key,
    required this.child,
    this.borderRadius = 20,
    this.padding = const EdgeInsets.all(24),
    this.borderColor,
    this.borderWidth = 1.0,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(borderRadius),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Colors.white.withOpacity(0.08),
            Colors.white.withOpacity(0.03),
          ],
        ),
        border: Border.all(
          color: borderColor ?? const Color(0xFF00FF7F).withOpacity(0.2),
          width: borderWidth,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.3),
            blurRadius: 30,
            spreadRadius: -5,
          ),
          BoxShadow(
            color: const Color(0xFF00FF7F).withOpacity(0.05),
            blurRadius: 20,
            spreadRadius: -10,
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(borderRadius),
        child: Container(
          padding: padding,
          child: child,
        ),
      ),
    );
  }
}
