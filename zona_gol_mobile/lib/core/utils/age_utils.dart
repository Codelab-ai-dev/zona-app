import '../../domain/entities/tournament_entity.dart';

/// Result of validating a player's age against tournament rules
class AgeValidationResult {
  final bool isValid;
  final int age;
  final bool meetsRegularRequirements;
  final bool isException;
  final String? reason;

  const AgeValidationResult({
    required this.isValid,
    required this.age,
    required this.meetsRegularRequirements,
    required this.isException,
    this.reason,
  });
}

/// Utilities for age validation in tournaments
class AgeUtils {
  /// Calculate age at a given reference date
  static int calculateAge(DateTime birthDate, {DateTime? referenceDate}) {
    final ref = referenceDate ?? DateTime.now();
    int age = ref.year - birthDate.year;
    final monthDiff = ref.month - birthDate.month;

    if (monthDiff < 0 || (monthDiff == 0 && ref.day < birthDate.day)) {
      age--;
    }

    return age;
  }

  /// Validate if a player meets the age requirements for a tournament
  static AgeValidationResult validatePlayerAge(
    DateTime? birthDate,
    TournamentEntity tournament, {
    int usedExceptions = 0,
  }) {
    // No birth date provided
    if (birthDate == null) {
      return const AgeValidationResult(
        isValid: true,
        age: 0,
        meetsRegularRequirements: true,
        isException: false,
      );
    }

    // If age validation is not enabled, always valid
    if (!tournament.ageValidationEnabled) {
      final age = calculateAge(birthDate, referenceDate: tournament.ageReferenceDate);
      return AgeValidationResult(
        isValid: true,
        age: age,
        meetsRegularRequirements: true,
        isException: false,
      );
    }

    final age = calculateAge(birthDate, referenceDate: tournament.ageReferenceDate);

    // Check regular age requirements
    final meetsMinAge = tournament.minAge == null || age >= tournament.minAge!;
    final meetsMaxAge = tournament.maxAge == null || age <= tournament.maxAge!;
    final meetsRegular = meetsMinAge && meetsMaxAge;

    if (meetsRegular) {
      return AgeValidationResult(
        isValid: true,
        age: age,
        meetsRegularRequirements: true,
        isException: false,
      );
    }

    // Check if qualifies as an exception
    final availableExceptions = tournament.ageExceptionCount - usedExceptions;
    if (availableExceptions <= 0) {
      return AgeValidationResult(
        isValid: false,
        age: age,
        meetsRegularRequirements: false,
        isException: false,
        reason: 'No hay excepciones disponibles. El jugador tiene $age años.',
      );
    }

    final meetsExceptionMin = tournament.ageExceptionMinAge == null ||
        age >= tournament.ageExceptionMinAge!;
    final meetsExceptionMax = tournament.ageExceptionMaxAge == null ||
        age <= tournament.ageExceptionMaxAge!;
    final qualifiesAsException = meetsExceptionMin && meetsExceptionMax;

    if (qualifiesAsException) {
      return AgeValidationResult(
        isValid: true,
        age: age,
        meetsRegularRequirements: false,
        isException: true,
        reason:
            'Jugador de $age años registrado como excepción (${availableExceptions - 1} excepciones restantes).',
      );
    }

    // Doesn't meet any requirements
    String reason = 'El jugador tiene $age años.';
    if (tournament.minAge != null && age < tournament.minAge!) {
      reason += ' Se requiere mínimo ${tournament.minAge} años.';
    }
    if (tournament.maxAge != null && age > tournament.maxAge!) {
      reason += ' Se permite máximo ${tournament.maxAge} años.';
    }
    if (tournament.ageExceptionMinAge != null || tournament.ageExceptionMaxAge != null) {
      reason += ' Excepciones permitidas: ';
      if (tournament.ageExceptionMinAge != null) {
        reason += 'mínimo ${tournament.ageExceptionMinAge} años';
      }
      if (tournament.ageExceptionMaxAge != null) {
        reason += tournament.ageExceptionMinAge != null
            ? ', máximo ${tournament.ageExceptionMaxAge} años'
            : 'máximo ${tournament.ageExceptionMaxAge} años';
      }
      reason += '.';
    }

    return AgeValidationResult(
      isValid: false,
      age: age,
      meetsRegularRequirements: false,
      isException: false,
      reason: reason,
    );
  }

  /// Get a human-readable description of age rules
  static String describeAgeRules(TournamentEntity tournament) {
    if (!tournament.ageValidationEnabled) {
      return 'Sin restricción de edad';
    }

    final parts = <String>[];

    if (tournament.minAge != null && tournament.maxAge != null) {
      parts.add('Edad: ${tournament.minAge}-${tournament.maxAge} años');
    } else if (tournament.minAge != null) {
      parts.add('Mayores de ${tournament.minAge} años');
    } else if (tournament.maxAge != null) {
      parts.add('Menores de ${tournament.maxAge} años');
    }

    if (tournament.ageExceptionCount > 0) {
      String exceptionDesc =
          '${tournament.ageExceptionCount} excepcion${tournament.ageExceptionCount > 1 ? 'es' : ''}';
      if (tournament.ageExceptionMinAge != null) {
        exceptionDesc += ' (mín. ${tournament.ageExceptionMinAge} años)';
      }
      parts.add(exceptionDesc);
    }

    if (tournament.ageReferenceDate != null) {
      final ref = tournament.ageReferenceDate!;
      parts.add(
          'Ref: ${ref.day.toString().padLeft(2, '0')}/${ref.month.toString().padLeft(2, '0')}/${ref.year}');
    }

    return parts.join(' | ');
  }

  /// Format age for display
  static String formatAge(int age) {
    return '$age año${age != 1 ? 's' : ''}';
  }
}
