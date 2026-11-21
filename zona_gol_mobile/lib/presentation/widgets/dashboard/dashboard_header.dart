import 'dart:ui';
import 'package:flutter/material.dart';
import '../../../domain/entities/user_entity.dart';
import '../../../core/config/zona_brand.dart';

/// Dashboard Header - "Noche de Partido" Edition
/// Glassmorphism header with animated elements
class DashboardHeader extends StatefulWidget {
  final UserEntity user;

  const DashboardHeader({
    super.key,
    required this.user,
  });

  @override
  State<DashboardHeader> createState() => _DashboardHeaderState();
}

class _DashboardHeaderState extends State<DashboardHeader>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _fadeIn;
  late Animation<Offset> _slideIn;
  late Animation<double> _scaleIn;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );

    _fadeIn = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOut),
    );

    _slideIn = Tween<Offset>(
      begin: const Offset(-0.3, 0),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic));

    _scaleIn = Tween<double>(begin: 0.8, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOutBack),
    );

    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  String _getGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) {
      return 'Buenos días';
    } else if (hour < 18) {
      return 'Buenas tardes';
    } else {
      return 'Buenas noches';
    }
  }

  String _getRoleDisplayName() {
    switch (widget.user.role) {
      case 'super_admin':
        return 'Super Administrador';
      case 'league_admin':
        return 'Admin de Liga';
      case 'team_owner':
        return 'Dueño de Equipo';
      case 'public':
        return 'Usuario';
      default:
        return widget.user.role;
    }
  }

  IconData _getRoleIcon() {
    switch (widget.user.role) {
      case 'super_admin':
        return Icons.admin_panel_settings;
      case 'league_admin':
        return Icons.emoji_events;
      case 'team_owner':
        return Icons.shield;
      case 'public':
        return Icons.person;
      default:
        return Icons.verified_user;
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      bottom: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
        child: AnimatedBuilder(
          animation: _controller,
          builder: (context, child) {
            return FadeTransition(
              opacity: _fadeIn,
              child: SlideTransition(
                position: _slideIn,
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(20),
                  child: BackdropFilter(
                    filter: ImageFilter.blur(sigmaX: 15, sigmaY: 15),
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.08),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: Colors.white.withOpacity(0.1),
                          width: 1,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: ZonaColors.gol.withOpacity(0.1),
                            blurRadius: 20,
                            spreadRadius: -5,
                          ),
                        ],
                      ),
                      child: Row(
                        children: [
                          // Animated Avatar
                          ScaleTransition(
                            scale: _scaleIn,
                            child: _buildAvatar(),
                          ),
                          const SizedBox(width: 14),

                          // User Info
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                // Greeting
                                Text(
                                  _getGreeting(),
                                  style: TextStyle(
                                    color: Colors.white.withOpacity(0.6),
                                    fontSize: 13,
                                    fontWeight: FontWeight.w400,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                // Name
                                Text(
                                  widget.user.name ?? widget.user.email,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                    letterSpacing: 0.3,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const SizedBox(height: 6),
                                // Role Badge
                                _buildRoleBadge(),
                              ],
                            ),
                          ),

                          // Zona Gol, the football module of Zona OS.
                          const Column(
                            mainAxisSize: MainAxisSize.min,
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              ZonaGolMark(height: 34, semanticLabel: 'Zona Gol'),
                              SizedBox(height: 6),
                              ZonaOSLogo(height: 11),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildAvatar() {
    final initial =
        (widget.user.name?.isNotEmpty == true ? widget.user.name! : widget.user.email)
            .substring(0, 1)
            .toUpperCase();

    return Container(
      width: 52,
      height: 52,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            ZonaColors.gol,
            ZonaColors.golDark,
          ],
        ),
        boxShadow: [
          BoxShadow(
            color: ZonaColors.gol.withOpacity(0.4),
            blurRadius: 12,
            spreadRadius: -2,
          ),
        ],
      ),
      child: Center(
        child: Text(
          initial,
          style: const TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.bold,
            color: ZonaColors.onGol,
          ),
        ),
      ),
    );
  }

  Widget _buildRoleBadge() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: ZonaColors.gol.withOpacity(0.15),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: ZonaColors.gol.withOpacity(0.3),
          width: 1,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            _getRoleIcon(),
            color: ZonaColors.gol,
            size: 12,
          ),
          const SizedBox(width: 5),
          Text(
            _getRoleDisplayName(),
            style: const TextStyle(
              color: ZonaColors.gol,
              fontSize: 11,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
