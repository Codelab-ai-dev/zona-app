/// Lenient readers for API JSON (snake_case keys; money comes as strings,
/// dates as `YYYY-MM-DD` or RFC 3339).
extension JsonRead on Map<String, dynamic> {
  String str(String key, [String fallback = '']) => strOrNull(key) ?? fallback;

  String? strOrNull(String key) {
    final v = this[key];
    return v == null ? null : '$v';
  }

  int integer(String key, [int fallback = 0]) => intOrNull(key) ?? fallback;

  int? intOrNull(String key) {
    final v = this[key];
    if (v is int) return v;
    if (v is num) return v.toInt();
    if (v is String) return int.tryParse(v) ?? double.tryParse(v)?.toInt();
    return null;
  }

  double number(String key, [double fallback = 0]) => doubleOrNull(key) ?? fallback;

  double? doubleOrNull(String key) {
    final v = this[key];
    if (v is num) return v.toDouble();
    if (v is String) return double.tryParse(v);
    return null;
  }

  bool boolean(String key, [bool fallback = false]) {
    final v = this[key];
    return v is bool ? v : fallback;
  }

  /// Dates and timestamps. A bare `YYYY-MM-DD` is a local calendar date.
  DateTime? dateOrNull(String key) {
    final v = this[key];
    if (v is! String || v.isEmpty) return null;
    if (v.length == 10) {
      final p = v.split('-');
      if (p.length == 3) return DateTime(int.parse(p[0]), int.parse(p[1]), int.parse(p[2]));
    }
    return DateTime.tryParse(v)?.toLocal();
  }

  Map<String, dynamic>? objOrNull(String key) {
    final v = this[key];
    return v is Map ? v.cast<String, dynamic>() : null;
  }

  List<Map<String, dynamic>> objList(String key) {
    final v = this[key];
    if (v is! List) return const [];
    return v.whereType<Map>().map((e) => e.cast<String, dynamic>()).toList();
  }
}

/// `YYYY-MM-DD` for date columns.
String apiDate(DateTime d) =>
    '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

/// Money as the decimal string the API expects.
String apiMoney(double v) => v.toStringAsFixed(2);
