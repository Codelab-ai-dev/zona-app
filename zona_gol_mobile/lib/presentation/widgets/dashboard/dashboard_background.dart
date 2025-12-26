import 'dart:math';
import 'package:flutter/material.dart';

/// Animated Dashboard Background
/// Creates the "Noche de Partido" stadium atmosphere effect
class DashboardBackground extends StatefulWidget {
  final Widget child;

  const DashboardBackground({
    super.key,
    required this.child,
  });

  @override
  State<DashboardBackground> createState() => _DashboardBackgroundState();
}

class _DashboardBackgroundState extends State<DashboardBackground>
    with TickerProviderStateMixin {
  late AnimationController _particleController;
  late AnimationController _lightController;
  late List<Particle> _particles;
  final Random _random = Random();

  @override
  void initState() {
    super.initState();

    // Particle animation
    _particleController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 20),
    )..repeat();

    // Stadium light pulse animation
    _lightController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 4),
    )..repeat(reverse: true);

    // Generate particles
    _particles = List.generate(25, (_) => Particle(_random));
  }

  @override
  void dispose() {
    _particleController.dispose();
    _lightController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Color(0xFF0A0F1C), // Deep night blue
            Color(0xFF0D1424), // Slightly lighter
            Color(0xFF111827), // Base dark
          ],
          stops: [0.0, 0.5, 1.0],
        ),
      ),
      child: Stack(
        children: [
          // Stadium lights (top corners)
          _buildStadiumLights(),

          // Floating particles
          AnimatedBuilder(
            animation: _particleController,
            builder: (context, child) {
              return CustomPaint(
                painter: ParticlePainter(
                  particles: _particles,
                  progress: _particleController.value,
                ),
                size: Size.infinite,
              );
            },
          ),

          // Field lines decoration (subtle)
          Positioned.fill(
            child: CustomPaint(
              painter: FieldLinesPainter(),
            ),
          ),

          // Gradient overlay for depth
          Container(
            decoration: BoxDecoration(
              gradient: RadialGradient(
                center: Alignment.topCenter,
                radius: 1.5,
                colors: [
                  const Color(0xFF10B981).withOpacity(0.03),
                  Colors.transparent,
                ],
              ),
            ),
          ),

          // Content
          widget.child,
        ],
      ),
    );
  }

  Widget _buildStadiumLights() {
    return AnimatedBuilder(
      animation: _lightController,
      builder: (context, child) {
        final pulse = 0.3 + (_lightController.value * 0.2);
        return Stack(
          children: [
            // Top left light
            Positioned(
              top: -80,
              left: -80,
              child: Container(
                width: 200,
                height: 200,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      const Color(0xFF10B981).withOpacity(pulse * 0.4),
                      const Color(0xFF10B981).withOpacity(pulse * 0.1),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
            ),
            // Top right light
            Positioned(
              top: -60,
              right: -60,
              child: Container(
                width: 180,
                height: 180,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      const Color(0xFF3B82F6).withOpacity(pulse * 0.3),
                      const Color(0xFF3B82F6).withOpacity(pulse * 0.1),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
            ),
            // Bottom center glow
            Positioned(
              bottom: -100,
              left: 0,
              right: 0,
              child: Center(
                child: Container(
                  width: 300,
                  height: 200,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(
                      colors: [
                        const Color(0xFF10B981).withOpacity(pulse * 0.15),
                        Colors.transparent,
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}

/// Particle data class
class Particle {
  late double x;
  late double y;
  late double size;
  late double speed;
  late double opacity;

  Particle(Random random) {
    x = random.nextDouble();
    y = random.nextDouble();
    size = random.nextDouble() * 2 + 1;
    speed = random.nextDouble() * 0.5 + 0.2;
    opacity = random.nextDouble() * 0.4 + 0.1;
  }
}

/// Particle painter
class ParticlePainter extends CustomPainter {
  final List<Particle> particles;
  final double progress;

  ParticlePainter({
    required this.particles,
    required this.progress,
  });

  @override
  void paint(Canvas canvas, Size size) {
    for (var particle in particles) {
      final y = (particle.y + progress * particle.speed) % 1.0;
      final paint = Paint()
        ..color = const Color(0xFF10B981).withOpacity(particle.opacity)
        ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 2);

      canvas.drawCircle(
        Offset(particle.x * size.width, y * size.height),
        particle.size,
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant ParticlePainter oldDelegate) {
    return oldDelegate.progress != progress;
  }
}

/// Field lines painter (subtle background decoration)
class FieldLinesPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFF10B981).withOpacity(0.03)
      ..strokeWidth = 1
      ..style = PaintingStyle.stroke;

    // Center circle
    canvas.drawCircle(
      Offset(size.width / 2, size.height * 0.6),
      size.width * 0.3,
      paint,
    );

    // Center line
    canvas.drawLine(
      Offset(0, size.height * 0.6),
      Offset(size.width, size.height * 0.6),
      paint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
