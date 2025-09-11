class QRPlayerData {
  final String playerId;
  final String playerName;
  final String teamId;
  final int jerseyNumber;
  final String? leagueId;

  QRPlayerData({
    required this.playerId,
    required this.playerName,
    required this.teamId,
    required this.jerseyNumber,
    this.leagueId,
  });

  factory QRPlayerData.fromJson(Map<String, dynamic> json) {
    return QRPlayerData(
      playerId: json['player_id'] ?? json['playerId'] ?? '',
      playerName: json['player_name'] ?? json['playerName'] ?? '',
      teamId: json['team_id'] ?? json['teamId'] ?? '',
      jerseyNumber: json['jersey_number'] ?? json['jerseyNumber'] ?? 0,
      leagueId: json['league_id'] ?? json['leagueId'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'player_id': playerId,
      'player_name': playerName,
      'team_id': teamId,
      'jersey_number': jerseyNumber,
      if (leagueId != null) 'league_id': leagueId,
    };
  }

  @override
  String toString() {
    return 'QRPlayerData(playerId: $playerId, playerName: $playerName, teamId: $teamId, jerseyNumber: $jerseyNumber)';
  }
}