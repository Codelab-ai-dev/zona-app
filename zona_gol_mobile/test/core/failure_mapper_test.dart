import 'package:flutter_test/flutter_test.dart';
import 'package:zona_gol_mobile/core/errors/failures.dart';
import 'package:zona_gol_mobile/core/network/api_exception.dart';
import 'package:zona_gol_mobile/core/network/failure_mapper.dart';

void main() {
  test('401 is an AuthFailure with the API message', () {
    final f = failureFrom(const ApiException(401, 'unauthorized', 'Credenciales inválidas'));
    expect(f, isA<AuthFailure>());
    expect(f.message, 'Credenciales inválidas');
    expect(f.code, 'unauthorized');
  });

  test('403 is a PermissionFailure with a fixed Spanish message', () {
    final f = failureFrom(const ApiException(403, 'forbidden', 'forbidden'));
    expect(f, isA<PermissionFailure>());
    expect(f.message, 'No tienes permiso para esta acción');
  });

  test('404 is a NotFoundFailure', () {
    expect(failureFrom(const ApiException(404, 'not_found', 'x')), isA<NotFoundFailure>());
  });

  test('400 and 422 are ValidationFailures that list the fields', () {
    for (final status in [400, 422]) {
      final f = failureFrom(ApiException(status, 'validation_failed', 'Datos inválidos', const {'teams': 'de otra liga'}));
      expect(f, isA<ValidationFailure>());
      expect(f.message, 'Datos inválidos: teams: de otra liga');
    }
  });

  test('attendance on a closed match (422) tells why', () {
    final f = failureFrom(const ApiException(
        422, 'validation_failed', 'Los datos enviados no son válidos', {'match_id': 'El partido ya terminó'}));
    expect(f, isA<ValidationFailure>());
    expect(f.message, contains('El partido ya terminó'));
  });

  test('no connection is a NetworkFailure', () {
    expect(failureFrom(const ApiException.network()), isA<NetworkFailure>());
  });

  test('409 and 5xx are ServerFailures with the API message', () {
    for (final status in [409, 500, 503]) {
      final f = failureFrom(ApiException(status, 'x', 'mensaje $status'));
      expect(f, isA<ServerFailure>());
      expect(f.message, 'mensaje $status');
    }
  });

  test('an unexpected payload is a ServerFailure, not a crash', () {
    final f = failureFrom(const FormatException('bad json'));
    expect(f, isA<ServerFailure>());
    expect(f.code, 'bad_response');
  });

  test('anything else uses the fallback message', () {
    expect(failureFrom(StateError('x'), 'No se pudo guardar').message, 'No se pudo guardar');
  });
}
