import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import '../models/tournament.dart';
import '../widgets/stadium_background.dart';
import 'qr_scanner_screen.dart';
import 'player_list_screen.dart';
import 'matches_list_screen.dart';
import 'finished_matches_screen.dart';

class HomeScreen extends StatefulWidget {
  final Tournament? tournament;

  const HomeScreen({super.key, this.tournament});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with TickerProviderStateMixin {
  late AnimationController _headerController;
  late AnimationController _cardsController;
  late Animation<double> _headerOpacity;
  late Animation<Offset> _headerSlide;

  @override
  void initState() {
    super.initState();
    _initAnimations();
  }

  void _initAnimations() {
    _headerController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );

    _cardsController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    );

    _headerOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _headerController,
        curve: Curves.easeOut,
      ),
    );

    _headerSlide = Tween<Offset>(
      begin: const Offset(0, -0.2),
      end: Offset.zero,
    ).animate(
      CurvedAnimation(
        parent: _headerController,
        curve: Curves.easeOutCubic,
      ),
    );

    _headerController.forward();
    Future.delayed(const Duration(milliseconds: 200), () {
      if (mounted) _cardsController.forward();
    });
  }

  @override
  void dispose() {
    _headerController.dispose();
    _cardsController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: StadiumBackground(
        child: SafeArea(
          child: Column(
            children: [
              _buildHeader(),
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 24),
                      _buildQuickActions(),
                      const SizedBox(height: 24),
                      _buildActionCards(),
                      const SizedBox(height: 32),
                      _buildFooterInfo(),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return AnimatedBuilder(
      animation: _headerController,
      builder: (context, child) {
        return SlideTransition(
          position: _headerSlide,
          child: Opacity(
            opacity: _headerOpacity.value,
            child: Container(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Back button and logo row
                  Row(
                    children: [
                      _buildBackButton(),
                      const SizedBox(width: 12),
                      Container(
                        width: 40,
                        height: 40,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(10),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFF00FF7F).withOpacity(0.15),
                              blurRadius: 10,
                            ),
                          ],
                        ),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(10),
                          child: Image.asset(
                            'assets/images/zona-gol.png',
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) {
                              return Container(
                                color: const Color(0xFF00FF7F).withOpacity(0.2),
                                child: const Icon(
                                  Icons.sports_soccer,
                                  color: Color(0xFF00FF7F),
                                  size: 20,
                                ),
                              );
                            },
                          ),
                        ),
                      ),
                      const Spacer(),
                      if (widget.tournament?.isActive ?? false)
                        _buildActiveBadge(),
                    ],
                  ),

                  const SizedBox(height: 20),

                  // Tournament name
                  if (widget.tournament != null) ...[
                    Text(
                      'Gestionando',
                      style: GoogleFonts.outfit(
                        fontSize: 13,
                        color: Colors.white.withOpacity(0.5),
                        fontWeight: FontWeight.w400,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      widget.tournament!.name,
                      style: GoogleFonts.bebasNeue(
                        fontSize: 32,
                        color: Colors.white,
                        letterSpacing: 1,
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Tournament info chips
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        _buildInfoChip(
                          icon: Icons.calendar_today,
                          text: widget.tournament!.dateRangeText,
                        ),
                        _buildStatusChip(widget.tournament!),
                      ],
                    ),
                  ] else ...[
                    Text(
                      'ZONA GOL',
                      style: GoogleFonts.bebasNeue(
                        fontSize: 32,
                        color: Colors.white,
                        letterSpacing: 2,
                      ),
                    ),
                    Text(
                      'Panel de Gestion',
                      style: GoogleFonts.outfit(
                        fontSize: 14,
                        color: Colors.white.withOpacity(0.5),
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildBackButton() {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () {
          HapticFeedback.lightImpact();
          Navigator.pop(context);
        },
        borderRadius: BorderRadius.circular(12),
        child: Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.05),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: Colors.white.withOpacity(0.1),
              width: 1,
            ),
          ),
          child: Icon(
            Icons.arrow_back,
            color: Colors.white.withOpacity(0.7),
            size: 20,
          ),
        ),
      ),
    );
  }

  Widget _buildActiveBadge() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFFFD700), Color(0xFFFFA500)],
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFFFFD700).withOpacity(0.3),
            blurRadius: 10,
            spreadRadius: -2,
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.star, size: 14, color: Colors.black87),
          const SizedBox(width: 4),
          Text(
            'ACTIVO',
            style: GoogleFonts.outfit(
              fontSize: 11,
              color: Colors.black87,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.5,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoChip({required IconData icon, required String text}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: Colors.white.withOpacity(0.1),
          width: 1,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            size: 14,
            color: Colors.white.withOpacity(0.5),
          ),
          const SizedBox(width: 6),
          Text(
            text,
            style: GoogleFonts.outfit(
              fontSize: 12,
              color: Colors.white.withOpacity(0.7),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusChip(Tournament tournament) {
    Color color;
    IconData icon;

    if (tournament.isUpcoming) {
      color = Colors.blue;
      icon = Icons.schedule;
    } else if (tournament.isOngoing) {
      color = const Color(0xFF00FF7F);
      icon = Icons.play_circle_outline;
    } else {
      color = Colors.grey;
      icon = Icons.check_circle_outline;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: color.withOpacity(0.3),
          width: 1,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 6),
          Text(
            tournament.statusText,
            style: GoogleFonts.outfit(
              fontSize: 12,
              color: color,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickActions() {
    return AnimatedBuilder(
      animation: _cardsController,
      builder: (context, child) {
        final progress = CurvedAnimation(
          parent: _cardsController,
          curve: const Interval(0.0, 0.4, curve: Curves.easeOutCubic),
        ).value;

        return Transform.translate(
          offset: Offset(0, 20 * (1 - progress)),
          child: Opacity(
            opacity: progress,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Acceso Rapido',
                  style: GoogleFonts.outfit(
                    fontSize: 13,
                    color: Colors.white.withOpacity(0.5),
                    fontWeight: FontWeight.w500,
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: _buildQuickActionButton(
                        icon: Icons.qr_code_scanner,
                        label: 'Escanear QR',
                        color: const Color(0xFF00FF7F),
                        onTap: () => _navigateTo(const QRScannerScreen()),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildQuickActionButton(
                        icon: Icons.sports_soccer,
                        label: 'Partidos',
                        color: Colors.orange,
                        onTap: () => _navigateTo(const MatchesListScreen()),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildQuickActionButton({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () {
          HapticFeedback.lightImpact();
          onTap();
        },
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                color.withOpacity(0.2),
                color.withOpacity(0.1),
              ],
            ),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: color.withOpacity(0.3),
              width: 1,
            ),
          ),
          child: Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: color.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: color, size: 20),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  label,
                  style: GoogleFonts.outfit(
                    fontSize: 13,
                    color: Colors.white,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              Icon(
                Icons.arrow_forward_ios,
                size: 14,
                color: color.withOpacity(0.7),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildActionCards() {
    final actions = [
      _ActionCardData(
        icon: Icons.sports_soccer,
        title: 'Partidos Proximos',
        subtitle: 'Gestiona los proximos encuentros',
        color: const Color(0xFF00FF7F),
        gradient: [const Color(0xFF00FF7F), const Color(0xFF00D96C)],
        onTap: () => _navigateTo(const MatchesListScreen()),
        isPrimary: true,
      ),
      _ActionCardData(
        icon: Icons.history,
        title: 'Partidos Finalizados',
        subtitle: 'Revisa resultados anteriores',
        color: Colors.blueGrey,
        gradient: [Colors.blueGrey.shade600, Colors.blueGrey.shade800],
        onTap: () => _navigateTo(const FinishedMatchesScreen()),
      ),
      _ActionCardData(
        icon: Icons.qr_code_scanner,
        title: 'Escanear Codigo QR',
        subtitle: 'Registra asistencia rapidamente',
        color: Colors.orange,
        gradient: [Colors.orange, Colors.deepOrange],
        onTap: () => _navigateTo(const QRScannerScreen()),
      ),
      _ActionCardData(
        icon: Icons.people,
        title: 'Lista de Jugadores',
        subtitle: 'Ver todos los jugadores',
        color: Colors.blue,
        gradient: [Colors.blue, Colors.blue.shade700],
        onTap: () => _navigateTo(const PlayerListScreen()),
      ),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        AnimatedBuilder(
          animation: _cardsController,
          builder: (context, child) {
            final progress = CurvedAnimation(
              parent: _cardsController,
              curve: const Interval(0.2, 0.5, curve: Curves.easeOutCubic),
            ).value;

            return Opacity(
              opacity: progress,
              child: Text(
                'Gestionar',
                style: GoogleFonts.outfit(
                  fontSize: 13,
                  color: Colors.white.withOpacity(0.5),
                  fontWeight: FontWeight.w500,
                  letterSpacing: 0.5,
                ),
              ),
            );
          },
        ),
        const SizedBox(height: 12),
        ...List.generate(actions.length, (index) {
          return AnimatedBuilder(
            animation: _cardsController,
            builder: (context, child) {
              final startInterval = 0.2 + (index * 0.12);
              final endInterval = (startInterval + 0.3).clamp(0.0, 1.0);

              final progress = CurvedAnimation(
                parent: _cardsController,
                curve: Interval(startInterval, endInterval, curve: Curves.easeOutCubic),
              ).value;

              return Transform.translate(
                offset: Offset(0, 30 * (1 - progress)),
                child: Opacity(
                  opacity: progress,
                  child: _buildActionCard(actions[index]),
                ),
              );
            },
          );
        }),
      ],
    );
  }

  Widget _buildActionCard(_ActionCardData data) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {
            HapticFeedback.lightImpact();
            data.onTap();
          },
          borderRadius: BorderRadius.circular(20),
          child: Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              gradient: data.isPrimary
                  ? LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: data.gradient,
                    )
                  : LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        Colors.white.withOpacity(0.08),
                        Colors.white.withOpacity(0.03),
                      ],
                    ),
              border: data.isPrimary
                  ? null
                  : Border.all(
                      color: Colors.white.withOpacity(0.1),
                      width: 1,
                    ),
              boxShadow: data.isPrimary
                  ? [
                      BoxShadow(
                        color: data.color.withOpacity(0.3),
                        blurRadius: 20,
                        spreadRadius: -5,
                        offset: const Offset(0, 8),
                      ),
                    ]
                  : null,
            ),
            child: Row(
              children: [
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    color: data.isPrimary
                        ? Colors.black.withOpacity(0.2)
                        : data.color.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Icon(
                    data.icon,
                    color: data.isPrimary ? Colors.white : data.color,
                    size: 26,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        data.title,
                        style: GoogleFonts.bebasNeue(
                          fontSize: 20,
                          color: data.isPrimary
                              ? const Color(0xFF0A0A0A)
                              : Colors.white,
                          letterSpacing: 0.5,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        data.subtitle,
                        style: GoogleFonts.outfit(
                          fontSize: 12,
                          color: data.isPrimary
                              ? Colors.black.withOpacity(0.6)
                              : Colors.white.withOpacity(0.5),
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: data.isPrimary
                        ? Colors.black.withOpacity(0.15)
                        : Colors.white.withOpacity(0.05),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(
                    Icons.arrow_forward,
                    size: 18,
                    color: data.isPrimary
                        ? const Color(0xFF0A0A0A)
                        : Colors.white.withOpacity(0.5),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildFooterInfo() {
    return AnimatedBuilder(
      animation: _cardsController,
      builder: (context, child) {
        final progress = CurvedAnimation(
          parent: _cardsController,
          curve: const Interval(0.7, 1.0, curve: Curves.easeOutCubic),
        ).value;

        return Opacity(
          opacity: progress * 0.7,
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.03),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: Colors.white.withOpacity(0.05),
                width: 1,
              ),
            ),
            child: Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: const Color(0xFF00FF7F).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(
                    Icons.info_outline,
                    color: const Color(0xFF00FF7F).withOpacity(0.7),
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Gestiona partidos, registra asistencia mediante QR y administra jugadores.',
                    style: GoogleFonts.outfit(
                      fontSize: 12,
                      color: Colors.white.withOpacity(0.4),
                      height: 1.4,
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  void _navigateTo(Widget screen) {
    Navigator.push(
      context,
      PageRouteBuilder(
        pageBuilder: (context, animation, secondaryAnimation) => screen,
        transitionsBuilder: (context, animation, secondaryAnimation, child) {
          return FadeTransition(
            opacity: animation,
            child: SlideTransition(
              position: Tween<Offset>(
                begin: const Offset(0.03, 0),
                end: Offset.zero,
              ).animate(CurvedAnimation(
                parent: animation,
                curve: Curves.easeOutCubic,
              )),
              child: child,
            ),
          );
        },
        transitionDuration: const Duration(milliseconds: 300),
      ),
    );
  }
}

class _ActionCardData {
  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;
  final List<Color> gradient;
  final VoidCallback onTap;
  final bool isPrimary;

  _ActionCardData({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.color,
    required this.gradient,
    required this.onTap,
    this.isPrimary = false,
  });
}
