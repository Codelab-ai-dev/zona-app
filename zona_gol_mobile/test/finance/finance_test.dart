import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:zona_gol_mobile/core/errors/failures.dart';
import 'package:zona_gol_mobile/core/network/api_client.dart';
import 'package:zona_gol_mobile/core/network/token_store.dart';
import 'package:zona_gol_mobile/data/mappers/finance_mapper.dart';
import 'package:zona_gol_mobile/data/mappers/whatsapp_mapper.dart';
import 'package:zona_gol_mobile/data/repositories/finance_repository_impl.dart';
import 'package:zona_gol_mobile/data/repositories/whatsapp_repository_impl.dart';
import 'package:zona_gol_mobile/domain/entities/finance_enums.dart';
import 'package:zona_gol_mobile/domain/entities/whatsapp_link_entity.dart';
import 'package:zona_gol_mobile/domain/usecases/create_finance_transaction_usecase.dart';

class MemoryStore implements KeyValueStore {
  final values = <String, String>{};
  @override
  Future<String?> read(String key) async => values[key];
  @override
  Future<void> write(String key, String value) async => values[key] = value;
  @override
  Future<void> delete(String key) async => values.remove(key);
}

http.Response json(Object? body, [int status = 200]) => body == null
    ? http.Response('', status)
    : http.Response(jsonEncode(body), status,
        headers: {'content-type': 'application/json; charset=utf-8'});

Map<String, dynamic> page(List<Object> data) => {
      'data': data,
      'page': {'limit': 100, 'offset': 0, 'total': data.length},
    };

const leagueId = '62749413-4725-4100-a14f-9dc5fd47cb2e';
const teamId = '2a371f77-078a-4c4a-b93a-9d2732516d57';

// Copied from the live API (GET /leagues/{id}/finance/config): money is a JSON number here.
final configJson = {
  'id': '767cf36e-a103-4ac0-b869-ec68687c49a6',
  'league_id': leagueId,
  'name': 'default',
  'team_registration_fee': 0,
  'player_registration_fee': 0,
  'late_registration_surcharge': 0,
  'yellow_card_fine': 50.00,
  'red_card_fine': 150.00,
  'double_yellow_fine': 100.00,
  'absence_fine': 500.00,
  'late_arrival_fine': 100.00,
  'misconduct_fine': 200.00,
  'uniform_violation_fine': 100.00,
  'referee_fee_per_match': 300.00,
  'assistant_referee_fee': 150.00,
  'field_rental_per_match': 0,
  'currency': 'MXN',
  'payment_due_days': 7,
  'auto_generate_fines': true,
  'auto_generate_referee_fees': false,
  'notify_on_new_charge': true,
  'notify_on_overdue': true,
  'overdue_grace_days': 3,
  'is_active': true,
  'created_by': '0d4944cb-e2f7-4af6-b867-d04d24b6e223',
  'updated_by': '0d4944cb-e2f7-4af6-b867-d04d24b6e223',
  'created_at': '2026-11-08T03:50:50.605969Z',
  'updated_at': '2026-11-09T14:02:01.501861Z',
};

// Copied from the live API (GET /leagues/{id}/finance/balances).
final balanceJson = {
  'team_id': teamId,
  'team_name': 'Deportivo Juárez',
  'team_slug': 'equipo-4',
  'league_id': leagueId,
  'league_name': 'Liga Demo Zona Gol',
  'tournament_id': '1cd5a549-ba87-4119-99f9-c2b1721ab3e3',
  'total_charges': '650.00',
  'total_paid': '0',
  'balance': '-650.00',
  'pending_balance': '600.00',
  'overdue_count': 1,
  'pending_fines_count': 2,
};

// Copied from the live API (GET /leagues/{id}/finance/summary).
final summaryJson = {
  'league_id': leagueId,
  'league_name': 'Liga Demo Zona Gol',
  'league_slug': 'liga-demo',
  'total_income': '1200.00',
  'total_charges': '650.00',
  'total_collected': '50.00',
  'total_pending': '600.00',
  'total_overdue': '150.00',
  'teams_with_transactions': 1,
  'total_transactions': 3,
  'overdue_transactions': 1,
  'total_card_fines': 0,
};

// Shape of finance.Transaction (backend/internal/finance/finance.go).
Map<String, dynamic> txJson({String status = 'partial', String amountPaid = '50.00'}) => {
      'id': 'b0f7c0a2-0000-4000-8000-000000000001',
      'league_id': leagueId,
      'team_id': teamId,
      'player_id': '5f0c0000-0000-4000-8000-000000000009',
      'player_name': 'Juan Pérez',
      'player_number': 9,
      'transaction_type': 'red_card_fine',
      'description': 'Multa por tarjeta roja',
      'amount': '150.00',
      'amount_paid': amountPaid,
      'is_income': false,
      'transaction_date': '2026-11-10T00:00:00Z',
      'due_date': '2026-11-17T00:00:00Z',
      'status': status,
      'payment_method': 'bank_transfer',
      'payment_reference': 'SPEI-123',
      'auto_generated': true,
      'created_at': '2026-11-10T18:00:00Z',
      'updated_at': '2026-11-10T18:00:00Z',
    };

void main() {
  late List<http.Request> requests;

  Future<ApiClient> client(Future<http.Response> Function(http.Request) handler) async {
    final tokens = TokenStore(MemoryStore());
    await tokens.save(
        access: 't', refresh: 'r', expiresAt: DateTime.now().add(const Duration(hours: 1)));
    return ApiClient(
      baseUrl: 'http://api.test',
      tokens: tokens,
      httpClient: MockClient((req) {
        requests.add(req);
        return handler(req);
      }),
    );
  }

  setUp(() => requests = []);

  group('FinanceMapper', () {
    test('reads the config (numbers or strings) and writes decimal strings', () {
      final config = FinanceMapper.configFromJson(configJson);
      expect(config.yellowCardFine, 50);
      expect(config.absenceFine, 500);
      expect(config.refereeFeePerMatch, 300);
      expect(config.currency, Currency.mxn);
      expect(config.paymentDueDays, 7);
      expect(config.notifyOnOverdue, isTrue);
      expect(config.defaultAmountFor(TransactionType.redCardFine), 150);

      final body = FinanceMapper.configToJson(config);
      expect(body['red_card_fine'], '150.00');
      expect(body['currency'], 'MXN');
      expect(body['payment_due_days'], 7);
      // Only fields of UpdateConfigRequest: the API rejects unknown ones.
      expect(body.keys, isNot(contains('name')));
      expect(body.keys, isNot(contains('monthly_fee')));
      expect(body.keys, isNot(contains('league_id')));
      expect(body.length, 22);
    });

    test('reads a transaction; DATE columns keep their calendar day', () {
      final tx = FinanceMapper.transactionFromJson(txJson(), teamName: 'Deportivo Juárez');
      expect(tx.transactionType, TransactionType.redCardFine);
      expect(tx.status, TransactionStatus.partial);
      expect(tx.amount, 150);
      expect(tx.amountPaid, 50);
      expect(tx.amountPending, 100);
      expect(tx.paymentMethod, PaymentMethod.bankTransfer);
      expect(tx.dueDate, DateTime(2026, 11, 17));
      expect(tx.transactionDate, DateTime(2026, 11, 10));
      expect(tx.playerNumber, 9);
      expect(tx.teamName, 'Deportivo Juárez');
      expect(tx.isOpen, isTrue);
    });

    test('balance and summary', () {
      final b = FinanceMapper.balanceFromJson(balanceJson);
      expect(b.totalCharges, 650);
      expect(b.pendingBalance, 600);
      expect(b.balance, -650);
      expect(b.overdueCount, 1);
      expect(b.paymentPercentage, closeTo(7.69, 0.01));

      final s = FinanceMapper.summaryFromJson(summaryJson);
      expect(s.totalIncome, 1200);
      expect(s.totalCollected, 50);
      expect(s.totalOverdue, 150);
      expect(s.totalTransactions, 3);
    });

    test('enum values match the API', () {
      for (final t in TransactionType.values) {
        expect(TransactionType.fromString(t.dbValue), t);
      }
      expect(TransactionStatus.fromString('partial'), TransactionStatus.partial);
      expect(Currency.fromString('PEN'), Currency.pen);
      expect(TransactionType.sponsorship.isIncome, isTrue);
      expect(TransactionType.yellowCardFine.isIncome, isFalse);
      expect(TransactionType.yellowCardFine.needsTeam, isTrue);
      expect(TransactionType.fieldRental.needsTeam, isFalse);
    });
  });

  group('FinanceRepositoryImpl', () {
    test('getConfig and updateConfig use /finance/config', () async {
      final api = await client((req) async => json(configJson));
      final repo = FinanceRepositoryImpl(api: api);

      final config = (await repo.getConfig(leagueId)).getOrElse(() => throw 'fail');
      await repo.updateConfig(config.copyWith(yellowCardFine: 75));

      expect(requests[0].url.path, '/api/v1/leagues/$leagueId/finance/config');
      expect(requests[1].method, 'PUT');
      final body = jsonDecode(requests[1].body) as Map<String, dynamic>;
      expect(body['yellow_card_fine'], '75.00');
      expect(requests[1].headers['Authorization'], 'Bearer t');
    });

    test('getTransactions sends the filters and resolves team names from balances', () async {
      final api = await client((req) async {
        if (req.url.path.endsWith('/balances')) return json(page([balanceJson]));
        return json(page([txJson()]));
      });
      final result = await FinanceRepositoryImpl(api: api).getTransactions(
        leagueId,
        status: TransactionStatus.partial,
        type: TransactionType.redCardFine,
      );

      final list = result.getOrElse(() => throw 'fail');
      expect(list.single.teamName, 'Deportivo Juárez');
      final txReq = requests.firstWhere((r) => r.url.path.endsWith('/transactions'));
      expect(txReq.url.path, '/api/v1/leagues/$leagueId/finance/transactions');
      expect(txReq.url.queryParameters['status'], 'partial');
      expect(txReq.url.queryParameters['transaction_type'], 'red_card_fine');
    });

    test('a team filter uses the team statement route', () async {
      final api = await client((req) async => json(page([])));
      await FinanceRepositoryImpl(api: api).getTransactions(leagueId, teamId: teamId);
      expect(requests.map((r) => r.url.path),
          contains('/api/v1/leagues/$leagueId/finance/teams/$teamId/transactions'));
    });

    test('createTransaction sends the CreateTransactionRequest shape', () async {
      final api = await client((req) async => json(txJson(status: 'pending', amountPaid: '0'), 201));
      final result = await FinanceRepositoryImpl(api: api).createTransaction(
        leagueId: leagueId,
        teamId: teamId,
        type: TransactionType.redCardFine,
        amount: 150,
        description: 'Multa por tarjeta roja',
        dueDate: DateTime(2026, 11, 17),
      );

      expect(result.isRight(), isTrue);
      final body = jsonDecode(requests.single.body) as Map<String, dynamic>;
      expect(body, {
        'transaction_type': 'red_card_fine',
        'description': 'Multa por tarjeta roja',
        'amount': '150.00',
        'is_income': false,
        'team_id': teamId,
        // time.Time on the API: RFC 3339 is required (a bare date is a 400).
        'due_date': '2026-11-17T00:00:00Z',
      });
    });

    test('pay and cancel post their DTOs', () async {
      final api = await client((req) async => json(txJson(status: 'paid', amountPaid: '150.00')));
      final repo = FinanceRepositoryImpl(api: api);
      final paid = await repo.registerPayment(
        leagueId: leagueId,
        transactionId: 'tx1',
        amount: 100,
        paymentMethod: PaymentMethod.spei,
        paymentReference: 'ABC',
      );
      await repo.cancelTransaction(leagueId: leagueId, transactionId: 'tx1', reason: 'Error de captura');

      expect(paid.getOrElse(() => throw 'fail').isPaid, isTrue);
      expect(requests[0].url.path, '/api/v1/leagues/$leagueId/finance/transactions/tx1/pay');
      expect(jsonDecode(requests[0].body),
          {'amount': '100.00', 'payment_method': 'spei', 'payment_reference': 'ABC'});
      expect(requests[1].url.path, '/api/v1/leagues/$leagueId/finance/transactions/tx1/cancel');
      expect(jsonDecode(requests[1].body), {'reason': 'Error de captura'});
    });

    test('generateFinesFromMatch returns fines_created', () async {
      final api = await client((req) async =>
          json({'fines_created': 2, 'total_amount': {'Float64': 200, 'Valid': true}}));
      final result = await FinanceRepositoryImpl(api: api)
          .generateFinesFromMatch(matchId: 'm1', leagueId: leagueId);
      expect(result.getOrElse(() => -1), 2);
      expect(requests.single.url.path, '/api/v1/leagues/$leagueId/finance/matches/m1/generate-fines');
    });

    test('API validation errors become ValidationFailure', () async {
      final api = await client((req) async => json({
            'error': {
              'code': 'validation_failed',
              'message': 'Los datos enviados no son válidos',
              'fields': {'amount': 'debe ser mayor a 0'},
            }
          }, 400));
      final result = await FinanceRepositoryImpl(api: api).registerPayment(
          leagueId: leagueId, transactionId: 'tx1', amount: 1, paymentMethod: PaymentMethod.cash);
      expect(result.fold((f) => f, (_) => null), isA<ValidationFailure>());
    });
  });

  group('CreateFinanceTransactionUseCase', () {
    test('a fine needs a team and a description', () async {
      final api = await client((req) async => json({}));
      final useCase = CreateFinanceTransactionUseCase(FinanceRepositoryImpl(api: api));
      final noTeam = await useCase(const CreateFinanceTransactionParams(
          leagueId: leagueId, type: TransactionType.yellowCardFine, amount: 50, description: 'Multa'));
      final noDescription = await useCase(const CreateFinanceTransactionParams(
          leagueId: leagueId, teamId: teamId, type: TransactionType.yellowCardFine, amount: 50, description: ' '));
      expect(noTeam.isLeft(), isTrue);
      expect(noDescription.isLeft(), isTrue);
      expect(requests, isEmpty);
    });
  });

  group('WhatsApp links', () {
    // Shape of directory.WhatsAppLink (backend/internal/directory/directory.go).
    final linkJson = {
      'id': 'c1a1d000-0000-4000-8000-000000000001',
      'phone_number': '525512345678',
      'league_id': leagueId,
      'role': 'team_owner',
      'is_active': true,
      'linked_at': '2026-11-10T18:00:00Z',
      'display_name': 'Carlos Ruiz',
      'preferred_language': 'es',
      'created_at': '2026-11-10T18:00:00Z',
      'updated_at': '2026-11-10T18:00:00Z',
    };

    test('mapper and phone helpers', () {
      final link = WhatsAppMapper.fromJson(linkJson);
      expect(link.linkedAt, DateTime.utc(2026, 11, 10, 18).toLocal());
      expect(link.formattedPhone, '+52 551 234 5678');
      expect(link.localPhone, '5512345678');
      expect(link.roleDisplay, 'Dueño Equipo');
      expect(WhatsAppLinkEntity.isValidPhoneNumber('+52 55 1234 5678'), isTrue);
      expect(WhatsAppLinkEntity.isValidPhoneNumber('12345'), isFalse);
    });

    test('create sends digits only; 409 means the number is already linked', () async {
      final api = await client((req) async => json({
            'error': {'code': 'conflict', 'message': 'Ya existe'}
          }, 409));
      final result = await WhatsAppRepositoryImpl(api: api).createLink(
          phoneNumber: '+52 5512345678', role: 'user', leagueId: leagueId, displayName: 'Ana');

      expect(requests.single.url.path, '/api/v1/leagues/$leagueId/whatsapp-links');
      expect(jsonDecode(requests.single.body), {
        'phone_number': '525512345678',
        'role': 'user',
        'preferred_language': 'es',
        'display_name': 'Ana',
      });
      expect(result.fold((f) => f.message, (_) => ''), 'Este número de teléfono ya está vinculado');
    });

    test('list, update, toggle and delete (deactivate) routes', () async {
      final api = await client((req) async =>
          req.method == 'GET' ? json(page([linkJson])) : json(linkJson));
      final repo = WhatsAppRepositoryImpl(api: api);

      final links = (await repo.getLinks(leagueId)).getOrElse(() => throw 'fail');
      await repo.updateLink(id: 'l1', phoneNumber: '525512345679', displayName: 'Carlos');
      await repo.toggleActive(id: 'l1', isActive: false);
      final deleted = await repo.deleteLink('l1');

      expect(links.single.phoneNumber, '525512345678');
      expect(requests[1].method, 'PUT');
      expect(requests[1].url.path, '/api/v1/whatsapp-links/l1');
      expect(jsonDecode(requests[1].body), {'phone_number': '525512345679', 'display_name': 'Carlos'});
      expect(jsonDecode(requests[2].body), {'is_active': false});
      expect(requests[3].method, 'DELETE');
      expect(deleted.isRight(), isTrue);
    });
  });
}
