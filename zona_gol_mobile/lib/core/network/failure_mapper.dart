import '../errors/failures.dart';
import 'api_exception.dart';

/// Converts any error from the data layer into a domain [Failure].
Failure failureFrom(Object error, [String fallback = 'Ocurrió un error inesperado']) {
  if (error is ApiException) {
    if (error.isNetwork) return NetworkFailure(error.message, error.code);
    if (error.isUnauthorized) return AuthFailure(error.message, error.code);
    if (error.isForbidden) return PermissionFailure('No tienes permiso para esta acción', error.code);
    if (error.isNotFound) return NotFoundFailure('No se encontró el recurso', error.code);
    if (error.isValidation) return ValidationFailure(error.fullMessage, error.code);
    return ServerFailure(error.message, error.code);
  }
  if (error is FormatException || error is TypeError) {
    return ServerFailure('Respuesta inesperada del servidor', 'bad_response');
  }
  return ServerFailure(fallback);
}
