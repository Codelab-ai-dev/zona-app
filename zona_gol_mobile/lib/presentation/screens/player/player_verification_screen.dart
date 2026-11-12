import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/di/injection.dart';
import '../../../domain/entities/player_verification_entity.dart';
import '../../../domain/entities/user_entity.dart';
import '../../bloc/player/player_bloc.dart';
import '../../bloc/player/player_event.dart';
import '../../bloc/player/player_state.dart';

class _S {
  static const Color backgroundDark = Color(0xFF050508);
  static const Color surfaceDark = Color(0xFF0A0A0F);
  static const Color cardDark = Color(0xFF12121A);
  static const Color gold = Color(0xFFFFD700);
  static const Color success = Color(0xFF10B981);
  static const Color error = Color(0xFFEF4444);
  static const Color amber = Color(0xFFF59E0B);
  static const Color textPrimary = Color(0xFFFAFAFA);
  static const Color textSecondary = Color(0xFF9CA3AF);
  static const Color textMuted = Color(0xFF6B7280);
}

/// Player Verification Screen
class PlayerVerificationScreen extends StatelessWidget {
  final UserEntity user;

  const PlayerVerificationScreen({super.key, required this.user});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) {
        final bloc = sl<PlayerBloc>();
        if (user.leagueId != null) {
          bloc.add(LoadPlayerVerificationEvent(leagueId: user.leagueId!));
        }
        return bloc;
      },
      child: _VerificationView(user: user),
    );
  }
}

class _VerificationView extends StatefulWidget {
  final UserEntity user;
  const _VerificationView({required this.user});

  @override
  State<_VerificationView> createState() => _VerificationViewState();
}

class _VerificationViewState extends State<_VerificationView> {
  String _filter = 'all'; // all, pending, verified, no_doc

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light,
      child: Scaffold(
        backgroundColor: _S.backgroundDark,
        appBar: AppBar(
          backgroundColor: _S.surfaceDark,
          foregroundColor: _S.textPrimary,
          elevation: 0,
          leading: IconButton(
            icon: Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.3),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: _S.gold.withOpacity(0.2)),
              ),
              child: const Icon(Icons.arrow_back, color: _S.gold, size: 18),
            ),
            onPressed: () => Navigator.pop(context),
          ),
          title: Text(
            'VERIFICAR JUGADORES',
            style: GoogleFonts.bebasNeue(fontSize: 22, color: _S.textPrimary, letterSpacing: 2),
          ),
          centerTitle: true,
          actions: [
            IconButton(
              icon: const Icon(Icons.refresh, color: _S.gold),
              onPressed: () {
                if (widget.user.leagueId != null) {
                  context.read<PlayerBloc>().add(
                    LoadPlayerVerificationEvent(leagueId: widget.user.leagueId!),
                  );
                }
              },
            ),
          ],
        ),
        body: BlocConsumer<PlayerBloc, PlayerState>(
          listener: (context, state) {
            if (state is PlayerVerified) {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(
                    state.verified
                        ? 'Jugador verificado: ${state.playerName}'
                        : 'Verificación retirada: ${state.playerName}',
                  ),
                  backgroundColor: state.verified ? _S.success : _S.error,
                  behavior: SnackBarBehavior.floating,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              );
              // Reload list
              if (widget.user.leagueId != null) {
                context.read<PlayerBloc>().add(
                  LoadPlayerVerificationEvent(leagueId: widget.user.leagueId!),
                );
              }
            }
          },
          builder: (context, state) {
            if (state is PlayerLoading) {
              return Center(
                child: CircularProgressIndicator(
                  valueColor: AlwaysStoppedAnimation<Color>(_S.gold),
                ),
              );
            }

            if (state is PlayerError) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.error_outline, size: 50, color: _S.error),
                    const SizedBox(height: 16),
                    Text(state.message, style: GoogleFonts.outfit(color: _S.textSecondary)),
                  ],
                ),
              );
            }

            if (state is PlayerVerificationLoaded) {
              return _buildContent(state.players, state.summary);
            }

            return const SizedBox.shrink();
          },
        ),
      ),
    );
  }

  Widget _buildContent(List<PlayerVerificationEntity> allPlayers, VerificationSummaryEntity summary) {
    final filtered = _filterPlayers(allPlayers);
    final total = summary.total;
    final verified = summary.verified;
    final pending = summary.pending;
    final noDoc = summary.noDocument;

    return Column(
      children: [
        // Stats row
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              _buildStatChip('Total', total, _S.gold, _filter == 'all', () => setState(() => _filter = 'all')),
              const SizedBox(width: 8),
              _buildStatChip('Pendientes', pending, _S.amber, _filter == 'pending', () => setState(() => _filter = 'pending')),
              const SizedBox(width: 8),
              _buildStatChip('Verificados', verified, _S.success, _filter == 'verified', () => setState(() => _filter = 'verified')),
              const SizedBox(width: 8),
              _buildStatChip('Sin INE', noDoc, _S.error, _filter == 'no_doc', () => setState(() => _filter = 'no_doc')),
            ],
          ),
        ),

        // Player list
        Expanded(
          child: filtered.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.verified_user_outlined, size: 60, color: _S.textMuted),
                      const SizedBox(height: 16),
                      Text('No hay jugadores', style: GoogleFonts.bebasNeue(fontSize: 18, color: _S.textPrimary, letterSpacing: 1)),
                      Text('en esta categoría', style: GoogleFonts.outfit(fontSize: 14, color: _S.textSecondary)),
                    ],
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: filtered.length,
                  itemBuilder: (context, index) => _buildPlayerCard(filtered[index]),
                ),
        ),
      ],
    );
  }

  List<PlayerVerificationEntity> _filterPlayers(List<PlayerVerificationEntity> players) {
    switch (_filter) {
      case 'pending':
        return players.where((p) => p.status == VerificationStatus.pending).toList();
      case 'verified':
        return players.where((p) => p.status == VerificationStatus.verified).toList();
      case 'no_doc':
        return players.where((p) => p.status == VerificationStatus.noDocument).toList();
      default:
        return players;
    }
  }

  Widget _buildStatChip(String label, int count, Color color, bool isSelected, VoidCallback onTap) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: isSelected ? color.withOpacity(0.2) : _S.cardDark,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: isSelected ? color : color.withOpacity(0.2)),
          ),
          child: Column(
            children: [
              Text(
                count.toString(),
                style: GoogleFonts.bebasNeue(fontSize: 20, color: color),
              ),
              Text(
                label,
                style: GoogleFonts.outfit(fontSize: 9, color: _S.textSecondary),
                textAlign: TextAlign.center,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPlayerCard(PlayerVerificationEntity player) {
    final hasDoc = player.status == VerificationStatus.pending;

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: _S.cardDark,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: player.isVerified
              ? _S.success.withOpacity(0.3)
              : hasDoc
                  ? _S.amber.withOpacity(0.3)
                  : _S.error.withOpacity(0.2),
        ),
      ),
      child: Row(
        children: [
          // Player avatar
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: _S.surfaceDark,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: _S.gold.withOpacity(0.2)),
            ),
            child: Center(
              child: Text(
                player.initials,
                style: GoogleFonts.bebasNeue(fontSize: 16, color: _S.gold),
              ),
            ),
          ),
          const SizedBox(width: 12),

          // Player info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  player.displayName,
                  style: GoogleFonts.outfit(fontSize: 14, color: _S.textPrimary, fontWeight: FontWeight.w500),
                ),
                Text(
                  player.teamName,
                  style: GoogleFonts.outfit(fontSize: 11, color: _S.textMuted),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Row(
                  children: [
                    // Status badge
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: player.isVerified
                            ? _S.success.withOpacity(0.2)
                            : hasDoc
                                ? _S.amber.withOpacity(0.2)
                                : _S.error.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        player.isVerified ? 'Verificado' : hasDoc ? 'Pendiente' : 'Sin INE',
                        style: GoogleFonts.outfit(
                          fontSize: 10,
                          color: player.isVerified ? _S.success : hasDoc ? _S.amber : _S.error,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Actions
          if (hasDoc) ...[
            // View document
            IconButton(
              icon: const Icon(Icons.visibility, color: _S.gold, size: 20),
              onPressed: () => _showDocumentViewer(player),
              tooltip: 'Ver documento',
            ),
            // Approve
            IconButton(
              icon: const Icon(Icons.check_circle, color: _S.success, size: 20),
              onPressed: () => _verifyPlayer(player, true),
              tooltip: 'Aprobar',
            ),
          ] else if (player.isVerified) ...[
            if (player.hasDocument)
              IconButton(
                icon: const Icon(Icons.visibility, color: _S.gold, size: 20),
                onPressed: () => _showDocumentViewer(player),
                tooltip: 'Ver documento',
              ),
            // Remove the verification
            IconButton(
              icon: const Icon(Icons.verified, color: _S.success, size: 20),
              onPressed: () => _verifyPlayer(player, false),
              tooltip: 'Quitar verificación',
            ),
          ],
        ],
      ),
    );
  }

  void _verifyPlayer(PlayerVerificationEntity player, bool verified) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: _S.cardDark,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text(
          verified ? 'Aprobar jugador' : 'Quitar verificación',
          style: GoogleFonts.outfit(color: _S.textPrimary),
        ),
        content: Text(
          verified
              ? '¿Confirmas que el documento de ${player.name} es válido?'
              : '¿Quitar la verificación de ${player.name}? El documento se conserva para revisarlo de nuevo.',
          style: GoogleFonts.outfit(color: _S.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text('Cancelar', style: TextStyle(color: _S.textMuted)),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              context.read<PlayerBloc>().add(
                VerifyPlayerEvent(
                  playerId: player.playerId,
                  playerName: player.name,
                  verified: verified,
                  documentKey: player.documentKey,
                ),
              );
            },
            style: TextButton.styleFrom(
              foregroundColor: verified ? _S.success : _S.error,
            ),
            child: Text(verified ? 'Aprobar' : 'Quitar'),
          ),
        ],
      ),
    );
  }

  void _showDocumentViewer(PlayerVerificationEntity player) {
    // The document is private: ask for a short-lived link each time.
    final urlFuture = context.read<PlayerBloc>().documentUrl(player.documentKey!);
    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        backgroundColor: _S.cardDark,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      'Documento: ${player.name}',
                      style: GoogleFonts.outfit(fontSize: 16, color: _S.textPrimary, fontWeight: FontWeight.w600),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: _S.textMuted),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
            ),
            Container(
              constraints: const BoxConstraints(maxHeight: 400),
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: FutureBuilder(
                  future: urlFuture,
                  builder: (context, snapshot) {
                    if (!snapshot.hasData) {
                      return const SizedBox(
                        height: 200,
                        child: Center(
                          child: CircularProgressIndicator(valueColor: AlwaysStoppedAnimation<Color>(_S.gold)),
                        ),
                      );
                    }
                    return snapshot.data!.fold(
                      (failure) => _buildImageError(failure.message),
                      (url) => player.isPdf ? _buildPdfLink(url) : _buildDocumentImage(url),
                    );
                  },
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  if (!player.isVerified)
                    ElevatedButton.icon(
                      onPressed: () {
                        Navigator.pop(ctx);
                        _verifyPlayer(player, true);
                      },
                      icon: const Icon(Icons.check_circle, size: 18),
                      label: const Text('Aprobar'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _S.success,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
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

  Widget _buildDocumentImage(String url) {
    return Image.network(
      url,
      fit: BoxFit.contain,
      errorBuilder: (_, __, ___) => _buildImageError(),
    );
  }

  Widget _buildPdfLink(String url) {
    return SizedBox(
      height: 160,
      child: Center(
        child: TextButton.icon(
          onPressed: () => launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication),
          icon: const Icon(Icons.picture_as_pdf, color: _S.gold),
          label: Text('Abrir documento PDF', style: GoogleFonts.outfit(color: _S.gold)),
        ),
      ),
    );
  }

  Widget _buildImageError([String message = 'Error al cargar imagen']) {
    return Container(
      height: 200,
      color: _S.surfaceDark,
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.broken_image, size: 40, color: _S.textMuted),
            const SizedBox(height: 8),
            Text(message, textAlign: TextAlign.center, style: GoogleFonts.outfit(color: _S.textMuted)),
          ],
        ),
      ),
    );
  }
}
