import 'dart:io';
import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import '../models/qr_data.dart';
import '../models/player.dart';
import '../services/api_service.dart';
import '../services/photo_service.dart';
import '../services/attendance_service.dart';
import '../models/attendance.dart';

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

class _PlayerDetailScreenState extends State<PlayerDetailScreen> {
  Player? player;
  bool isLoading = true;
  bool isUploadingPhoto = false;
  bool isRegisteringAttendance = false;
  bool hasAttendanceToday = false;
  bool isUpdatingStats = false;
  Map<String, int> currentStats = {
    'goals': 0,
    'assists': 0,
    'yellow_cards': 0,
    'red_cards': 0,
  };

  @override
  void initState() {
    super.initState();
    _loadPlayerData();
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
      
      // Check if player has attendance today
      if (playerData != null) {
        _checkAttendanceToday();
        _loadCurrentStats();
      }
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
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Foto subida exitosamente'),
                backgroundColor: Colors.green,
              ),
            );
          }
          
          // Reload player data to get updated photo
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
      builder: (context) => AlertDialog(
        title: const Text('Seleccionar foto'),
        content: const Text('¿Cómo quieres agregar la foto del jugador?'),
        actions: [
          TextButton.icon(
            onPressed: () async {
              Navigator.pop(context);
              final file = await PhotoService.takePhoto();
              if (mounted) Navigator.pop(context, file);
            },
            icon: const Icon(Icons.camera),
            label: const Text('Cámara'),
          ),
          TextButton.icon(
            onPressed: () async {
              Navigator.pop(context);
              final file = await PhotoService.pickPhotoFromGallery();
              if (mounted) Navigator.pop(context, file);
            },
            icon: const Icon(Icons.photo_library),
            label: const Text('Galería'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancelar'),
          ),
        ],
      ),
    );
  }

  void _showErrorSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red,
      ),
    );
  }

  // Check if player has attendance today or for specific match
  Future<void> _checkAttendanceToday() async {
    if (player == null) return;
    
    try {
      bool hasAttendance;
      if (widget.matchId != null) {
        // Check attendance for specific match
        hasAttendance = await AttendanceService.hasAttendanceForMatch(player!.id, widget.matchId!);
      } else {
        // Check general attendance today
        hasAttendance = await AttendanceService.hasAttendanceToday(player!.id);
      }
      
      if (mounted) {
        setState(() {
          hasAttendanceToday = hasAttendance;
        });
      }
    } catch (e) {
      print('❌ Error verificando asistencia: $e');
    }
  }

  // Register attendance for the player
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
          setState(() {
            hasAttendanceToday = true;
          });
          
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  const Icon(Icons.check_circle, color: Colors.white),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text('✅ Asistencia registrada para ${player!.name}'),
                  ),
                ],
              ),
              backgroundColor: Colors.green,
              duration: const Duration(seconds: 3),
            ),
          );
        } else {
          _showErrorSnackBar('❌ Error al registrar asistencia. Intenta de nuevo.');
        }
      }
    } catch (e) {
      if (mounted) {
        _showErrorSnackBar('❌ Error al registrar asistencia: ${e.toString()}');
      }
    } finally {
      if (mounted) {
        setState(() {
          isRegisteringAttendance = false;
        });
      }
    }
  }

  // Load current stats for the player in this match
  Future<void> _loadCurrentStats() async {
    if (player == null || widget.matchId == null) return;
    
    try {
      // Get current stats from database
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
      print('❌ Error cargando estadísticas actuales: $e');
    }
  }

  // Update player stats (goals, yellow cards, red cards)
  Future<void> _updatePlayerStats(String statType, int increment) async {
    if (player == null || widget.matchId == null) {
      _showErrorSnackBar('No se puede actualizar estadísticas sin un partido activo');
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
          // Update local stats
          setState(() {
            currentStats[statType] = (currentStats[statType]! + increment).clamp(0, 999);
          });
          
          String message = '';
          switch (statType) {
            case 'goals':
              message = increment > 0 ? '⚽ Gol agregado' : '⚽ Gol removido';
              break;
            case 'yellow_cards':
              message = increment > 0 ? '🟨 Tarjeta amarilla agregada' : '🟨 Tarjeta amarilla removida';
              break;
            case 'red_cards':
              message = increment > 0 ? '🟥 Tarjeta roja agregada' : '🟥 Tarjeta roja removida';
              break;
          }
          
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Row(
                children: [
                  const Icon(Icons.check_circle, color: Colors.white),
                  const SizedBox(width: 8),
                  Expanded(child: Text(message)),
                ],
              ),
              backgroundColor: Colors.green,
              duration: const Duration(seconds: 2),
            ),
          );
        } else {
          _showErrorSnackBar('Error al actualizar estadística');
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
          return AlertDialog(
            title: Text('Estadísticas - ${player!.name}'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (widget.matchId == null)
                  const Padding(
                    padding: EdgeInsets.only(bottom: 16),
                    child: Text(
                      'Nota: Se necesita un partido activo para registrar estadísticas',
                      style: TextStyle(color: Colors.orange, fontSize: 12),
                    ),
                  ),
                
                // Goals section
                _buildStatRowDialog(
                  '⚽ Goles',
                  currentValue: currentStats['goals'] ?? 0,
                  onAdd: widget.matchId != null ? () async {
                    await _updatePlayerStats('goals', 1);
                    setDialogState(() {}); // Update dialog UI
                  } : null,
                  onRemove: widget.matchId != null ? () async {
                    await _updatePlayerStats('goals', -1);
                    setDialogState(() {}); // Update dialog UI
                  } : null,
                ),
                
                const SizedBox(height: 16),
                
                // Yellow cards section
                _buildStatRowDialog(
                  '🟨 Tarjetas Amarillas',
                  currentValue: currentStats['yellow_cards'] ?? 0,
                  onAdd: widget.matchId != null ? () async {
                    await _updatePlayerStats('yellow_cards', 1);
                    setDialogState(() {}); // Update dialog UI
                  } : null,
                  onRemove: widget.matchId != null ? () async {
                    await _updatePlayerStats('yellow_cards', -1);
                    setDialogState(() {}); // Update dialog UI
                  } : null,
                ),
                
                const SizedBox(height: 16),
                
                // Red cards section
                _buildStatRowDialog(
                  '🟥 Tarjetas Rojas',
                  currentValue: currentStats['red_cards'] ?? 0,
                  onAdd: widget.matchId != null ? () async {
                    await _updatePlayerStats('red_cards', 1);
                    setDialogState(() {}); // Update dialog UI
                  } : null,
                  onRemove: widget.matchId != null ? () async {
                    await _updatePlayerStats('red_cards', -1);
                    setDialogState(() {}); // Update dialog UI
                  } : null,
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () {
                  Navigator.pop(context);
                  // Reload stats when dialog is closed
                  _loadCurrentStats();
                },
                child: const Text('Cerrar'),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildStatRowDialog(String title, {required int currentValue, VoidCallback? onAdd, VoidCallback? onRemove}) {
    final bool canModify = onAdd != null && onRemove != null && !isUpdatingStats;
    
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.grey.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.withOpacity(0.3)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Text(
              title,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
            ),
          ),
          Row(
            children: [
              IconButton(
                onPressed: canModify && currentValue > 0 ? onRemove : null,
                icon: isUpdatingStats 
                    ? const SizedBox(
                        width: 20, 
                        height: 20, 
                        child: CircularProgressIndicator(strokeWidth: 2)
                      )
                    : const Icon(Icons.remove_circle),
                color: canModify && currentValue > 0 ? Colors.red : Colors.grey,
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: isUpdatingStats 
                      ? Colors.orange.withOpacity(0.1)
                      : Colors.blue.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: isUpdatingStats 
                        ? Colors.orange.withOpacity(0.3)
                        : Colors.blue.withOpacity(0.3)
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (isUpdatingStats) ...[
                      const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                      const SizedBox(width: 8),
                    ],
                    Text(
                      '$currentValue',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: isUpdatingStats ? Colors.orange : Colors.blue,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                onPressed: canModify ? onAdd : null,
                icon: isUpdatingStats 
                    ? const SizedBox(
                        width: 20, 
                        height: 20, 
                        child: CircularProgressIndicator(strokeWidth: 2)
                      )
                    : const Icon(Icons.add_circle),
                color: canModify ? Colors.green : Colors.grey,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatRow(String title, {required int currentValue, VoidCallback? onAdd, VoidCallback? onRemove}) {
    final bool canModify = onAdd != null && onRemove != null && !isUpdatingStats;
    
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.grey.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.withOpacity(0.3)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Text(
              title,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
            ),
          ),
          Row(
            children: [
              IconButton(
                onPressed: canModify && currentValue > 0 ? onRemove : null,
                icon: const Icon(Icons.remove_circle),
                color: canModify && currentValue > 0 ? Colors.red : Colors.grey,
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.blue.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.blue.withOpacity(0.3)),
                ),
                child: Text(
                  '$currentValue',
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.blue,
                  ),
                ),
              ),
              IconButton(
                onPressed: canModify ? onAdd : null,
                icon: const Icon(Icons.add_circle),
                color: canModify ? Colors.green : Colors.grey,
              ),
            ],
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
    if (today.month < birth.month || (today.month == birth.month && today.day < birth.day)) {
      age--;
    }
    return age;
  }

  // Helper method to get appropriate ImageProvider for the photo
  ImageProvider? _getPhotoImageProvider(String? photoUrl) {
    if (photoUrl == null || photoUrl.isEmpty) return null;
    
    if (photoUrl.startsWith('data:image/')) {
      // Handle base64 images
      try {
        final base64String = photoUrl.split(',')[1]; // Remove data:image/...;base64, prefix
        final bytes = base64Decode(base64String);
        print('✅ Convirtiendo imagen base64 a MemoryImage (${bytes.length} bytes)');
        return MemoryImage(bytes);
      } catch (e) {
        print('❌ Error decodificando imagen base64: $e');
        return null;
      }
    } else {
      // Handle regular URLs
      print('✅ Usando NetworkImage para URL: $photoUrl');
      return NetworkImage(photoUrl);
    }
  }

  @override
  Widget build(BuildContext context) {
    // Debug: Print photo URL when building
    if (player?.photo != null) {
      print('🖼️ Renderizando foto del jugador: ${player!.photo}');
    } else {
      print('⚠️ Jugador sin foto URL');
    }
    
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.qrData.playerName),
        backgroundColor: Colors.green,
        foregroundColor: Colors.white,
      ),
      body: isLoading
          ? const Center(child: CircularProgressIndicator())
          : player == null
              ? const Center(
                  child: Text(
                    'Jugador no encontrado',
                    style: TextStyle(fontSize: 18),
                  ),
                )
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      // Player Photo
                      Stack(
                        children: [
                          CircleAvatar(
                            radius: 80,
                            backgroundImage: _getPhotoImageProvider(player!.photo),
                            child: _getPhotoImageProvider(player!.photo) == null 
                                ? const Icon(Icons.person, size: 80) 
                                : null,
                            onBackgroundImageError: (exception, stackTrace) {
                              print('❌ Error cargando imagen: $exception');
                              print('🖼️ URL que falló: ${player!.photo}');
                            },
                          ),
                          Positioned(
                            bottom: 0,
                            right: 0,
                            child: FloatingActionButton.small(
                              onPressed: isUploadingPhoto ? null : _takePhoto,
                              backgroundColor: Colors.green,
                              child: isUploadingPhoto
                                  ? const SizedBox(
                                      width: 20,
                                      height: 20,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        color: Colors.white,
                                      ),
                                    )
                                  : const Icon(Icons.camera_alt, color: Colors.white),
                            ),
                          ),
                        ],
                      ),
                      
                      const SizedBox(height: 24),
                      
                      // Player Info Card
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    player!.name,
                                    style: const TextStyle(
                                      fontSize: 24,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 12,
                                      vertical: 6,
                                    ),
                                    decoration: BoxDecoration(
                                      color: Colors.green,
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: Text(
                                      '#${player!.jerseyNumber}',
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 16,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              
                              const SizedBox(height: 16),
                              
                              _buildInfoRow('Posición', player!.position),
                              
                              if (player!.birthDate != null) ...[
                                const SizedBox(height: 8),
                                _buildInfoRow('Edad', '${_calculateAge(player!.birthDate)} años'),
                              ],
                              
                              const SizedBox(height: 8),
                              _buildInfoRow(
                                'Estado', 
                                player!.isActive ? 'Activo' : 'Inactivo',
                                valueColor: player!.isActive ? Colors.green : Colors.red,
                              ),
                              
                              const SizedBox(height: 8),
                              _buildInfoRow(
                                'Registrado', 
                                '${player!.createdAt.day}/${player!.createdAt.month}/${player!.createdAt.year}',
                              ),
                            ],
                          ),
                        ),
                      ),
                      
                      const SizedBox(height: 24),
                      
                      // Attendance Registration Button
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed: hasAttendanceToday || isRegisteringAttendance ? null : _registerAttendance,
                          icon: isRegisteringAttendance
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                )
                              : Icon(
                                  hasAttendanceToday ? Icons.check_circle : Icons.how_to_reg,
                                  color: Colors.white,
                                ),
                          label: Text(
                            hasAttendanceToday 
                                ? (widget.matchId != null 
                                    ? '✅ Asistencia registrada al partido' 
                                    : '✅ Asistencia ya registrada') 
                                : isRegisteringAttendance 
                                    ? 'Registrando asistencia...' 
                                    : (widget.matchId != null 
                                        ? 'Registrar Asistencia al Partido'
                                        : 'Registrar Asistencia'),
                            style: const TextStyle(fontSize: 16),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: hasAttendanceToday ? Colors.grey : Colors.orange,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 16),
                          ),
                        ),
                      ),
                      
                      const SizedBox(height: 16),
                      
                      // Match Stats Button
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed: _showStatsDialog,
                          icon: const Icon(Icons.sports_soccer, color: Colors.white),
                          label: const Text(
                            'Registrar Estadísticas del Partido',
                            style: TextStyle(fontSize: 16),
                          ),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.purple,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 16),
                          ),
                        ),
                      ),
                      
                      const SizedBox(height: 24),
                      
                      // Action Buttons
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                        children: [
                          ElevatedButton.icon(
                            onPressed: () {
                              Navigator.popUntil(context, (route) => route.isFirst);
                            },
                            icon: const Icon(Icons.home),
                            label: const Text('Inicio'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.blue,
                              foregroundColor: Colors.white,
                            ),
                          ),
                          ElevatedButton.icon(
                            onPressed: () {
                              Navigator.pop(context);
                            },
                            icon: const Icon(Icons.qr_code_scanner),
                            label: const Text('Escanear Otro'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.green,
                              foregroundColor: Colors.white,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
    );
  }

  Widget _buildInfoRow(String label, String value, {Color? valueColor}) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 100,
          child: Text(
            '$label:',
            style: const TextStyle(
              fontWeight: FontWeight.w500,
              color: Colors.grey,
            ),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: TextStyle(
              fontSize: 16,
              color: valueColor ?? Colors.black87,
            ),
          ),
        ),
      ],
    );
  }
}