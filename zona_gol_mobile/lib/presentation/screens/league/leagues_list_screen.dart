import 'dart:convert';
import 'dart:math' as math;
import 'dart:typed_data';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/di/injection.dart';
import '../../../domain/entities/league_entity.dart';
import '../../bloc/league/league_bloc.dart';
import '../../bloc/league/league_event.dart';
import '../../bloc/league/league_state.dart';
import 'league_detail_screen.dart';

/// Stadium Nights Design System
class _StadiumNights {
  // Core palette - Deep night with golden floodlights
  static const Color backgroundDark = Color(0xFF050508);
  static const Color surfaceDark = Color(0xFF0A0A0F);
  static const Color cardDark = Color(0xFF12121A);

  // Accent colors - Stadium lights
  static const Color gold = Color(0xFFFFD700);
  static const Color goldLight = Color(0xFFFFF0B3);
  static const Color amber = Color(0xFFF59E0B);

  // Neon accents - Scoreboard style
  static const Color neonGreen = Color(0xFF00FF7F);
  static const Color neonBlue = Color(0xFF00BFFF);

  // Status colors
  static const Color success = Color(0xFF10B981);
  static const Color error = Color(0xFFEF4444);
  static const Color inactive = Color(0xFF6B7280);

  // Text hierarchy
  static const Color textPrimary = Color(0xFFFAFAFA);
  static const Color textSecondary = Color(0xFF9CA3AF);
  static const Color textMuted = Color(0xFF6B7280);
}

/// Leagues List Screen - Stadium Nights Edition
/// A bold, immersive interface for managing football leagues
class LeaguesListScreen extends StatelessWidget {
  final bool isSuperAdmin;

  const LeaguesListScreen({
    super.key,
    this.isSuperAdmin = true,
  });

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) => sl<LeagueBloc>()..add(const LoadAllLeaguesEvent()),
      child: _LeaguesListView(isSuperAdmin: isSuperAdmin),
    );
  }
}

class _LeaguesListView extends StatefulWidget {
  final bool isSuperAdmin;

  const _LeaguesListView({required this.isSuperAdmin});

  @override
  State<_LeaguesListView> createState() => _LeaguesListViewState();
}

class _LeaguesListViewState extends State<_LeaguesListView>
    with TickerProviderStateMixin {
  late AnimationController _headerController;
  late AnimationController _listController;
  late Animation<double> _headerAnimation;
  late Animation<double> _spotlightAnimation;

  String _searchQuery = '';
  String _statusFilter = 'all'; // all, active, inactive
  final TextEditingController _searchController = TextEditingController();
  final FocusNode _searchFocusNode = FocusNode();

  @override
  void initState() {
    super.initState();

    _headerController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    );

    _listController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );

    _headerAnimation = CurvedAnimation(
      parent: _headerController,
      curve: Curves.easeOutCubic,
    );

    _spotlightAnimation = Tween<double>(begin: 0, end: 1).animate(
      CurvedAnimation(
        parent: _headerController,
        curve: const Interval(0.3, 1.0, curve: Curves.easeOut),
      ),
    );

    _headerController.forward();
  }

  @override
  void dispose() {
    _headerController.dispose();
    _listController.dispose();
    _searchController.dispose();
    _searchFocusNode.dispose();
    super.dispose();
  }

  List<LeagueEntity> _filterLeagues(List<LeagueEntity> leagues) {
    return leagues.where((league) {
      // Status filter
      if (_statusFilter == 'active' && !league.isActive) return false;
      if (_statusFilter == 'inactive' && league.isActive) return false;

      // Search filter
      if (_searchQuery.isNotEmpty) {
        final query = _searchQuery.toLowerCase();
        return league.name.toLowerCase().contains(query) ||
               league.description.toLowerCase().contains(query) ||
               league.slug.toLowerCase().contains(query);
      }

      return true;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light.copyWith(
        statusBarColor: Colors.transparent,
        systemNavigationBarColor: _StadiumNights.backgroundDark,
      ),
      child: Scaffold(
        backgroundColor: _StadiumNights.backgroundDark,
        body: Stack(
          children: [
            // Animated background with stadium field pattern
            const _StadiumFieldBackground(),

            // Spotlight effects
            _buildSpotlightEffects(),

            // Main content
            SafeArea(
              child: Column(
                children: [
                  // Header
                  _buildAnimatedHeader(),

                  // Search and filters
                  _buildSearchAndFilters(),

                  // Leagues list
                  Expanded(
                    child: BlocConsumer<LeagueBloc, LeagueState>(
                      listener: _handleBlocState,
                      builder: (context, state) {
                        if (state is LeagueLoading) {
                          return _buildLoadingState();
                        }

                        if (state is LeagueError) {
                          return _buildErrorState(state.message);
                        }

                        if (state is LeaguesLoaded) {
                          final filteredLeagues = _filterLeagues(state.leagues);

                          if (state.leagues.isEmpty) {
                            return _buildEmptyState();
                          }

                          if (filteredLeagues.isEmpty) {
                            return _buildNoResultsState();
                          }

                          _listController.forward();
                          return _buildLeaguesList(filteredLeagues);
                        }

                        return _buildLoadingState();
                      },
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSpotlightEffects() {
    return AnimatedBuilder(
      animation: _spotlightAnimation,
      builder: (context, child) {
        return Stack(
          children: [
            // Top-left spotlight
            Positioned(
              top: -100,
              left: -50,
              child: Opacity(
                opacity: 0.3 * _spotlightAnimation.value,
                child: Container(
                  width: 300,
                  height: 400,
                  decoration: BoxDecoration(
                    gradient: RadialGradient(
                      colors: [
                        _StadiumNights.gold.withOpacity(0.4),
                        _StadiumNights.gold.withOpacity(0.1),
                        Colors.transparent,
                      ],
                      stops: const [0.0, 0.4, 1.0],
                    ),
                  ),
                ),
              ),
            ),
            // Top-right spotlight
            Positioned(
              top: -80,
              right: -80,
              child: Opacity(
                opacity: 0.25 * _spotlightAnimation.value,
                child: Container(
                  width: 350,
                  height: 350,
                  decoration: BoxDecoration(
                    gradient: RadialGradient(
                      colors: [
                        _StadiumNights.amber.withOpacity(0.3),
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

  Widget _buildAnimatedHeader() {
    return AnimatedBuilder(
      animation: _headerAnimation,
      builder: (context, child) {
        return Transform.translate(
          offset: Offset(0, -30 * (1 - _headerAnimation.value)),
          child: Opacity(
            opacity: _headerAnimation.value,
            child: Container(
              padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
              child: Row(
                children: [
                  // Back button with glow
                  GestureDetector(
                    onTap: () {
                      HapticFeedback.lightImpact();
                      Navigator.pop(context);
                    },
                    child: Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: _StadiumNights.cardDark,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: _StadiumNights.gold.withOpacity(0.2),
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: _StadiumNights.gold.withOpacity(0.1),
                            blurRadius: 12,
                            spreadRadius: -2,
                          ),
                        ],
                      ),
                      child: Icon(
                        Icons.arrow_back,
                        color: _StadiumNights.gold,
                        size: 20,
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),

                  // Title with trophy
                  Expanded(
                    child: Row(
                      children: [
                        // Animated trophy
                        _AnimatedTrophy(animation: _headerAnimation),
                        const SizedBox(width: 12),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'LIGAS',
                              style: GoogleFonts.bebasNeue(
                                fontSize: 32,
                                color: _StadiumNights.textPrimary,
                                letterSpacing: 4,
                                height: 1,
                              ),
                            ),
                            Text(
                              'Gestiona tus competiciones',
                              style: GoogleFonts.outfit(
                                fontSize: 12,
                                color: _StadiumNights.gold,
                                letterSpacing: 0.5,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  // Add button (super admin only)
                  if (widget.isSuperAdmin)
                    _buildAddButton(),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildAddButton() {
    return GestureDetector(
      onTap: () {
        HapticFeedback.mediumImpact();
        // Navigate to create league
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Crear nueva liga',
              style: GoogleFonts.outfit(color: Colors.white),
            ),
            backgroundColor: _StadiumNights.neonGreen,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        );
      },
      child: Container(
        width: 44,
        height: 44,
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              _StadiumNights.neonGreen,
              _StadiumNights.neonGreen.withOpacity(0.8),
            ],
          ),
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: _StadiumNights.neonGreen.withOpacity(0.4),
              blurRadius: 16,
              spreadRadius: -2,
            ),
          ],
        ),
        child: const Icon(
          Icons.add,
          color: Colors.black,
          size: 22,
        ),
      ),
    );
  }

  Widget _buildSearchAndFilters() {
    return AnimatedBuilder(
      animation: _headerAnimation,
      builder: (context, child) {
        return Transform.translate(
          offset: Offset(0, -20 * (1 - _headerAnimation.value)),
          child: Opacity(
            opacity: _headerAnimation.value,
            child: Container(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
              child: Column(
                children: [
                  // Search bar
                  Container(
                    decoration: BoxDecoration(
                      color: _StadiumNights.cardDark,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: _searchFocusNode.hasFocus
                            ? _StadiumNights.gold.withOpacity(0.5)
                            : Colors.white.withOpacity(0.1),
                        width: 1.5,
                      ),
                    ),
                    child: TextField(
                      controller: _searchController,
                      focusNode: _searchFocusNode,
                      onChanged: (value) {
                        setState(() => _searchQuery = value);
                      },
                      cursorColor: _StadiumNights.gold,
                      style: GoogleFonts.outfit(
                        color: Colors.white,
                        fontSize: 15,
                        fontWeight: FontWeight.w500,
                      ),
                      decoration: InputDecoration(
                        hintText: 'Buscar ligas...',
                        hintStyle: GoogleFonts.outfit(
                          color: Colors.white.withOpacity(0.4),
                          fontSize: 15,
                        ),
                        prefixIcon: Icon(
                          Icons.search,
                          color: _StadiumNights.gold.withOpacity(0.7),
                          size: 22,
                        ),
                        suffixIcon: _searchQuery.isNotEmpty
                            ? GestureDetector(
                                onTap: () {
                                  _searchController.clear();
                                  setState(() => _searchQuery = '');
                                },
                                child: Icon(
                                  Icons.close,
                                  color: Colors.white.withOpacity(0.5),
                                  size: 20,
                                ),
                              )
                            : null,
                        border: InputBorder.none,
                        enabledBorder: InputBorder.none,
                        focusedBorder: InputBorder.none,
                        errorBorder: InputBorder.none,
                        disabledBorder: InputBorder.none,
                        focusedErrorBorder: InputBorder.none,
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 16,
                        ),
                        filled: false,
                      ),
                    ),
                  ),

                  const SizedBox(height: 12),

                  // Filter chips
                  Row(
                    children: [
                      _buildFilterChip('all', 'Todas', Icons.grid_view),
                      const SizedBox(width: 8),
                      _buildFilterChip('active', 'Activas', Icons.check_circle),
                      const SizedBox(width: 8),
                      _buildFilterChip('inactive', 'Inactivas', Icons.pause_circle),
                    ],
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildFilterChip(String value, String label, IconData icon) {
    final isSelected = _statusFilter == value;

    return GestureDetector(
      onTap: () {
        HapticFeedback.selectionClick();
        setState(() => _statusFilter = value);
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected
              ? _StadiumNights.gold.withOpacity(0.15)
              : _StadiumNights.cardDark,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isSelected
                ? _StadiumNights.gold.withOpacity(0.5)
                : Colors.white.withOpacity(0.05),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 14,
              color: isSelected
                  ? _StadiumNights.gold
                  : _StadiumNights.textMuted,
            ),
            const SizedBox(width: 6),
            Text(
              label,
              style: GoogleFonts.outfit(
                fontSize: 12,
                color: isSelected
                    ? _StadiumNights.gold
                    : _StadiumNights.textSecondary,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLeaguesList(List<LeagueEntity> leagues) {
    return RefreshIndicator(
      onRefresh: () async {
        context.read<LeagueBloc>().add(const LoadAllLeaguesEvent());
      },
      color: _StadiumNights.gold,
      backgroundColor: _StadiumNights.cardDark,
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 100),
        itemCount: leagues.length,
        itemBuilder: (context, index) {
          return _LeagueCard(
            league: leagues[index],
            index: index,
            isSuperAdmin: widget.isSuperAdmin,
            listController: _listController,
          );
        },
      ),
    );
  }

  Widget _buildLoadingState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Animated loading indicator
          SizedBox(
            width: 60,
            height: 60,
            child: CircularProgressIndicator(
              strokeWidth: 3,
              valueColor: AlwaysStoppedAnimation<Color>(_StadiumNights.gold),
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'CARGANDO LIGAS',
            style: GoogleFonts.bebasNeue(
              fontSize: 18,
              color: _StadiumNights.textSecondary,
              letterSpacing: 2,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorState(String message) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Error icon with glow
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: _StadiumNights.error.withOpacity(0.1),
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: _StadiumNights.error.withOpacity(0.2),
                    blurRadius: 30,
                    spreadRadius: 5,
                  ),
                ],
              ),
              child: Icon(
                Icons.error_outline,
                size: 40,
                color: _StadiumNights.error,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'ERROR AL CARGAR',
              style: GoogleFonts.bebasNeue(
                fontSize: 24,
                color: _StadiumNights.textPrimary,
                letterSpacing: 2,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              message,
              textAlign: TextAlign.center,
              style: GoogleFonts.outfit(
                fontSize: 14,
                color: _StadiumNights.textSecondary,
              ),
            ),
            const SizedBox(height: 32),
            _buildRetryButton(),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Empty trophy illustration
            Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  colors: [
                    _StadiumNights.gold.withOpacity(0.1),
                    Colors.transparent,
                  ],
                ),
              ),
              child: Stack(
                alignment: Alignment.center,
                children: [
                  Icon(
                    Icons.emoji_events_outlined,
                    size: 64,
                    color: _StadiumNights.gold.withOpacity(0.5),
                  ),
                  // Shine effect
                  Positioned(
                    top: 20,
                    right: 30,
                    child: Container(
                      width: 12,
                      height: 12,
                      decoration: BoxDecoration(
                        color: _StadiumNights.goldLight.withOpacity(0.8),
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: _StadiumNights.gold.withOpacity(0.5),
                            blurRadius: 10,
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'SIN LIGAS',
              style: GoogleFonts.bebasNeue(
                fontSize: 28,
                color: _StadiumNights.textPrimary,
                letterSpacing: 3,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Aún no hay ligas registradas.\nCrea tu primera liga para comenzar.',
              textAlign: TextAlign.center,
              style: GoogleFonts.outfit(
                fontSize: 14,
                color: _StadiumNights.textSecondary,
                height: 1.5,
              ),
            ),
            if (widget.isSuperAdmin) ...[
              const SizedBox(height: 32),
              _buildCreateLeagueButton(),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildNoResultsState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.search_off,
              size: 64,
              color: _StadiumNights.textMuted,
            ),
            const SizedBox(height: 24),
            Text(
              'SIN RESULTADOS',
              style: GoogleFonts.bebasNeue(
                fontSize: 24,
                color: _StadiumNights.textPrimary,
                letterSpacing: 2,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'No se encontraron ligas con esos filtros',
              textAlign: TextAlign.center,
              style: GoogleFonts.outfit(
                fontSize: 14,
                color: _StadiumNights.textSecondary,
              ),
            ),
            const SizedBox(height: 24),
            GestureDetector(
              onTap: () {
                _searchController.clear();
                setState(() {
                  _searchQuery = '';
                  _statusFilter = 'all';
                });
              },
              child: Text(
                'Limpiar filtros',
                style: GoogleFonts.outfit(
                  fontSize: 14,
                  color: _StadiumNights.gold,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRetryButton() {
    return GestureDetector(
      onTap: () {
        HapticFeedback.mediumImpact();
        context.read<LeagueBloc>().add(const LoadAllLeaguesEvent());
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [
              _StadiumNights.gold,
              _StadiumNights.amber,
            ],
          ),
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: _StadiumNights.gold.withOpacity(0.3),
              blurRadius: 16,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.refresh, color: Colors.black, size: 18),
            const SizedBox(width: 8),
            Text(
              'REINTENTAR',
              style: GoogleFonts.bebasNeue(
                fontSize: 16,
                color: Colors.black,
                letterSpacing: 1,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCreateLeagueButton() {
    return GestureDetector(
      onTap: () {
        HapticFeedback.mediumImpact();
        // Navigate to create league
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [
              _StadiumNights.neonGreen,
              _StadiumNights.neonGreen.withOpacity(0.8),
            ],
          ),
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: _StadiumNights.neonGreen.withOpacity(0.3),
              blurRadius: 16,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.add, color: Colors.black, size: 18),
            const SizedBox(width: 8),
            Text(
              'CREAR LIGA',
              style: GoogleFonts.bebasNeue(
                fontSize: 16,
                color: Colors.black,
                letterSpacing: 1,
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _handleBlocState(BuildContext context, LeagueState state) {
    if (state is LeagueUpdated) {
      _showSuccessMessage('Liga "${state.league.name}" actualizada');
      context.read<LeagueBloc>().add(const LoadAllLeaguesEvent());
    } else if (state is LeagueDeleted) {
      _showSuccessMessage('Liga eliminada correctamente');
      context.read<LeagueBloc>().add(const LoadAllLeaguesEvent());
    } else if (state is LeagueStatusToggled) {
      _showSuccessMessage(
        'Liga ${state.league.isActive ? "activada" : "desactivada"}',
      );
      context.read<LeagueBloc>().add(const LoadAllLeaguesEvent());
    } else if (state is LeagueError) {
      _showErrorMessage(state.message);
    }
  }

  void _showSuccessMessage(String message) {
    HapticFeedback.mediumImpact();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(Icons.check_circle, color: Colors.black, size: 20),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                message,
                style: GoogleFonts.outfit(
                  color: Colors.black,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ],
        ),
        backgroundColor: _StadiumNights.neonGreen,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        margin: const EdgeInsets.all(16),
      ),
    );
  }

  void _showErrorMessage(String message) {
    HapticFeedback.heavyImpact();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.error, color: Colors.white, size: 20),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                message,
                style: GoogleFonts.outfit(color: Colors.white),
              ),
            ),
          ],
        ),
        backgroundColor: _StadiumNights.error,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        margin: const EdgeInsets.all(16),
      ),
    );
  }
}

/// Animated Trophy Widget
class _AnimatedTrophy extends StatelessWidget {
  final Animation<double> animation;

  const _AnimatedTrophy({required this.animation});

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: animation,
      builder: (context, child) {
        return Transform.scale(
          scale: 0.8 + (0.2 * animation.value),
          child: Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  _StadiumNights.gold,
                  _StadiumNights.amber,
                ],
              ),
              borderRadius: BorderRadius.circular(14),
              boxShadow: [
                BoxShadow(
                  color: _StadiumNights.gold.withOpacity(0.4 * animation.value),
                  blurRadius: 20,
                  spreadRadius: 2,
                ),
              ],
            ),
            child: const Icon(
              Icons.emoji_events,
              color: Colors.black,
              size: 26,
            ),
          ),
        );
      },
    );
  }
}

/// League Card with glassmorphism and animations
class _LeagueCard extends StatefulWidget {
  final LeagueEntity league;
  final int index;
  final bool isSuperAdmin;
  final AnimationController listController;

  const _LeagueCard({
    required this.league,
    required this.index,
    required this.isSuperAdmin,
    required this.listController,
  });

  @override
  State<_LeagueCard> createState() => _LeagueCardState();
}

class _LeagueCardState extends State<_LeagueCard>
    with SingleTickerProviderStateMixin {
  late AnimationController _hoverController;
  late Animation<double> _scaleAnimation;
  bool _isPressed = false;

  @override
  void initState() {
    super.initState();
    _hoverController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 150),
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 0.98).animate(
      CurvedAnimation(parent: _hoverController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _hoverController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Staggered animation delay based on index
    final delay = widget.index * 0.1;
    final animation = CurvedAnimation(
      parent: widget.listController,
      curve: Interval(
        delay.clamp(0.0, 0.5),
        (delay + 0.5).clamp(0.0, 1.0),
        curve: Curves.easeOutCubic,
      ),
    );

    return AnimatedBuilder(
      animation: animation,
      builder: (context, child) {
        return Transform.translate(
          offset: Offset(0, 30 * (1 - animation.value)),
          child: Opacity(
            opacity: animation.value,
            child: child,
          ),
        );
      },
      child: _buildCard(),
    );
  }

  Widget _buildCard() {
    return GestureDetector(
      onTapDown: (_) {
        setState(() => _isPressed = true);
        _hoverController.forward();
      },
      onTapUp: (_) {
        setState(() => _isPressed = false);
        _hoverController.reverse();
        HapticFeedback.lightImpact();
        Navigator.of(context).push(
          PageRouteBuilder(
            pageBuilder: (context, animation, secondaryAnimation) =>
                LeagueDetailScreen(league: widget.league),
            transitionsBuilder: (context, animation, secondaryAnimation, child) {
              return FadeTransition(
                opacity: animation,
                child: SlideTransition(
                  position: Tween<Offset>(
                    begin: const Offset(0.05, 0),
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
      },
      onTapCancel: () {
        setState(() => _isPressed = false);
        _hoverController.reverse();
      },
      child: AnimatedBuilder(
        animation: _scaleAnimation,
        builder: (context, child) {
          return Transform.scale(
            scale: _scaleAnimation.value,
            child: child,
          );
        },
        child: Container(
          margin: const EdgeInsets.only(bottom: 16),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(20),
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
              child: Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: [
                      Colors.white.withOpacity(0.08),
                      Colors.white.withOpacity(0.03),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: widget.league.isActive
                        ? _StadiumNights.gold.withOpacity(0.2)
                        : Colors.white.withOpacity(0.05),
                  ),
                  boxShadow: [
                    if (widget.league.isActive)
                      BoxShadow(
                        color: _StadiumNights.gold.withOpacity(0.1),
                        blurRadius: 20,
                        spreadRadius: -5,
                      ),
                  ],
                ),
                child: Column(
                  children: [
                    Row(
                      children: [
                        // League Logo
                        _buildLeagueLogo(),
                        const SizedBox(width: 16),

                        // League info
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Name
                              Text(
                                widget.league.name,
                                style: GoogleFonts.bebasNeue(
                                  fontSize: 22,
                                  color: _StadiumNights.textPrimary,
                                  letterSpacing: 1,
                                ),
                              ),
                              const SizedBox(height: 4),

                              // Description
                              Text(
                                widget.league.description,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: GoogleFonts.outfit(
                                  fontSize: 13,
                                  color: _StadiumNights.textSecondary,
                                  height: 1.4,
                                ),
                              ),
                              const SizedBox(height: 10),

                              // Status and slug
                              Row(
                                children: [
                                  _buildStatusBadge(),
                                  const SizedBox(width: 10),
                                  Text(
                                    '/${widget.league.slug}',
                                    style: GoogleFonts.jetBrainsMono(
                                      fontSize: 11,
                                      color: _StadiumNights.textMuted,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),

                        // Action area
                        if (widget.isSuperAdmin)
                          _buildMenuButton()
                        else
                          Icon(
                            Icons.arrow_forward_ios,
                            size: 16,
                            color: _StadiumNights.textMuted,
                          ),
                      ],
                    ),

                    // Admin action buttons
                    if (widget.isSuperAdmin) ...[
                      const SizedBox(height: 16),
                      Container(
                        height: 1,
                        color: Colors.white.withOpacity(0.05),
                      ),
                      const SizedBox(height: 12),
                      _buildActionButtons(),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildLeagueLogo() {
    return Container(
      width: 64,
      height: 64,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: widget.league.isActive
              ? [
                  _StadiumNights.gold.withOpacity(0.2),
                  _StadiumNights.amber.withOpacity(0.1),
                ]
              : [
                  _StadiumNights.inactive.withOpacity(0.2),
                  _StadiumNights.inactive.withOpacity(0.1),
                ],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: widget.league.isActive
              ? _StadiumNights.gold.withOpacity(0.3)
              : _StadiumNights.inactive.withOpacity(0.2),
        ),
      ),
      child: widget.league.hasLogo
          ? ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: _buildLogoImage(),
            )
          : Icon(
              Icons.emoji_events,
              size: 32,
              color: widget.league.isActive
                  ? _StadiumNights.gold
                  : _StadiumNights.inactive,
            ),
    );
  }

  Widget _buildLogoImage() {
    try {
      if (widget.league.logo!.startsWith('data:image/')) {
        final base64Data = widget.league.logo!.split(',')[1];
        final Uint8List bytes = base64Decode(base64Data);
        return Image.memory(
          bytes,
          width: 64,
          height: 64,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => _buildFallbackLogo(),
        );
      } else {
        return Image.network(
          widget.league.logo!,
          width: 64,
          height: 64,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => _buildFallbackLogo(),
        );
      }
    } catch (e) {
      return _buildFallbackLogo();
    }
  }

  Widget _buildFallbackLogo() {
    return Icon(
      Icons.emoji_events,
      size: 32,
      color: _StadiumNights.gold,
    );
  }

  Widget _buildStatusBadge() {
    final isActive = widget.league.isActive;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: isActive
            ? _StadiumNights.neonGreen.withOpacity(0.15)
            : _StadiumNights.inactive.withOpacity(0.15),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(
          color: isActive
              ? _StadiumNights.neonGreen.withOpacity(0.3)
              : _StadiumNights.inactive.withOpacity(0.3),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(
              color: isActive ? _StadiumNights.neonGreen : _StadiumNights.inactive,
              shape: BoxShape.circle,
              boxShadow: isActive
                  ? [
                      BoxShadow(
                        color: _StadiumNights.neonGreen.withOpacity(0.5),
                        blurRadius: 4,
                      ),
                    ]
                  : null,
            ),
          ),
          const SizedBox(width: 6),
          Text(
            widget.league.statusText,
            style: GoogleFonts.outfit(
              fontSize: 11,
              color: isActive ? _StadiumNights.neonGreen : _StadiumNights.inactive,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMenuButton() {
    return PopupMenuButton<String>(
      icon: Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.05),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(
          Icons.more_vert,
          color: _StadiumNights.textMuted,
          size: 18,
        ),
      ),
      color: _StadiumNights.cardDark,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: Colors.white.withOpacity(0.1)),
      ),
      onSelected: (value) => _handleMenuAction(value),
      itemBuilder: (context) => [
        _buildMenuItem('edit', Icons.edit, 'Editar', _StadiumNights.gold),
        _buildMenuItem(
          'toggle',
          widget.league.isActive ? Icons.visibility_off : Icons.visibility,
          widget.league.isActive ? 'Desactivar' : 'Activar',
          _StadiumNights.neonBlue,
        ),
        _buildMenuItem('delete', Icons.delete, 'Eliminar', _StadiumNights.error),
      ],
    );
  }

  PopupMenuItem<String> _buildMenuItem(
    String value,
    IconData icon,
    String label,
    Color color,
  ) {
    return PopupMenuItem(
      value: value,
      child: Row(
        children: [
          Icon(icon, size: 18, color: color),
          const SizedBox(width: 12),
          Text(
            label,
            style: GoogleFonts.outfit(
              color: value == 'delete' ? color : _StadiumNights.textPrimary,
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionButtons() {
    return Row(
      children: [
        Expanded(
          child: _ActionChip(
            icon: Icons.edit,
            label: 'Editar',
            color: _StadiumNights.gold,
            onTap: () => _showEditDialog(),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _ActionChip(
            icon: widget.league.isActive
                ? Icons.visibility_off
                : Icons.visibility,
            label: widget.league.isActive ? 'Desactivar' : 'Activar',
            color: _StadiumNights.neonBlue,
            onTap: () => _toggleStatus(),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _ActionChip(
            icon: Icons.delete,
            label: 'Eliminar',
            color: _StadiumNights.error,
            onTap: () => _confirmDelete(),
          ),
        ),
      ],
    );
  }

  void _handleMenuAction(String action) {
    HapticFeedback.lightImpact();
    switch (action) {
      case 'edit':
        _showEditDialog();
        break;
      case 'toggle':
        _toggleStatus();
        break;
      case 'delete':
        _confirmDelete();
        break;
    }
  }

  void _showEditDialog() {
    final nameController = TextEditingController(text: widget.league.name);
    final slugController = TextEditingController(text: widget.league.slug);
    final descriptionController =
        TextEditingController(text: widget.league.description);
    final formKey = GlobalKey<FormState>();

    showDialog(
      context: context,
      builder: (dialogContext) => Dialog(
        backgroundColor: Colors.transparent,
        child: Container(
          constraints: const BoxConstraints(maxWidth: 400),
          decoration: BoxDecoration(
            color: _StadiumNights.surfaceDark,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: _StadiumNights.gold.withOpacity(0.2)),
          ),
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Form(
              key: formKey,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header
                  Row(
                    children: [
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: _StadiumNights.gold.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(
                          Icons.edit,
                          color: _StadiumNights.gold,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Text(
                        'EDITAR LIGA',
                        style: GoogleFonts.bebasNeue(
                          fontSize: 24,
                          color: _StadiumNights.textPrimary,
                          letterSpacing: 2,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Form fields
                  _buildTextField(
                    controller: nameController,
                    label: 'Nombre',
                    icon: Icons.title,
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'El nombre es requerido';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),
                  _buildTextField(
                    controller: slugController,
                    label: 'Slug (URL)',
                    icon: Icons.link,
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'El slug es requerido';
                      }
                      if (!RegExp(r'^[a-z0-9]+(?:-[a-z0-9]+)*$').hasMatch(value)) {
                        return 'Solo minúsculas, números y guiones';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),
                  _buildTextField(
                    controller: descriptionController,
                    label: 'Descripción',
                    icon: Icons.description,
                    maxLines: 3,
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'La descripción es requerida';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 24),

                  // Buttons
                  Row(
                    children: [
                      Expanded(
                        child: GestureDetector(
                          onTap: () => Navigator.pop(dialogContext),
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            decoration: BoxDecoration(
                              color: Colors.white.withOpacity(0.05),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Center(
                              child: Text(
                                'Cancelar',
                                style: GoogleFonts.outfit(
                                  color: _StadiumNights.textSecondary,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: GestureDetector(
                          onTap: () {
                            if (formKey.currentState!.validate()) {
                              context.read<LeagueBloc>().add(UpdateLeagueEvent(
                                    leagueId: widget.league.id,
                                    name: nameController.text.trim(),
                                    slug: slugController.text.trim().toLowerCase(),
                                    description: descriptionController.text.trim(),
                                  ));
                              Navigator.pop(dialogContext);
                            }
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                colors: [
                                  _StadiumNights.gold,
                                  _StadiumNights.amber,
                                ],
                              ),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Center(
                              child: Text(
                                'Guardar',
                                style: GoogleFonts.outfit(
                                  color: Colors.black,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    int maxLines = 1,
    String? Function(String?)? validator,
  }) {
    return TextFormField(
      controller: controller,
      maxLines: maxLines,
      validator: validator,
      style: GoogleFonts.outfit(
        color: _StadiumNights.textPrimary,
        fontSize: 14,
      ),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: GoogleFonts.outfit(
          color: _StadiumNights.textMuted,
        ),
        prefixIcon: Icon(icon, color: _StadiumNights.gold, size: 20),
        filled: true,
        fillColor: _StadiumNights.cardDark,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.white.withOpacity(0.1)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.white.withOpacity(0.1)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: _StadiumNights.gold, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: _StadiumNights.error),
        ),
      ),
    );
  }

  void _toggleStatus() {
    final isActive = widget.league.isActive;

    showDialog(
      context: context,
      builder: (dialogContext) => Dialog(
        backgroundColor: Colors.transparent,
        child: Container(
          constraints: const BoxConstraints(maxWidth: 360),
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: _StadiumNights.surfaceDark,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: isActive
                  ? _StadiumNights.amber.withOpacity(0.3)
                  : _StadiumNights.neonGreen.withOpacity(0.3),
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: (isActive ? _StadiumNights.amber : _StadiumNights.neonGreen)
                      .withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  isActive ? Icons.visibility_off : Icons.visibility,
                  color: isActive ? _StadiumNights.amber : _StadiumNights.neonGreen,
                  size: 32,
                ),
              ),
              const SizedBox(height: 20),
              Text(
                isActive ? 'DESACTIVAR LIGA' : 'ACTIVAR LIGA',
                style: GoogleFonts.bebasNeue(
                  fontSize: 22,
                  color: _StadiumNights.textPrimary,
                  letterSpacing: 2,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                isActive
                    ? '¿Desactivar "${widget.league.name}"?\nNo será visible para los usuarios.'
                    : '¿Activar "${widget.league.name}"?\nSerá visible para los usuarios.',
                textAlign: TextAlign.center,
                style: GoogleFonts.outfit(
                  fontSize: 14,
                  color: _StadiumNights.textSecondary,
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 24),
              Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: () => Navigator.pop(dialogContext),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.05),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Center(
                          child: Text(
                            'Cancelar',
                            style: GoogleFonts.outfit(
                              color: _StadiumNights.textSecondary,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: GestureDetector(
                      onTap: () {
                        context.read<LeagueBloc>().add(ToggleLeagueStatusEvent(
                              leagueId: widget.league.id,
                              currentStatus: widget.league.isActive,
                            ));
                        Navigator.pop(dialogContext);
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        decoration: BoxDecoration(
                          color: isActive
                              ? _StadiumNights.amber
                              : _StadiumNights.neonGreen,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Center(
                          child: Text(
                            isActive ? 'Desactivar' : 'Activar',
                            style: GoogleFonts.outfit(
                              color: Colors.black,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _confirmDelete() {
    showDialog(
      context: context,
      builder: (dialogContext) => Dialog(
        backgroundColor: Colors.transparent,
        child: Container(
          constraints: const BoxConstraints(maxWidth: 360),
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: _StadiumNights.surfaceDark,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: _StadiumNights.error.withOpacity(0.3)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: _StadiumNights.error.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.delete_forever,
                  color: _StadiumNights.error,
                  size: 32,
                ),
              ),
              const SizedBox(height: 20),
              Text(
                'ELIMINAR LIGA',
                style: GoogleFonts.bebasNeue(
                  fontSize: 22,
                  color: _StadiumNights.textPrimary,
                  letterSpacing: 2,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                '¿Eliminar "${widget.league.name}"?\nEsta acción no se puede deshacer.',
                textAlign: TextAlign.center,
                style: GoogleFonts.outfit(
                  fontSize: 14,
                  color: _StadiumNights.textSecondary,
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 24),
              Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: () => Navigator.pop(dialogContext),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.05),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Center(
                          child: Text(
                            'Cancelar',
                            style: GoogleFonts.outfit(
                              color: _StadiumNights.textSecondary,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: GestureDetector(
                      onTap: () {
                        context
                            .read<LeagueBloc>()
                            .add(DeleteLeagueEvent(widget.league.id));
                        Navigator.pop(dialogContext);
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        decoration: BoxDecoration(
                          color: _StadiumNights.error,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Center(
                          child: Text(
                            'Eliminar',
                            style: GoogleFonts.outfit(
                              color: Colors.white,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Action Chip for card actions
class _ActionChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _ActionChip({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        HapticFeedback.lightImpact();
        onTap();
      },
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: color.withOpacity(0.2)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 14, color: color),
            const SizedBox(width: 6),
            Flexible(
              child: Text(
                label,
                style: GoogleFonts.outfit(
                  fontSize: 11,
                  color: color,
                  fontWeight: FontWeight.w500,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Stadium Field Background with subtle pitch pattern
class _StadiumFieldBackground extends StatefulWidget {
  const _StadiumFieldBackground();

  @override
  State<_StadiumFieldBackground> createState() => _StadiumFieldBackgroundState();
}

class _StadiumFieldBackgroundState extends State<_StadiumFieldBackground>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 20),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Positioned.fill(
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, child) {
          return CustomPaint(
            painter: _StadiumFieldPainter(
              animationValue: _controller.value,
            ),
          );
        },
      ),
    );
  }
}

class _StadiumFieldPainter extends CustomPainter {
  final double animationValue;

  _StadiumFieldPainter({required this.animationValue});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = _StadiumNights.neonGreen.withOpacity(0.03)
      ..strokeWidth = 1.0
      ..style = PaintingStyle.stroke;

    final centerX = size.width / 2;
    final centerY = size.height / 2;

    // Center circle with subtle pulse
    final pulseScale = 1.0 + (math.sin(animationValue * 2 * math.pi) * 0.02);
    canvas.drawCircle(
      Offset(centerX, centerY),
      60 * pulseScale,
      paint,
    );

    // Center line
    canvas.drawLine(
      Offset(0, centerY),
      Offset(size.width, centerY),
      paint,
    );

    // Outer rectangle
    final pitchRect = RRect.fromRectAndRadius(
      Rect.fromLTWH(
        size.width * 0.08,
        size.height * 0.2,
        size.width * 0.84,
        size.height * 0.6,
      ),
      const Radius.circular(4),
    );
    canvas.drawRRect(pitchRect, paint);

    // Goal areas
    canvas.drawRect(
      Rect.fromLTWH(
        size.width * 0.3,
        size.height * 0.2,
        size.width * 0.4,
        size.height * 0.1,
      ),
      paint,
    );

    canvas.drawRect(
      Rect.fromLTWH(
        size.width * 0.3,
        size.height * 0.7,
        size.width * 0.4,
        size.height * 0.1,
      ),
      paint,
    );
  }

  @override
  bool shouldRepaint(covariant _StadiumFieldPainter oldDelegate) {
    return oldDelegate.animationValue != animationValue;
  }
}
