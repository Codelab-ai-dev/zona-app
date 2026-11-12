import 'dart:convert';

import 'package:dartz/dartz.dart' show Right;
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:zona_gol_mobile/core/errors/failures.dart';
import 'package:zona_gol_mobile/core/network/api_client.dart';
import 'package:zona_gol_mobile/core/network/token_store.dart';
import 'package:zona_gol_mobile/core/utils/qr_service.dart';
import 'package:zona_gol_mobile/data/mappers/attendance_mapper.dart';
import 'package:zona_gol_mobile/data/repositories/attendance_repository_impl.dart';
import 'package:zona_gol_mobile/domain/entities/attendance_entity.dart';
import 'package:zona_gol_mobile/domain/repositories/attendance_repository.dart';
import 'package:zona_gol_mobile/domain/usecases/register_attendance_usecase.dart';
import 'package:zona_gol_mobile/presentation/bloc/attendance/attendance_bloc.dart';
import 'package:zona_gol_mobile/presentation/bloc/attendance/attendance_event.dart';
import 'package:zona_gol_mobile/presentation/bloc/attendance/attendance_state.dart';

class MemoryStore implements KeyValueStore {
  final values = <String, String>{};
  @override
  Future<String?> read(String key) async => values[key];
  @override
  Future<void> write(String key, String value) async => values[key] = value;
  @override
  Future<void> delete(String key) async => values.remove(key);
}

http.Response json(Object body, [int status = 200]) =>
    http.Response(jsonEncode(body), status, headers: {'content-type': 'application/json'});

const playerId = 'be3391c6-a1f4-42c8-af21-94dc4830d92d';
const teamId = 'bcbe2bf5-afab-491c-95ef-13ec7fbbf046';
const matchA = '01acd332-6a7e-44cd-86e7-c850629a0251';
const matchB = '11acd332-6a7e-44cd-86e7-c850629a0252';

// Real row from GET /players/{id}/today-matches (demo league).
Map<String, dynamic> todayRow({String id = matchA, String? time = '16:00', bool registered = false}) => {
      'match_id': id,
      'tournament_id': '1cd5a549-ba87-4119-99f9-c2b1721ab3e3',
      if (time != null) 'match_time': time,
      'status': 'scheduled',
      'home_team_name': 'Águilas FC',
      'away_team_name': 'Tigres del Norte',
      'field_number': 1,
      'already_registered': registered,
    };

Map<String, dynamic> listOf(List<Map<String, dynamic>> rows) =>
    {'data': rows, 'page': {'limit': rows.length, 'offset': 0, 'total': rows.length}};

String qr() => QRService.generateQRData(const QRPlayerData(
      playerId: playerId,
      playerName: 'Luis García',
      teamId: teamId,
      jerseyNumber: 1,
    ));

void main() {
  late List<http.Request> requests;
  late Future<http.Response> Function(http.Request) handler;
  late AttendanceRepositoryImpl repo;

  setUp(() async {
    requests = [];
    final tokens = TokenStore(MemoryStore());
    await tokens.save(access: 'tok', refresh: 'r', expiresAt: DateTime.now().add(const Duration(hours: 1)));
    final api = ApiClient(
      baseUrl: 'http://api.test',
      tokens: tokens,
      httpClient: MockClient((req) {
        requests.add(req);
        return handler(req);
      }),
    );
    repo = AttendanceRepositoryImpl(api: api);
  });

  group('AttendanceMapper', () {
    test('reads a today-match row', () {
      final m = AttendanceMapper.todayMatchFromJson(todayRow(registered: true));
      expect(m.matchId, matchA);
      expect(m.matchTime, '16:00');
      expect(m.fieldNumber, 1);
      expect(m.alreadyRegistered, isTrue);
      expect(m.displayName, 'Águilas FC vs Tigres del Norte · 16:00');
    });

    test('a match without time omits it from the label', () {
      final m = AttendanceMapper.todayMatchFromJson(todayRow(time: null)..remove('field_number'));
      expect(m.matchTime, isNull);
      expect(m.fieldNumber, isNull);
      expect(m.displayName, 'Águilas FC vs Tigres del Norte');
    });
  });

  group('AttendanceRepositoryImpl', () {
    test('getTodayMatches sends the local date', () async {
      handler = (_) async => json(listOf([todayRow()]));
      final result = await repo.getTodayMatches(playerId, DateTime(2026, 11, 5, 23, 30));

      expect(requests.single.method, 'GET');
      expect(requests.single.url.path, '/api/v1/players/$playerId/today-matches');
      expect(requests.single.url.queryParameters['date'], '2026-11-05');
      expect(result.getOrElse(() => []).single.matchId, matchA);
    });

    test('registerAttendance posts the QR request body', () async {
      handler = (_) async => json({'id': 'x', 'player_id': playerId, 'match_id': matchA}, 201);
      final result = await repo.registerAttendance(playerId: playerId, matchId: matchA);

      expect(result, const Right<Failure, AttendanceResult>(AttendanceResult.registered));
      final req = requests.single;
      expect(req.method, 'POST');
      expect(req.url.path, '/api/v1/matches/$matchA/attendance/qr');
      final body = jsonDecode(req.body) as Map<String, dynamic>;
      expect(body.keys.toSet(), {
        'player_id',
        'recognition_mode',
        'confidence_score',
        'similarity_score',
        'device_info',
        'local_timestamp',
      });
      expect(body['player_id'], playerId);
      expect(body['recognition_mode'], 'quick');
      expect(body['confidence_score'], 1);
      expect(body['similarity_score'], 1);
      expect(jsonDecode(body['device_info'] as String), isA<Map>());
      expect(body['local_timestamp'], matches(RegExp(r'^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d[+-]\d\d:\d\d$')));
      expect(DateTime.parse(body['local_timestamp'] as String).difference(DateTime.now()).inMinutes.abs(), 0);
    });

    test('a 409 means already registered, not an error', () async {
      handler = (_) async => json({'error': {'code': 'conflict', 'message': 'El recurso ya existe o está en conflicto'}}, 409);
      final result = await repo.registerAttendance(playerId: playerId, matchId: matchA);
      expect(result, const Right<Failure, AttendanceResult>(AttendanceResult.alreadyRegistered));
    });

    test('other errors become failures', () async {
      handler = (_) async => json({'error': {'code': 'forbidden', 'message': 'x'}}, 403);
      final result = await repo.registerAttendance(playerId: playerId, matchId: matchA);
      expect(result.fold((f) => f, (_) => null), isA<PermissionFailure>());
    });
  });

  group('AttendanceBloc', () {
    AttendanceBloc bloc() => AttendanceBloc(
          registerAttendanceUseCase: RegisterAttendanceUseCase(repo),
          attendanceRepository: repo,
          now: () => DateTime(2026, 11, 15, 15),
        );

    test('invalid QR emits a scan error', () async {
      handler = (_) async => json(listOf([]));
      final b = bloc()..add(const ScanQRCodeEvent(qrData: 'basura'));
      await expectLater(b.stream, emits(isA<QRScanError>()));
      expect(requests, isEmpty);
      await b.close();
    });

    test('no match today', () async {
      handler = (_) async => json(listOf([]));
      final b = bloc()..add(ScanQRCodeEvent(qrData: qr()));
      await expectLater(
        b.stream,
        emitsInOrder([
          isA<TodayMatchesLoading>(),
          isA<QRScanned>().having((s) => s.hasNoMatch, 'hasNoMatch', isTrue),
        ]),
      );
      expect(requests.single.url.queryParameters['date'], '2026-11-15');
      await b.close();
    });

    test('one match is preselected and registers', () async {
      handler = (req) async => req.method == 'GET' ? json(listOf([todayRow()])) : json({'id': 'x'}, 201);
      final b = bloc()..add(ScanQRCodeEvent(qrData: qr()));
      await expectLater(
        b.stream,
        emitsInOrder([
          isA<TodayMatchesLoading>(),
          isA<QRScanned>().having((s) => s.selectedMatchId, 'selected', matchA),
        ]),
      );
      b.add(const RegisterAttendanceEvent());
      await expectLater(
        b.stream,
        emitsInOrder([
          isA<AttendanceRegistering>(),
          isA<AttendanceRegistered>()
              .having((s) => s.alreadyRegistered, 'already', isFalse)
              .having((s) => s.playerData.playerName, 'name', 'Luis García'),
        ]),
      );
      expect(requests.last.url.path, '/api/v1/matches/$matchA/attendance/qr');
      await b.close();
    });

    test('several matches need a selection; 409 shows already registered', () async {
      handler = (req) async => req.method == 'GET'
          ? json(listOf([todayRow(), todayRow(id: matchB, time: '18:00')]))
          : json({'error': {'code': 'conflict', 'message': 'x'}}, 409);
      final b = bloc()..add(ScanQRCodeEvent(qrData: qr()));
      await expectLater(
        b.stream,
        emitsInOrder([
          isA<TodayMatchesLoading>(),
          isA<QRScanned>().having((s) => s.selectedMatchId, 'selected', isNull),
        ]),
      );
      // Nothing selected: register is ignored.
      b.add(const RegisterAttendanceEvent());
      b.add(const SelectMatchEvent(matchId: matchB));
      await expectLater(b.stream, emits(isA<QRScanned>().having((s) => s.selectedMatchId, 'selected', matchB)));
      b.add(const RegisterAttendanceEvent());
      await expectLater(
        b.stream,
        emitsInOrder([
          isA<AttendanceRegistering>(),
          isA<AttendanceRegistered>().having((s) => s.alreadyRegistered, 'already', isTrue),
        ]),
      );
      expect(requests.where((r) => r.method == 'POST').single.url.path, '/api/v1/matches/$matchB/attendance/qr');
      await b.close();
    });

    test('a match already registered is not posted again', () async {
      handler = (_) async => json(listOf([todayRow(registered: true)]));
      final b = bloc()..add(ScanQRCodeEvent(qrData: qr()));
      await expectLater(b.stream, emitsInOrder([isA<TodayMatchesLoading>(), isA<QRScanned>()]));
      b.add(const RegisterAttendanceEvent());
      await Future<void>.delayed(const Duration(milliseconds: 20));
      expect(b.state, isA<QRScanned>());
      expect(requests.where((r) => r.method == 'POST'), isEmpty);
      await b.close();
    });

    test('a registration error stays on the confirmation card', () async {
      handler = (req) async => req.method == 'GET'
          ? json(listOf([todayRow()]))
          : json({'error': {'code': 'validation_failed', 'message': 'Datos inválidos'}}, 400);
      final b = bloc()..add(ScanQRCodeEvent(qrData: qr()));
      await expectLater(b.stream, emitsInOrder([isA<TodayMatchesLoading>(), isA<QRScanned>()]));
      b.add(const RegisterAttendanceEvent());
      await expectLater(
        b.stream,
        emitsInOrder([
          isA<AttendanceRegistering>(),
          isA<QRScanned>().having((s) => s.errorMessage, 'error', contains('Datos inválidos')),
        ]),
      );
      await b.close();
    });
  });
}
