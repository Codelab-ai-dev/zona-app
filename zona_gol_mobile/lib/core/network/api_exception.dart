/// Error returned by the Zona Gol API (`{"error": {code, message, fields}}`)
/// or raised when the server cannot be reached (status 0).
class ApiException implements Exception {
  final int status;
  final String code;
  final String message;

  /// Per-field validation messages (status 400/422).
  final Map<String, String> fields;

  const ApiException(this.status, this.code, this.message, [this.fields = const {}]);

  const ApiException.network([String message = 'No se pudo conectar con el servidor'])
      : this(0, 'network', message);

  bool get isNetwork => status == 0;
  bool get isUnauthorized => status == 401;
  bool get isForbidden => status == 403;
  bool get isNotFound => status == 404;
  bool get isConflict => status == 409;
  bool get isValidation => status == 400 || status == 422;

  /// The message plus the field messages, for a snackbar.
  String get fullMessage =>
      fields.isEmpty ? message : '$message: ${fields.entries.map((e) => '${e.key}: ${e.value}').join(', ')}';

  @override
  String toString() => 'ApiException($status $code): $fullMessage';
}
