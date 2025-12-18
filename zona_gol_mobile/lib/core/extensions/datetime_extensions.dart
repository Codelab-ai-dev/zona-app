import 'package:intl/intl.dart';

extension DateTimeExtensions on DateTime {
  /// Format to string with pattern
  String format(String pattern) {
    return DateFormat(pattern, 'es').format(this);
  }

  /// Format to dd/MM/yyyy
  String get toDateString {
    return format('dd/MM/yyyy');
  }

  /// Format to HH:mm
  String get toTimeString {
    return format('HH:mm');
  }

  /// Format to dd/MM/yyyy HH:mm
  String get toDateTimeString {
    return format('dd/MM/yyyy HH:mm');
  }

  /// Format to dd MMM (e.g., "15 Dic")
  String get toShortDate {
    return format('dd MMM');
  }

  /// Format to EEEE, dd MMMM yyyy (e.g., "Viernes, 15 Diciembre 2023")
  String get toFullDate {
    return format('EEEE, dd MMMM yyyy');
  }

  /// Format to relative time (e.g., "hace 2 horas", "en 3 días")
  String get toRelativeTime {
    final now = DateTime.now();
    final difference = now.difference(this);

    if (difference.isNegative) {
      // Future date
      final futureDiff = this.difference(now);
      if (futureDiff.inDays > 365) {
        final years = (futureDiff.inDays / 365).floor();
        return 'en $years ${years == 1 ? "año" : "años"}';
      } else if (futureDiff.inDays > 30) {
        final months = (futureDiff.inDays / 30).floor();
        return 'en $months ${months == 1 ? "mes" : "meses"}';
      } else if (futureDiff.inDays > 0) {
        return 'en ${futureDiff.inDays} ${futureDiff.inDays == 1 ? "día" : "días"}';
      } else if (futureDiff.inHours > 0) {
        return 'en ${futureDiff.inHours} ${futureDiff.inHours == 1 ? "hora" : "horas"}';
      } else if (futureDiff.inMinutes > 0) {
        return 'en ${futureDiff.inMinutes} ${futureDiff.inMinutes == 1 ? "minuto" : "minutos"}';
      } else {
        return 'en unos segundos';
      }
    }

    // Past date
    if (difference.inDays > 365) {
      final years = (difference.inDays / 365).floor();
      return 'hace $years ${years == 1 ? "año" : "años"}';
    } else if (difference.inDays > 30) {
      final months = (difference.inDays / 30).floor();
      return 'hace $months ${months == 1 ? "mes" : "meses"}';
    } else if (difference.inDays > 0) {
      return 'hace ${difference.inDays} ${difference.inDays == 1 ? "día" : "días"}';
    } else if (difference.inHours > 0) {
      return 'hace ${difference.inHours} ${difference.inHours == 1 ? "hora" : "horas"}';
    } else if (difference.inMinutes > 0) {
      return 'hace ${difference.inMinutes} ${difference.inMinutes == 1 ? "minuto" : "minutos"}';
    } else {
      return 'hace unos segundos';
    }
  }

  /// Check if date is today
  bool get isToday {
    final now = DateTime.now();
    return year == now.year && month == now.month && day == now.day;
  }

  /// Check if date is yesterday
  bool get isYesterday {
    final yesterday = DateTime.now().subtract(const Duration(days: 1));
    return year == yesterday.year && month == yesterday.month && day == yesterday.day;
  }

  /// Check if date is tomorrow
  bool get isTomorrow {
    final tomorrow = DateTime.now().add(const Duration(days: 1));
    return year == tomorrow.year && month == tomorrow.month && day == tomorrow.day;
  }

  /// Check if date is in the past
  bool get isPast {
    return isBefore(DateTime.now());
  }

  /// Check if date is in the future
  bool get isFuture {
    return isAfter(DateTime.now());
  }

  /// Get start of day (00:00:00)
  DateTime get startOfDay {
    return DateTime(year, month, day);
  }

  /// Get end of day (23:59:59)
  DateTime get endOfDay {
    return DateTime(year, month, day, 23, 59, 59, 999);
  }

  /// Check if date is same day as another date
  bool isSameDay(DateTime other) {
    return year == other.year && month == other.month && day == other.day;
  }

  /// Get age from birthdate
  int get age {
    final now = DateTime.now();
    int age = now.year - year;
    if (now.month < month || (now.month == month && now.day < day)) {
      age--;
    }
    return age;
  }

  /// Add business days (skip weekends)
  DateTime addBusinessDays(int days) {
    DateTime result = this;
    int addedDays = 0;

    while (addedDays < days) {
      result = result.add(const Duration(days: 1));
      if (result.weekday != DateTime.saturday && result.weekday != DateTime.sunday) {
        addedDays++;
      }
    }

    return result;
  }

  /// Check if date is weekend
  bool get isWeekend {
    return weekday == DateTime.saturday || weekday == DateTime.sunday;
  }

  /// Get day name in Spanish
  String get dayName {
    const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    return days[weekday - 1];
  }

  /// Get month name in Spanish
  String get monthName {
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return months[month - 1];
  }
}
