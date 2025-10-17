import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'dart:convert';
import 'dart:typed_data';
import '../models/match.dart';
import '../services/match_service.dart';
import 'match_detail_screen.dart';

class FinishedMatchesScreen extends StatefulWidget {
  const FinishedMatchesScreen({super.key});

  @override
  State<FinishedMatchesScreen> createState() => _FinishedMatchesScreenState();
}

class _FinishedMatchesScreenState extends State<FinishedMatchesScreen> {
  List<Match> matches = [];
  bool isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadMatches();
  }

  Future<void> _loadMatches() async {
    setState(() {
      isLoading = true;
    });

    final matchesList = await MatchService.getFinishedMatches(limit: 30);
    
    if (mounted) {
      setState(() {
        matches = matchesList;
        isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Partidos Finalizados'),
        backgroundColor: Colors.grey,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            onPressed: _loadMatches,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      body: isLoading
          ? const Center(child: CircularProgressIndicator())
          : matches.isEmpty
              ? const Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.history,
                        size: 80,
                        color: Colors.grey,
                      ),
                      SizedBox(height: 16),
                      Text(
                        'No hay partidos finalizados',
                        style: TextStyle(
                          fontSize: 18,
                          color: Colors.grey,
                        ),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadMatches,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: matches.length,
                    itemBuilder: (context, index) {
                      final match = matches[index];
                      return _buildMatchCard(match);
                    },
                  ),
                ),
    );
  }

  Widget _buildMatchCard(Match match) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      elevation: 4,
      child: InkWell(
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => MatchDetailScreen(match: match),
            ),
          );
        },
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Tournament and Date
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      match.tournamentName ?? 'Torneo',
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                        color: Colors.blue,
                      ),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: Colors.grey,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      match.statusText,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
              
              const SizedBox(height: 16),
              
              // Teams with Score
              Row(
                children: [
                  // Home Team
                  Expanded(
                    flex: 2,
                    child: Column(
                      children: [
                        _buildTeamLogo(match.homeTeamLogo),
                        const SizedBox(height: 8),
                        Text(
                          match.homeTeamName ?? 'Equipo Local',
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  
                  // Final Score
                  Expanded(
                    flex: 1,
                    child: Column(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.green.withOpacity(0.1),
                            border: Border.all(color: Colors.green),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            match.scoreText,
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: Colors.green,
                            ),
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'FINAL',
                          style: TextStyle(
                            fontSize: 8,
                            fontWeight: FontWeight.bold,
                            color: Colors.green,
                          ),
                        ),
                      ],
                    ),
                  ),
                  
                  // Away Team
                  Expanded(
                    flex: 2,
                    child: Column(
                      children: [
                        _buildTeamLogo(match.awayTeamLogo),
                        const SizedBox(height: 8),
                        Text(
                          match.awayTeamName ?? 'Equipo Visitante',
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              
              const SizedBox(height: 16),
              
              // Match Date and Winner Indicator
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      const Icon(
                        Icons.calendar_today,
                        size: 16,
                        color: Colors.grey,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        DateFormat('dd/MM/yyyy - HH:mm', 'es').format(match.matchDate),
                        style: const TextStyle(
                          fontSize: 12,
                          color: Colors.grey,
                        ),
                      ),
                    ],
                  ),
                  _buildWinnerIndicator(match),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildWinnerIndicator(Match match) {
    if (match.homeScore == null || match.awayScore == null) {
      return const SizedBox.shrink();
    }

    final homeScore = match.homeScore!;
    final awayScore = match.awayScore!;

    if (homeScore == awayScore) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: Colors.orange,
          borderRadius: BorderRadius.circular(12),
        ),
        child: const Text(
          'EMPATE',
          style: TextStyle(
            color: Colors.white,
            fontSize: 10,
            fontWeight: FontWeight.bold,
          ),
        ),
      );
    }

    final winnerText = homeScore > awayScore 
        ? (match.homeTeamName ?? 'Local').toUpperCase()
        : (match.awayTeamName ?? 'Visitante').toUpperCase();

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.green,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(
            Icons.emoji_events,
            color: Colors.white,
            size: 12,
          ),
          const SizedBox(width: 4),
          Text(
            winnerText.length > 8 ? '${winnerText.substring(0, 8)}...' : winnerText,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 10,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTeamLogo(String? logoUrl) {
    return CircleAvatar(
      radius: 30,
      backgroundColor: Colors.grey[200],
      child: logoUrl != null && logoUrl.isNotEmpty
          ? ClipOval(
              child: _buildLogoImage(logoUrl, 60, 60),
            )
          : const Icon(
              Icons.sports_soccer,
              size: 30,
              color: Colors.green,
            ),
    );
  }

  Widget _buildLogoImage(String logoUrl, double width, double height) {
    // Check if it's a base64 encoded image
    if (logoUrl.startsWith('data:image/')) {
      try {
        // Extract the base64 part after the comma
        final base64String = logoUrl.split(',')[1];
        final Uint8List bytes = base64Decode(base64String);
        
        return Image.memory(
          bytes,
          width: width,
          height: height,
          fit: BoxFit.cover,
          errorBuilder: (context, error, stackTrace) {
            print('❌ Error cargando logo base64: $error');
            return const Icon(
              Icons.sports_soccer,
              size: 30,
              color: Colors.green,
            );
          },
        );
      } catch (e) {
        print('❌ Error decodificando base64: $e');
        return const Icon(
          Icons.sports_soccer,
          size: 30,
          color: Colors.green,
        );
      }
    } else {
      // It's a regular URL
      return Image.network(
        logoUrl,
        width: width,
        height: height,
        fit: BoxFit.cover,
        loadingBuilder: (context, child, loadingProgress) {
          if (loadingProgress == null) return child;
          return const SizedBox(
            width: 30,
            height: 30,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: Colors.green,
            ),
          );
        },
        errorBuilder: (context, error, stackTrace) {
          print('❌ Error cargando logo URL: $logoUrl - $error');
          return const Icon(
            Icons.sports_soccer,
            size: 30,
            color: Colors.green,
          );
        },
      );
    }
  }
}