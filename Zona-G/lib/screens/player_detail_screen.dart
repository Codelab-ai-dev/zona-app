import 'dart:io';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import '../models/qr_data.dart';
import '../models/player.dart';
import '../services/api_service.dart';
import '../services/photo_service.dart';
import '../services/attendance_service.dart';
import '../models/attendance.dart';
import '../widgets/stadium_background.dart';
import 'qr_scanner_screen.dart';

class PlayerDetailScreen extends StatefulWidget {
  final QRPlayerData qrData;
  final String? matchId;

  const PlayerDetailScreen({
    super.key,
    required this.qrData,
    this.matchId,
  });

  @override
  State<PlayerDetailScreen> createState() => _PlayerDetailScreenState();
}

class _PlayerDetailScreenState extends State<PlayerDetailScreen>
    with SingleTickerProviderStateMixin {
  Player? player;
  bool isLoading = true;
  bool isUploadingPhoto = false;
  bool isRegisteringAttendance = false;
  bool hasAttendanceToday = false;
  bool isUpdatingStats = false;
  bool isSuspended = false;
  Map<String, dynamic>? suspensionDetails;
  Map<String, int> currentStats = {
    'goals': 0,
    'assists': 0,
    'yellow_cards': 0,
    'red_cards': 0,
  };

  late AnimationController _animController;

  // Stadium Nights color palette
  static const Color _primaryDark = Color(0xFF0A0A0A);
  static const Color _neonGreen = Color(0xFF00FF7F);
  static const Color _gold = Color(0xFFFFD700);
  static const Color _surfaceDark = Color(0xFF1A1A1A);

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );
    _loadPlayerData();
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  Future<void> _loadPlayerData() async {
    setState(() {
      isLoading = true;
    });

    final playerData = await ApiService.getPlayer(widget.qrData.playerId);

    if (mounted) {
      setState(() {
        player = playerData;
        isLoading = false;
      });
      _animController.forward();

      if (playerData != null) {
        _checkAttendanceToday();
        _loadCurrentStats();
        _checkSuspensionStatus();
      }
    }
  }

  Future<void> _checkSuspensionStatus() async {
    if (player == null) return;

    try {
      final suspended = await ApiService.isPlayerSuspended(player!.id, widget.matchId);
      final details = await ApiService.getPlayerSuspension(player!.id);

      if (mounted) {
        setState(() {
          isSuspended = suspended;
          suspensionDetails = details;
        });
      }
    } catch (e) {
      debugPrint('Error verificando suspensión: $e');
    }
  }

  Future<void> _takePhoto() async {
    try {
      setState(() {
        isUploadingPhoto = true;
      });

      final photoFile = await _showPhotoSourceDialog();

      if (photoFile != null && player != null) {
        final success = await PhotoService.uploadPlayerPhoto(player!.id, photoFile);

        if (success) {
          if (mounted) {
            _showSuccessSnackBar('Foto subida exitosamente');
          }
          await _loadPlayerData();
        } else {
          if (mounted) {
            _showErrorSnackBar('Error al subir la foto');
          }
        }
      }
    } finally {
      if (mounted) {
        setState(() {
          isUploadingPhoto = false;
        });
      }
    }
  }

  Future<File?> _showPhotoSourceDialog() async {
    return await showDialog<File?>(
      context: context,
      builder: (context) => Dialog(
        backgroundColor: Colors.transparent,
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: _surfaceDark,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Colors.white.withOpacity(0.1)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'SELECCIONAR FOTO',
                style: GoogleFonts.bebasNeue(
                  fontSize: 22,
                  color: Colors.white,
                  letterSpacing: 2,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Elige cómo agregar la foto del jugador',
                style: GoogleFonts.outfit(
                  fontSize: 14,
                  color: Colors.white54,
                ),
              ),
              const SizedBox(height: 24),
              Row(
                children: [
                  Expanded(
                    child: _buildPhotoOptionButton(
                      Icons.camera_alt,
                      'Cámara',
                      () async {
                        Navigator.pop(context);
                        final file = await PhotoService.takePhoto();
                        if (mounted && file != null) Navigator.pop(context, file);
                      },
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildPhotoOptionButton(
                      Icons.photo_library,
                      'Galería',
                      () async {
                        Navigator.pop(context);
                        final file = await PhotoService.pickPhotoFromGallery();
                        if (mounted && file != null) Navigator.pop(context, file);
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: Text(
                  'Cancelar',
                  style: GoogleFonts.outfit(
                    color: Colors.white54,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPhotoOptionButton(IconData icon, String label, VoidCallback onTap) {
    return GestureDetector(
      onTap: () {
        HapticFeedback.lightImpact();
        onTap();
      },
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 20),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.1),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: _neonGreen.withOpacity(0.3)),
        ),
        child: Column(
          children: [
            Icon(icon, color: _neonGreen, size: 32),
            const SizedBox(height: 8),
            Text(
              label,
              style: GoogleFonts.outfit(
                color: Colors.white,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showErrorSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          message,
          style: GoogleFonts.outfit(color: Colors.white),
        ),
        backgroundColor: Colors.red.shade700,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        margin: const EdgeInsets.all(16),
      ),
    );
  }

  void _showSuccessSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(Icons.check_circle, color: Colors.white, size: 20),
            const SizedBox(width: 8),
            Text(
              message,
              style: GoogleFonts.outfit(color: Colors.white),
            ),
          ],
        ),
        backgroundColor: _neonGreen.withOpacity(0.9),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        margin: const EdgeInsets.all(16),
      ),
    );
  }

  Future<void> _checkAttendanceToday() async {
    if (player == null) return;

    try {
      bool hasAttendance;
      if (widget.matchId != null) {
        hasAttendance = await AttendanceService.hasAttendanceForMatch(player!.id, widget.matchId!);
      } else {
        hasAttendance = await AttendanceService.hasAttendanceToday(player!.id);
      }

      if (mounted) {
        setState(() {
          hasAttendanceToday = hasAttendance;
        });
      }
    } catch (e) {
      debugPrint('Error verificando asistencia: $e');
    }
  }

  Future<void> _registerAttendance() async {
    if (player == null) return;

    setState(() {
      isRegisteringAttendance = true;
    });

    try {
      final success = await AttendanceService.registerAttendance(
        playerId: player!.id,
        matchId: widget.matchId,
        recognitionMode: RecognitionMode.quick,
      );

      if (mounted) {
        if (success) {
          HapticFeedback.heavyImpact();
          setState(() {
            hasAttendanceToday = true;
          });
          _showSuccessSnackBar('Asistencia registrada para ${player!.name}');
        } else {
          _showErrorSnackBar('Error al registrar asistencia');
        }
      }
    } catch (e) {
      if (mounted) {
        _showErrorSnackBar('Error: ${e.toString()}');
      }
    } finally {
      if (mounted) {
        setState(() {
          isRegisteringAttendance = false;
        });
      }
    }
  }

  Future<void> _loadCurrentStats() async {
    if (player == null || widget.matchId == null) return;

    try {
      final stats = await ApiService.getCurrentPlayerStats(
        playerId: player!.id,
        matchId: widget.matchId!,
      );

      if (mounted) {
        setState(() {
          currentStats = stats ?? {
            'goals': 0,
            'assists': 0,
            'yellow_cards': 0,
            'red_cards': 0,
          };
        });
      }
    } catch (e) {
      debugPrint('Error cargando estadísticas: $e');
    }
  }

  Future<void> _updatePlayerStats(String statType, int increment) async {
    if (player == null || widget.matchId == null) {
      _showErrorSnackBar('Se necesita un partido activo');
      return;
    }

    setState(() {
      isUpdatingStats = true;
    });

    try {
      final success = await ApiService.updatePlayerStats(
        playerId: player!.id,
        matchId: widget.matchId!,
        statType: statType,
        increment: increment,
      );

      if (mounted) {
        if (success) {
          HapticFeedback.lightImpact();
          setState(() {
            currentStats[statType] = (currentStats[statType]! + increment).clamp(0, 999);
          });

          String message = '';
          switch (statType) {
            case 'goals':
              message = increment > 0 ? 'Gol agregado' : 'Gol removido';
              break;
            case 'yellow_cards':
              message = increment > 0 ? 'Tarjeta amarilla agregada' : 'Tarjeta amarilla removida';
              break;
            case 'red_cards':
              message = increment > 0 ? 'Tarjeta roja agregada' : 'Tarjeta roja removida';
              break;
          }
          _showSuccessSnackBar(message);
        } else {
          _showErrorSnackBar('Error al actualizar');
        }
      }
    } catch (e) {
      if (mounted) {
        _showErrorSnackBar('Error: ${e.toString()}');
      }
    } finally {
      if (mounted) {
        setState(() {
          isUpdatingStats = false;
        });
      }
    }
  }

  void _showStatsDialog() {
    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) {
          return Dialog(
            backgroundColor: Colors.transparent,
            child: Container(
              constraints: const BoxConstraints(maxWidth: 400),
              decoration: BoxDecoration(
                color: _surfaceDark,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: Colors.white.withOpacity(0.1)),
              ),
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      'ESTADÍSTICAS',
                      style: GoogleFonts.bebasNeue(
                        fontSize: 24,
                        color: Colors.white,
                        letterSpacing: 2,
                      ),
                    ),
                    Text(
                      player!.name,
                      style: GoogleFonts.outfit(
                        fontSize: 14,
                        color: _neonGreen,
                      ),
                    ),
                    const SizedBox(height: 24),

                    if (widget.matchId == null)
                      Container(
                        padding: const EdgeInsets.all(12),
                        margin: const EdgeInsets.only(bottom: 16),
                        decoration: BoxDecoration(
                          color: _gold.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: _gold.withOpacity(0.3)),
                        ),
                        child: Row(
                          children: [
                            Icon(Icons.info_outline, color: _gold, size: 18),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                'Se necesita un partido activo',
                                style: GoogleFonts.outfit(
                                  fontSize: 12,
                                  color: _gold,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),

                    _buildStatRowDialog(
                      'Goles',
                      Icons.sports_soccer,
                      currentStats['goals'] ?? 0,
                      Colors.white,
                      onAdd: widget.matchId != null
                          ? () async {
                              await _updatePlayerStats('goals', 1);
                              setDialogState(() {});
                            }
                          : null,
                      onRemove: widget.matchId != null
                          ? () async {
                              await _updatePlayerStats('goals', -1);
                              setDialogState(() {});
                            }
                          : null,
                    ),

                    const SizedBox(height: 12),

                    _buildStatRowDialog(
                      'T. Amarillas',
                      Icons.square,
                      currentStats['yellow_cards'] ?? 0,
                      Colors.yellow,
                      onAdd: widget.matchId != null
                          ? () async {
                              await _updatePlayerStats('yellow_cards', 1);
                              setDialogState(() {});
                            }
                          : null,
                      onRemove: widget.matchId != null
                          ? () async {
                              await _updatePlayerStats('yellow_cards', -1);
                              setDialogState(() {});
                            }
                          : null,
                    ),

                    const SizedBox(height: 12),

                    _buildStatRowDialog(
                      'T. Rojas',
                      Icons.square,
                      currentStats['red_cards'] ?? 0,
                      Colors.red,
                      onAdd: widget.matchId != null
                          ? () async {
                              await _updatePlayerStats('red_cards', 1);
                              setDialogState(() {});
                            }
                          : null,
                      onRemove: widget.matchId != null
                          ? () async {
                              await _updatePlayerStats('red_cards', -1);
                              setDialogState(() {});
                            }
                          : null,
                    ),

                    const SizedBox(height: 24),

                    SizedBox(
                      width: double.infinity,
                      child: TextButton(
                        onPressed: () {
                          Navigator.pop(context);
                          _loadCurrentStats();
                        },
                        style: TextButton.styleFrom(
                          backgroundColor: Colors.white.withOpacity(0.1),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: Text(
                          'Cerrar',
                          style: GoogleFonts.outfit(
                            color: Colors.white,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildStatRowDialog(
    String title,
    IconData icon,
    int currentValue,
    Color iconColor, {
    VoidCallback? onAdd,
    VoidCallback? onRemove,
  }) {
    final canModify = onAdd != null && onRemove != null && !isUpdatingStats;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withOpacity(0.1)),
      ),
      child: Row(
        children: [
          Icon(icon, color: iconColor, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              title,
              style: GoogleFonts.outfit(
                fontSize: 14,
                color: Colors.white,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          GestureDetector(
            onTap: canModify && currentValue > 0 ? onRemove : null,
            child: Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: canModify && currentValue > 0
                    ? Colors.red.withOpacity(0.2)
                    : Colors.white.withOpacity(0.05),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                Icons.remove,
                color: canModify && currentValue > 0 ? Colors.red : Colors.white24,
                size: 20,
              ),
            ),
          ),
          Container(
            width: 50,
            alignment: Alignment.center,
            child: Text(
              '$currentValue',
              style: GoogleFonts.bebasNeue(
                fontSize: 24,
                color: Colors.white,
              ),
            ),
          ),
          GestureDetector(
            onTap: canModify ? onAdd : null,
            child: Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: canModify
                    ? _neonGreen.withOpacity(0.2)
                    : Colors.white.withOpacity(0.05),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                Icons.add,
                color: canModify ? _neonGreen : Colors.white24,
                size: 20,
              ),
            ),
          ),
        ],
      ),
    );
  }

  int _calculateAge(String? birthDate) {
    if (birthDate == null) return 0;
    final birth = DateTime.parse(birthDate);
    final today = DateTime.now();
    int age = today.year - birth.year;
    if (today.month < birth.month ||
        (today.month == birth.month && today.day < birth.day)) {
      age--;
    }
    return age;
  }

  ImageProvider? _getPhotoImageProvider(String? photoUrl) {
    if (photoUrl == null || photoUrl.isEmpty) return null;

    if (photoUrl.startsWith('data:image/')) {
      try {
        final base64String = photoUrl.split(',')[1];
        final bytes = base64Decode(base64String);
        return MemoryImage(bytes);
      } catch (e) {
        return null;
      }
    } else {
      return NetworkImage(photoUrl);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _primaryDark,
      body: Stack(
        children: [
          const StadiumBackground(),

          SafeArea(
            child: Column(
              children: [
                _buildHeader(),
                Expanded(
                  child: isLoading
                      ? _buildLoadingState()
                      : player == null
                          ? _buildNotFoundState()
                          : _buildPlayerContent(),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
      child: Row(
        children: [
          GestureDetector(
            onTap: () {
              HapticFeedback.lightImpact();
              Navigator.pop(context);
            },
            child: Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(
                Icons.arrow_back,
                color: Colors.white,
                size: 22,
              ),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Text(
              'JUGADOR',
              style: GoogleFonts.bebasNeue(
                fontSize: 24,
                color: Colors.white,
                letterSpacing: 2,
              ),
            ),
          ),
          if (widget.matchId != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: _neonGreen.withOpacity(0.15),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: _neonGreen.withOpacity(0.3)),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 6,
                    height: 6,
                    decoration: BoxDecoration(
                      color: _neonGreen,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 6),
                  Text(
                    'EN PARTIDO',
                    style: GoogleFonts.outfit(
                      fontSize: 10,
                      color: _neonGreen,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildLoadingState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          SizedBox(
            width: 48,
            height: 48,
            child: CircularProgressIndicator(
              strokeWidth: 3,
              valueColor: AlwaysStoppedAnimation<Color>(_neonGreen),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            'Cargando jugador...',
            style: GoogleFonts.outfit(
              color: Colors.white54,
              fontSize: 14,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNotFoundState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.person_off_outlined,
            size: 64,
            color: Colors.white24,
          ),
          const SizedBox(height: 16),
          Text(
            'Jugador no encontrado',
            style: GoogleFonts.bebasNeue(
              fontSize: 22,
              color: Colors.white70,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPlayerContent() {
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
      child: Column(
        children: [
          // Player photo and basic info
          _buildPlayerCard(),

          const SizedBox(height: 16),

          // Suspension warning
          if (isSuspended && suspensionDetails != null)
            _buildSuspensionCard(),

          // Attendance button
          _buildAttendanceButton(),

          const SizedBox(height: 12),

          // Stats button
          _buildStatsButton(),

          const SizedBox(height: 24),

          // Action buttons
          _buildActionButtons(),
        ],
      ),
    );
  }

  Widget _buildPlayerCard() {
    final photoProvider = _getPhotoImageProvider(player!.photo);

    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Colors.white.withOpacity(0.1),
            Colors.white.withOpacity(0.05),
          ],
        ),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white.withOpacity(0.1)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          children: [
            // Photo with camera button
            Stack(
              children: [
                Container(
                  width: 120,
                  height: 120,
                  decoration: BoxDecoration(
                    color: _surfaceDark,
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: isSuspended
                          ? Colors.red.withOpacity(0.5)
                          : _neonGreen.withOpacity(0.5),
                      width: 3,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: (isSuspended ? Colors.red : _neonGreen).withOpacity(0.2),
                        blurRadius: 20,
                        spreadRadius: 2,
                      ),
                    ],
                    image: photoProvider != null
                        ? DecorationImage(
                            image: photoProvider,
                            fit: BoxFit.cover,
                          )
                        : null,
                  ),
                  child: photoProvider == null
                      ? Icon(
                          Icons.person,
                          size: 56,
                          color: Colors.white24,
                        )
                      : null,
                ),
                Positioned(
                  bottom: 0,
                  right: 0,
                  child: GestureDetector(
                    onTap: isUploadingPhoto ? null : _takePhoto,
                    child: Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: _neonGreen,
                        shape: BoxShape.circle,
                        border: Border.all(color: _primaryDark, width: 3),
                      ),
                      child: isUploadingPhoto
                          ? Padding(
                              padding: const EdgeInsets.all(10),
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                valueColor:
                                    AlwaysStoppedAnimation<Color>(_primaryDark),
                              ),
                            )
                          : Icon(
                              Icons.camera_alt,
                              color: _primaryDark,
                              size: 20,
                            ),
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 20),

            // Name and jersey number
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Flexible(
                  child: Text(
                    player!.name,
                    style: GoogleFonts.bebasNeue(
                      fontSize: 28,
                      color: Colors.white,
                      letterSpacing: 1,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ),
                const SizedBox(width: 12),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        _gold.withOpacity(0.3),
                        _gold.withOpacity(0.15),
                      ],
                    ),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: _gold.withOpacity(0.5)),
                  ),
                  child: Text(
                    '#${player!.jerseyNumber}',
                    style: GoogleFonts.bebasNeue(
                      fontSize: 22,
                      color: _gold,
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 20),

            // Player info grid
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.05),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                children: [
                  _buildPlayerInfoRow('Posición', player!.position),
                  if (player!.birthDate != null) ...[
                    const SizedBox(height: 10),
                    _buildPlayerInfoRow('Edad', '${_calculateAge(player!.birthDate)} años'),
                  ],
                  const SizedBox(height: 10),
                  _buildPlayerInfoRow(
                    'Estado',
                    player!.isActive ? 'Activo' : 'Inactivo',
                    valueColor: player!.isActive ? _neonGreen : Colors.red,
                  ),
                  if (isSuspended) ...[
                    const SizedBox(height: 10),
                    _buildPlayerInfoRow(
                      'Suspensión',
                      'SUSPENDIDO',
                      valueColor: Colors.red,
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPlayerInfoRow(String label, String value, {Color? valueColor}) {
    return Row(
      children: [
        Text(
          label,
          style: GoogleFonts.outfit(
            fontSize: 13,
            color: Colors.white54,
          ),
        ),
        const Spacer(),
        Text(
          value,
          style: GoogleFonts.outfit(
            fontSize: 14,
            color: valueColor ?? Colors.white,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }

  Widget _buildSuspensionCard() {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            Colors.red.withOpacity(0.2),
            Colors.red.withOpacity(0.1),
          ],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.red.withOpacity(0.4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.block, color: Colors.red, size: 22),
              const SizedBox(width: 10),
              Text(
                'JUGADOR SUSPENDIDO',
                style: GoogleFonts.bebasNeue(
                  fontSize: 18,
                  color: Colors.red,
                  letterSpacing: 1,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _buildSuspensionInfoRow(
            'Tipo',
            _getSuspensionTypeLabel(suspensionDetails!['suspension_type'] ?? ''),
          ),
          const SizedBox(height: 6),
          _buildSuspensionInfoRow(
            'Partidos pendientes',
            '${(suspensionDetails!['matches_to_serve'] ?? 0) - (suspensionDetails!['matches_served'] ?? 0)} de ${suspensionDetails!['matches_to_serve'] ?? 0}',
          ),
          if (suspensionDetails!['reason'] != null &&
              suspensionDetails!['reason'].isNotEmpty) ...[
            const SizedBox(height: 6),
            _buildSuspensionInfoRow('Motivo', suspensionDetails!['reason']),
          ],
        ],
      ),
    );
  }

  Widget _buildSuspensionInfoRow(String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '$label: ',
          style: GoogleFonts.outfit(
            fontSize: 12,
            color: Colors.red.shade300,
            fontWeight: FontWeight.w600,
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: GoogleFonts.outfit(
              fontSize: 12,
              color: Colors.red.shade200,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildAttendanceButton() {
    final bool isDisabled = hasAttendanceToday || isRegisteringAttendance || isSuspended;

    Color bgColor;
    Color textColor;
    String text;
    IconData icon;

    if (isSuspended) {
      bgColor = Colors.red;
      textColor = Colors.white;
      text = 'Jugador suspendido';
      icon = Icons.block;
    } else if (hasAttendanceToday) {
      bgColor = Colors.white.withOpacity(0.1);
      textColor = _neonGreen;
      text = widget.matchId != null ? 'Asistencia registrada' : 'Asistencia ya registrada';
      icon = Icons.check_circle;
    } else if (isRegisteringAttendance) {
      bgColor = _gold;
      textColor = _primaryDark;
      text = 'Registrando...';
      icon = Icons.hourglass_empty;
    } else {
      bgColor = _neonGreen;
      textColor = _primaryDark;
      text = widget.matchId != null ? 'Registrar Asistencia al Partido' : 'Registrar Asistencia';
      icon = Icons.how_to_reg;
    }

    return GestureDetector(
      onTap: isDisabled ? null : () {
        HapticFeedback.mediumImpact();
        _registerAttendance();
      },
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 18),
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(16),
          border: hasAttendanceToday && !isSuspended
              ? Border.all(color: _neonGreen.withOpacity(0.5))
              : null,
          boxShadow: !isDisabled
              ? [
                  BoxShadow(
                    color: bgColor.withOpacity(0.4),
                    blurRadius: 16,
                    offset: const Offset(0, 4),
                  ),
                ]
              : null,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (isRegisteringAttendance)
              SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(textColor),
                ),
              )
            else
              Icon(icon, color: textColor, size: 22),
            const SizedBox(width: 12),
            Text(
              text,
              style: GoogleFonts.outfit(
                fontSize: 15,
                color: textColor,
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatsButton() {
    return GestureDetector(
      onTap: () {
        HapticFeedback.lightImpact();
        _showStatsDialog();
      },
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.1),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.white.withOpacity(0.15)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.bar_chart, color: Colors.white70, size: 22),
            const SizedBox(width: 12),
            Text(
              'Registrar Estadísticas',
              style: GoogleFonts.outfit(
                fontSize: 15,
                color: Colors.white,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActionButtons() {
    return Row(
      children: [
        Expanded(
          child: GestureDetector(
            onTap: () {
              HapticFeedback.lightImpact();
              Navigator.popUntil(context, (route) => route.isFirst);
            },
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 16),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.1),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.home, color: Colors.white70, size: 20),
                  const SizedBox(width: 8),
                  Text(
                    'Inicio',
                    style: GoogleFonts.outfit(
                      fontSize: 14,
                      color: Colors.white,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: GestureDetector(
            onTap: () {
              HapticFeedback.lightImpact();
              Navigator.pushReplacement(
                context,
                PageRouteBuilder(
                  pageBuilder: (context, animation, secondaryAnimation) =>
                      QRScannerScreen(matchId: widget.matchId),
                  transitionsBuilder:
                      (context, animation, secondaryAnimation, child) {
                    return FadeTransition(opacity: animation, child: child);
                  },
                  transitionDuration: const Duration(milliseconds: 300),
                ),
              );
            },
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 16),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [_neonGreen, _neonGreen.withOpacity(0.8)],
                ),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.qr_code_scanner, color: _primaryDark, size: 20),
                  const SizedBox(width: 8),
                  Text(
                    'Escanear Otro',
                    style: GoogleFonts.outfit(
                      fontSize: 14,
                      color: _primaryDark,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  String _getSuspensionTypeLabel(String type) {
    const labels = {
      'red_card': 'Tarjeta Roja',
      'yellow_accumulation': 'Acum. Amarillas',
      'disciplinary_committee': 'Comité Disciplinario',
      'other': 'Otro',
    };
    return labels[type] ?? type;
  }
}
