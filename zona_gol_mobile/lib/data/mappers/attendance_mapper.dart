import '../../core/network/json.dart';
import '../../domain/entities/attendance_entity.dart';

/// Maps the API's attendance shapes to domain entities.
class AttendanceMapper {
  /// `attendance.TodayMatch` from `GET /players/{id}/today-matches`.
  static TodayMatchEntity todayMatchFromJson(Map<String, dynamic> json) {
    final time = json.strOrNull('match_time');
    return TodayMatchEntity(
      matchId: json.str('match_id'),
      tournamentId: json.str('tournament_id'),
      matchTime: (time == null || time.isEmpty) ? null : time,
      status: json.str('status', 'scheduled'),
      homeTeamName: json.str('home_team_name'),
      awayTeamName: json.str('away_team_name'),
      fieldNumber: json.intOrNull('field_number'),
      alreadyRegistered: json.boolean('already_registered'),
    );
  }
}
