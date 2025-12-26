import 'dart:ui';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../data/datasources/remote/supabase_client.dart';

/// Stadium Nights Design System
class _StadiumNights {
  static const Color backgroundDark = Color(0xFF050508);
  static const Color surfaceDark = Color(0xFF0A0A0F);
  static const Color cardDark = Color(0xFF12121A);

  static const Color gold = Color(0xFFFFD700);
  static const Color goldLight = Color(0xFFFFF0B3);
  static const Color amber = Color(0xFFF59E0B);

  static const Color neonGreen = Color(0xFF00FF7F);
  static const Color neonBlue = Color(0xFF00BFFF);
  static const Color neonPurple = Color(0xFF8B5CF6);

  static const Color success = Color(0xFF10B981);
  static const Color error = Color(0xFFEF4444);
  static const Color inactive = Color(0xFF6B7280);

  static const Color textPrimary = Color(0xFFFAFAFA);
  static const Color textSecondary = Color(0xFF9CA3AF);
  static const Color textMuted = Color(0xFF6B7280);
}

/// Users List Screen - Stadium Nights Edition
class UsersListScreen extends StatefulWidget {
  const UsersListScreen({super.key});

  @override
  State<UsersListScreen> createState() => _UsersListScreenState();
}

class _UsersListScreenState extends State<UsersListScreen>
    with TickerProviderStateMixin {
  late AnimationController _headerController;
  late AnimationController _listController;
  late Animation<double> _headerAnimation;
  late Animation<double> _spotlightAnimation;

  String _searchQuery = '';
  String _roleFilter = 'all';
  final TextEditingController _searchController = TextEditingController();
  final FocusNode _searchFocusNode = FocusNode();

  List<Map<String, dynamic>> _users = [];
  bool _isLoading = true;
  String? _error;

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
    _loadUsers();
  }

  Future<void> _loadUsers() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final client = SupabaseClientService.instance.client;
      final response = await client
          .from('users')
          .select('*, leagues!users_league_id_fkey(name), teams!users_team_id_fkey(name)')
          .order('created_at', ascending: false);

      if (mounted) {
        setState(() {
          _users = List<Map<String, dynamic>>.from(response);
          _isLoading = false;
        });
        _listController.forward();
      }
    } catch (e) {
      print('❌ Error loading users: $e');
      if (mounted) {
        setState(() {
          _error = 'Error al cargar usuarios: $e';
          _isLoading = false;
        });
      }
    }
  }

  List<Map<String, dynamic>> _filterUsers() {
    return _users.where((user) {
      // Role filter
      if (_roleFilter != 'all' && user['role'] != _roleFilter) return false;

      // Search filter
      if (_searchQuery.isNotEmpty) {
        final query = _searchQuery.toLowerCase();
        final name = (user['name'] ?? '').toString().toLowerCase();
        final email = (user['email'] ?? '').toString().toLowerCase();
        return name.contains(query) || email.contains(query);
      }

      return true;
    }).toList();
  }

  @override
  void dispose() {
    _headerController.dispose();
    _listController.dispose();
    _searchController.dispose();
    _searchFocusNode.dispose();
    super.dispose();
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
            const _StadiumFieldBackground(),
            _buildSpotlightEffects(),
            SafeArea(
              child: Column(
                children: [
                  _buildAnimatedHeader(),
                  _buildSearchAndFilters(),
                  Expanded(child: _buildContent()),
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
                        _StadiumNights.neonBlue.withOpacity(0.4),
                        _StadiumNights.neonBlue.withOpacity(0.1),
                        Colors.transparent,
                      ],
                      stops: const [0.0, 0.4, 1.0],
                    ),
                  ),
                ),
              ),
            ),
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
                        _StadiumNights.neonPurple.withOpacity(0.3),
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
                  // Back button
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
                          color: _StadiumNights.neonBlue.withOpacity(0.2),
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: _StadiumNights.neonBlue.withOpacity(0.1),
                            blurRadius: 12,
                            spreadRadius: -2,
                          ),
                        ],
                      ),
                      child: Icon(
                        Icons.arrow_back,
                        color: _StadiumNights.neonBlue,
                        size: 20,
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),

                  // Title with icon
                  Expanded(
                    child: Row(
                      children: [
                        _AnimatedUserIcon(animation: _headerAnimation),
                        const SizedBox(width: 12),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'USUARIOS',
                              style: GoogleFonts.bebasNeue(
                                fontSize: 32,
                                color: _StadiumNights.textPrimary,
                                letterSpacing: 4,
                                height: 1,
                              ),
                            ),
                            Text(
                              'Gestiona cuentas y roles',
                              style: GoogleFonts.outfit(
                                fontSize: 12,
                                color: _StadiumNights.neonBlue,
                                letterSpacing: 0.5,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  // Stats badge
                  _buildStatsBadge(),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildStatsBadge() {
    final count = _users.length;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: _StadiumNights.neonBlue.withOpacity(0.1),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: _StadiumNights.neonBlue.withOpacity(0.3),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.people,
            size: 14,
            color: _StadiumNights.neonBlue,
          ),
          const SizedBox(width: 6),
          Text(
            _isLoading ? '...' : '$count',
            style: GoogleFonts.bebasNeue(
              fontSize: 16,
              color: _StadiumNights.neonBlue,
              letterSpacing: 1,
            ),
          ),
        ],
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
                            ? _StadiumNights.neonBlue.withOpacity(0.5)
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
                      cursorColor: _StadiumNights.neonBlue,
                      style: GoogleFonts.outfit(
                        color: Colors.white,
                        fontSize: 15,
                        fontWeight: FontWeight.w500,
                      ),
                      decoration: InputDecoration(
                        hintText: 'Buscar usuarios...',
                        hintStyle: GoogleFonts.outfit(
                          color: Colors.white.withOpacity(0.4),
                          fontSize: 15,
                        ),
                        prefixIcon: Icon(
                          Icons.search,
                          color: _StadiumNights.neonBlue.withOpacity(0.7),
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

                  // Role filter chips
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        _buildFilterChip('all', 'Todos', Icons.grid_view),
                        const SizedBox(width: 8),
                        _buildFilterChip('super_admin', 'Super Admin', Icons.admin_panel_settings, _StadiumNights.gold),
                        const SizedBox(width: 8),
                        _buildFilterChip('league_admin', 'Admin Liga', Icons.emoji_events, _StadiumNights.neonGreen),
                        const SizedBox(width: 8),
                        _buildFilterChip('team_owner', 'Dueño Equipo', Icons.groups, _StadiumNights.neonBlue),
                        const SizedBox(width: 8),
                        _buildFilterChip('public', 'Público', Icons.person, _StadiumNights.textMuted),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildFilterChip(String value, String label, IconData icon, [Color? accentColor]) {
    final isSelected = _roleFilter == value;
    final chipColor = accentColor ?? _StadiumNights.neonBlue;

    return GestureDetector(
      onTap: () {
        HapticFeedback.selectionClick();
        setState(() => _roleFilter = value);
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected
              ? chipColor.withOpacity(0.15)
              : _StadiumNights.cardDark,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isSelected
                ? chipColor.withOpacity(0.5)
                : Colors.white.withOpacity(0.05),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 14,
              color: isSelected ? chipColor : _StadiumNights.textMuted,
            ),
            const SizedBox(width: 6),
            Text(
              label,
              style: GoogleFonts.outfit(
                fontSize: 12,
                color: isSelected ? chipColor : _StadiumNights.textSecondary,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContent() {
    if (_isLoading) {
      return _buildLoadingState();
    }

    if (_error != null) {
      return _buildErrorState();
    }

    final filteredUsers = _filterUsers();

    if (_users.isEmpty) {
      return _buildEmptyState();
    }

    if (filteredUsers.isEmpty) {
      return _buildNoResultsState();
    }

    return _buildUsersList(filteredUsers);
  }

  Widget _buildLoadingState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          SizedBox(
            width: 60,
            height: 60,
            child: CircularProgressIndicator(
              strokeWidth: 3,
              valueColor: AlwaysStoppedAnimation<Color>(_StadiumNights.neonBlue),
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'CARGANDO USUARIOS',
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

  Widget _buildErrorState() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(40),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const SizedBox(height: 60),
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: _StadiumNights.error.withOpacity(0.1),
              shape: BoxShape.circle,
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
            _error ?? 'Error desconocido',
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
    );
  }

  Widget _buildEmptyState() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(40),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const SizedBox(height: 60),
          Container(
            width: 120,
            height: 120,
            decoration: BoxDecoration(
              gradient: RadialGradient(
                colors: [
                  _StadiumNights.neonBlue.withOpacity(0.1),
                  Colors.transparent,
                ],
              ),
            ),
            child: Icon(
              Icons.people_outline,
              size: 64,
              color: _StadiumNights.neonBlue.withOpacity(0.5),
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'SIN USUARIOS',
            style: GoogleFonts.bebasNeue(
              fontSize: 28,
              color: _StadiumNights.textPrimary,
              letterSpacing: 3,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'No hay usuarios registrados.',
            textAlign: TextAlign.center,
            style: GoogleFonts.outfit(
              fontSize: 14,
              color: _StadiumNights.textSecondary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNoResultsState() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(40),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const SizedBox(height: 60),
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
            'No se encontraron usuarios con esos filtros',
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
                _roleFilter = 'all';
              });
            },
            child: Text(
              'Limpiar filtros',
              style: GoogleFonts.outfit(
                fontSize: 14,
                color: _StadiumNights.neonBlue,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRetryButton() {
    return GestureDetector(
      onTap: () {
        HapticFeedback.mediumImpact();
        _loadUsers();
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [
              _StadiumNights.neonBlue,
              _StadiumNights.neonPurple,
            ],
          ),
          borderRadius: BorderRadius.circular(12),
          boxShadow: [
            BoxShadow(
              color: _StadiumNights.neonBlue.withOpacity(0.3),
              blurRadius: 16,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.refresh, color: Colors.white, size: 18),
            const SizedBox(width: 8),
            Text(
              'REINTENTAR',
              style: GoogleFonts.bebasNeue(
                fontSize: 16,
                color: Colors.white,
                letterSpacing: 1,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildUsersList(List<Map<String, dynamic>> users) {
    return RefreshIndicator(
      onRefresh: _loadUsers,
      color: _StadiumNights.neonBlue,
      backgroundColor: _StadiumNights.cardDark,
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 100),
        itemCount: users.length,
        itemBuilder: (context, index) {
          return _UserCard(
            user: users[index],
            index: index,
            listController: _listController,
            onEdit: () => _showEditUserDialog(users[index]),
            onRoleChange: () => _showChangeRoleDialog(users[index]),
          );
        },
      ),
    );
  }

  void _showEditUserDialog(Map<String, dynamic> user) {
    final nameController = TextEditingController(text: user['name'] ?? '');
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
            border: Border.all(color: _StadiumNights.neonBlue.withOpacity(0.2)),
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
                          color: _StadiumNights.neonBlue.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(
                          Icons.edit,
                          color: _StadiumNights.neonBlue,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Text(
                        'EDITAR USUARIO',
                        style: GoogleFonts.bebasNeue(
                          fontSize: 24,
                          color: _StadiumNights.textPrimary,
                          letterSpacing: 2,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Email (read-only)
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: _StadiumNights.cardDark,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.white.withOpacity(0.05)),
                    ),
                    child: Row(
                      children: [
                        Icon(
                          Icons.email,
                          color: _StadiumNights.textMuted,
                          size: 20,
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Email',
                                style: GoogleFonts.outfit(
                                  fontSize: 11,
                                  color: _StadiumNights.textMuted,
                                ),
                              ),
                              Text(
                                user['email'] ?? '',
                                style: GoogleFonts.outfit(
                                  fontSize: 14,
                                  color: _StadiumNights.textSecondary,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Name field
                  TextFormField(
                    controller: nameController,
                    style: GoogleFonts.outfit(
                      color: _StadiumNights.textPrimary,
                      fontSize: 14,
                    ),
                    decoration: InputDecoration(
                      labelText: 'Nombre',
                      labelStyle: GoogleFonts.outfit(
                        color: _StadiumNights.textMuted,
                      ),
                      prefixIcon: Icon(Icons.person, color: _StadiumNights.neonBlue, size: 20),
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
                        borderSide: BorderSide(color: _StadiumNights.neonBlue, width: 2),
                      ),
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'El nombre es requerido';
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
                          onTap: () async {
                            if (formKey.currentState!.validate()) {
                              try {
                                await SupabaseClientService.instance.client
                                    .from('users')
                                    .update({'name': nameController.text.trim()})
                                    .eq('id', user['id']);

                                Navigator.pop(dialogContext);
                                _showSuccessMessage('Usuario actualizado');
                                _loadUsers();
                              } catch (e) {
                                _showErrorMessage('Error al actualizar: $e');
                              }
                            }
                          },
                          child: Container(
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                colors: [
                                  _StadiumNights.neonBlue,
                                  _StadiumNights.neonPurple,
                                ],
                              ),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Center(
                              child: Text(
                                'Guardar',
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
        ),
      ),
    );
  }

  void _showChangeRoleDialog(Map<String, dynamic> user) {
    String selectedRole = user['role'] ?? 'public';

    showDialog(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialogState) => Dialog(
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
                          Icons.admin_panel_settings,
                          color: _StadiumNights.gold,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'CAMBIAR ROL',
                              style: GoogleFonts.bebasNeue(
                                fontSize: 24,
                                color: _StadiumNights.textPrimary,
                                letterSpacing: 2,
                              ),
                            ),
                            Text(
                              user['email'] ?? '',
                              style: GoogleFonts.outfit(
                                fontSize: 12,
                                color: _StadiumNights.textMuted,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Role options
                  _buildRoleOption(
                    'super_admin',
                    'Super Admin',
                    'Acceso total al sistema',
                    Icons.admin_panel_settings,
                    _StadiumNights.gold,
                    selectedRole,
                    (value) => setDialogState(() => selectedRole = value),
                  ),
                  const SizedBox(height: 10),
                  _buildRoleOption(
                    'league_admin',
                    'Admin de Liga',
                    'Administra una liga específica',
                    Icons.emoji_events,
                    _StadiumNights.neonGreen,
                    selectedRole,
                    (value) => setDialogState(() => selectedRole = value),
                  ),
                  const SizedBox(height: 10),
                  _buildRoleOption(
                    'team_owner',
                    'Dueño de Equipo',
                    'Gestiona su propio equipo',
                    Icons.groups,
                    _StadiumNights.neonBlue,
                    selectedRole,
                    (value) => setDialogState(() => selectedRole = value),
                  ),
                  const SizedBox(height: 10),
                  _buildRoleOption(
                    'public',
                    'Público',
                    'Solo lectura de información pública',
                    Icons.person,
                    _StadiumNights.textMuted,
                    selectedRole,
                    (value) => setDialogState(() => selectedRole = value),
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
                          onTap: () async {
                            if (selectedRole != user['role']) {
                              try {
                                await SupabaseClientService.instance.client
                                    .from('users')
                                    .update({'role': selectedRole})
                                    .eq('id', user['id']);

                                Navigator.pop(dialogContext);
                                _showSuccessMessage('Rol actualizado a ${_getRoleName(selectedRole)}');
                                _loadUsers();
                              } catch (e) {
                                _showErrorMessage('Error al cambiar rol: $e');
                              }
                            } else {
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

  Widget _buildRoleOption(
    String value,
    String title,
    String subtitle,
    IconData icon,
    Color color,
    String selectedValue,
    Function(String) onTap,
  ) {
    final isSelected = value == selectedValue;

    return GestureDetector(
      onTap: () => onTap(value),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isSelected ? color.withOpacity(0.1) : _StadiumNights.cardDark,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isSelected ? color.withOpacity(0.5) : Colors.white.withOpacity(0.05),
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: color.withOpacity(isSelected ? 0.2 : 0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: GoogleFonts.outfit(
                      fontSize: 15,
                      color: _StadiumNights.textPrimary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  Text(
                    subtitle,
                    style: GoogleFonts.outfit(
                      fontSize: 12,
                      color: _StadiumNights.textMuted,
                    ),
                  ),
                ],
              ),
            ),
            if (isSelected)
              Container(
                width: 24,
                height: 24,
                decoration: BoxDecoration(
                  color: color,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.check, color: Colors.black, size: 14),
              ),
          ],
        ),
      ),
    );
  }

  String _getRoleName(String role) {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'league_admin':
        return 'Admin de Liga';
      case 'team_owner':
        return 'Dueño de Equipo';
      case 'public':
        return 'Público';
      default:
        return role;
    }
  }

  void _showSuccessMessage(String message) {
    HapticFeedback.mediumImpact();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.check_circle, color: Colors.black, size: 20),
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

/// Animated User Icon
class _AnimatedUserIcon extends StatelessWidget {
  final Animation<double> animation;

  const _AnimatedUserIcon({required this.animation});

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
                  _StadiumNights.neonBlue,
                  _StadiumNights.neonPurple,
                ],
              ),
              borderRadius: BorderRadius.circular(14),
              boxShadow: [
                BoxShadow(
                  color: _StadiumNights.neonBlue.withOpacity(0.4 * animation.value),
                  blurRadius: 20,
                  spreadRadius: 2,
                ),
              ],
            ),
            child: const Icon(
              Icons.people,
              color: Colors.white,
              size: 26,
            ),
          ),
        );
      },
    );
  }
}

/// User Card
class _UserCard extends StatefulWidget {
  final Map<String, dynamic> user;
  final int index;
  final AnimationController listController;
  final VoidCallback onEdit;
  final VoidCallback onRoleChange;

  const _UserCard({
    required this.user,
    required this.index,
    required this.listController,
    required this.onEdit,
    required this.onRoleChange,
  });

  @override
  State<_UserCard> createState() => _UserCardState();
}

class _UserCardState extends State<_UserCard>
    with SingleTickerProviderStateMixin {
  late AnimationController _hoverController;
  late Animation<double> _scaleAnimation;

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

  Color _getRoleColor(String role) {
    switch (role) {
      case 'super_admin':
        return _StadiumNights.gold;
      case 'league_admin':
        return _StadiumNights.neonGreen;
      case 'team_owner':
        return _StadiumNights.neonBlue;
      default:
        return _StadiumNights.textMuted;
    }
  }

  IconData _getRoleIcon(String role) {
    switch (role) {
      case 'super_admin':
        return Icons.admin_panel_settings;
      case 'league_admin':
        return Icons.emoji_events;
      case 'team_owner':
        return Icons.groups;
      default:
        return Icons.person;
    }
  }

  String _getRoleName(String role) {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'league_admin':
        return 'Admin Liga';
      case 'team_owner':
        return 'Dueño Equipo';
      default:
        return 'Público';
    }
  }

  String? _getLeagueName() {
    // Try different possible keys for league relationship
    final leagues = widget.user['leagues!users_league_id_fkey'] ??
                    widget.user['leagues'];
    if (leagues != null && leagues is Map && leagues['name'] != null) {
      return leagues['name'] as String;
    }
    return null;
  }

  String? _getTeamName() {
    // Try different possible keys for team relationship
    final teams = widget.user['teams!users_team_id_fkey'] ??
                  widget.user['teams'];
    if (teams != null && teams is Map && teams['name'] != null) {
      return teams['name'] as String;
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final delay = widget.index * 0.1;
    final animation = CurvedAnimation(
      parent: widget.listController,
      curve: Interval(
        delay.clamp(0.0, 0.5),
        (delay + 0.5).clamp(0.0, 1.0),
        curve: Curves.easeOutCubic,
      ),
    );

    final role = widget.user['role'] ?? 'public';
    final roleColor = _getRoleColor(role);

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
      child: GestureDetector(
        onTapDown: (_) => _hoverController.forward(),
        onTapUp: (_) {
          _hoverController.reverse();
          HapticFeedback.lightImpact();
        },
        onTapCancel: () => _hoverController.reverse(),
        child: AnimatedBuilder(
          animation: _scaleAnimation,
          builder: (context, child) {
            return Transform.scale(
              scale: _scaleAnimation.value,
              child: child,
            );
          },
          child: Container(
            margin: const EdgeInsets.only(bottom: 12),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(18),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                child: Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        Colors.white.withOpacity(0.08),
                        Colors.white.withOpacity(0.03),
                      ],
                    ),
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(
                      color: roleColor.withOpacity(0.15),
                    ),
                  ),
                  child: Row(
                    children: [
                      // Avatar
                      _buildAvatar(role, roleColor),
                      const SizedBox(width: 14),

                      // User info
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              widget.user['name'] ?? widget.user['email'] ?? 'Sin nombre',
                              style: GoogleFonts.outfit(
                                fontSize: 16,
                                color: _StadiumNights.textPrimary,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              widget.user['email'] ?? '',
                              style: GoogleFonts.outfit(
                                fontSize: 13,
                                color: _StadiumNights.textMuted,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 8),
                            Wrap(
                              spacing: 8,
                              runSpacing: 6,
                              children: [
                                _buildRoleBadge(role, roleColor),
                                if (_getLeagueName() != null)
                                  _buildAssociationBadge(
                                    _getLeagueName()!,
                                    Icons.emoji_events,
                                    _StadiumNights.neonGreen,
                                  ),
                                if (_getTeamName() != null)
                                  _buildAssociationBadge(
                                    _getTeamName()!,
                                    Icons.shield,
                                    _StadiumNights.neonBlue,
                                  ),
                              ],
                            ),
                          ],
                        ),
                      ),

                      // Actions
                      _buildActionsMenu(roleColor),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildAvatar(String role, Color roleColor) {
    final avatarUrl = widget.user['avatar_url'];
    final name = widget.user['name'] ?? widget.user['email'] ?? '?';
    final initial = name.isNotEmpty ? name[0].toUpperCase() : '?';

    return Container(
      width: 52,
      height: 52,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            roleColor.withOpacity(0.3),
            roleColor.withOpacity(0.1),
          ],
        ),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: roleColor.withOpacity(0.3),
        ),
      ),
      child: avatarUrl != null && avatarUrl.isNotEmpty
          ? ClipRRect(
              borderRadius: BorderRadius.circular(14),
              child: Image.network(
                avatarUrl,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => _buildInitialAvatar(initial, roleColor),
              ),
            )
          : _buildInitialAvatar(initial, roleColor),
    );
  }

  Widget _buildInitialAvatar(String initial, Color color) {
    return Center(
      child: Text(
        initial,
        style: GoogleFonts.bebasNeue(
          fontSize: 24,
          color: color,
        ),
      ),
    );
  }

  Widget _buildRoleBadge(String role, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(
          color: color.withOpacity(0.3),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            _getRoleIcon(role),
            size: 12,
            color: color,
          ),
          const SizedBox(width: 4),
          Text(
            _getRoleName(role),
            style: GoogleFonts.outfit(
              fontSize: 11,
              color: color,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAssociationBadge(String name, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 10, color: color),
          const SizedBox(width: 4),
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 60),
            child: Text(
              name,
              style: GoogleFonts.outfit(
                fontSize: 10,
                color: color,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionsMenu(Color roleColor) {
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
      onSelected: (value) {
        HapticFeedback.lightImpact();
        if (value == 'edit') {
          widget.onEdit();
        } else if (value == 'role') {
          widget.onRoleChange();
        }
      },
      itemBuilder: (context) => [
        PopupMenuItem(
          value: 'edit',
          child: Row(
            children: [
              Icon(Icons.edit, size: 18, color: _StadiumNights.neonBlue),
              const SizedBox(width: 12),
              Text(
                'Editar',
                style: GoogleFonts.outfit(
                  color: _StadiumNights.textPrimary,
                  fontSize: 14,
                ),
              ),
            ],
          ),
        ),
        PopupMenuItem(
          value: 'role',
          child: Row(
            children: [
              Icon(Icons.admin_panel_settings, size: 18, color: _StadiumNights.gold),
              const SizedBox(width: 12),
              Text(
                'Cambiar Rol',
                style: GoogleFonts.outfit(
                  color: _StadiumNights.textPrimary,
                  fontSize: 14,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// Stadium Field Background
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
      ..color = _StadiumNights.neonBlue.withOpacity(0.02)
      ..strokeWidth = 1.0
      ..style = PaintingStyle.stroke;

    final centerX = size.width / 2;
    final centerY = size.height / 2;

    final pulseScale = 1.0 + (math.sin(animationValue * 2 * math.pi) * 0.02);
    canvas.drawCircle(
      Offset(centerX, centerY),
      60 * pulseScale,
      paint,
    );

    canvas.drawLine(
      Offset(0, centerY),
      Offset(size.width, centerY),
      paint,
    );

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
  }

  @override
  bool shouldRepaint(covariant _StadiumFieldPainter oldDelegate) {
    return oldDelegate.animationValue != animationValue;
  }
}
