extension StringExtensions on String {
  /// Capitalize first letter
  String capitalize() {
    if (isEmpty) return this;
    return '${this[0].toUpperCase()}${substring(1).toLowerCase()}';
  }

  /// Capitalize each word
  String capitalizeWords() {
    if (isEmpty) return this;
    return split(' ').map((word) => word.capitalize()).join(' ');
  }

  /// Check if string is email
  bool get isEmail {
    final emailRegex = RegExp(
      r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
    );
    return emailRegex.hasMatch(this);
  }

  /// Check if string is valid phone number
  bool get isPhoneNumber {
    final phoneRegex = RegExp(r'^\+?[\d\s\-()]+$');
    return phoneRegex.hasMatch(this) && length >= 10;
  }

  /// Check if string is numeric
  bool get isNumeric {
    return double.tryParse(this) != null;
  }

  /// Truncate string
  String truncate(int maxLength, {String ellipsis = '...'}) {
    if (length <= maxLength) return this;
    return '${substring(0, maxLength)}$ellipsis';
  }

  /// Remove all whitespace
  String removeWhitespace() {
    return replaceAll(RegExp(r'\s+'), '');
  }

  /// Check if string is empty or whitespace
  bool get isBlank {
    return trim().isEmpty;
  }

  /// Check if string is not empty and not whitespace
  bool get isNotBlank {
    return !isBlank;
  }

  /// Convert to snake_case
  String toSnakeCase() {
    return replaceAllMapped(
      RegExp(r'[A-Z]'),
      (match) => '_${match.group(0)!.toLowerCase()}',
    ).replaceFirst(RegExp(r'^_'), '');
  }

  /// Convert to camelCase
  String toCamelCase() {
    return split('_')
        .asMap()
        .map((i, word) => MapEntry(
              i,
              i == 0 ? word.toLowerCase() : word.capitalize(),
            ))
        .values
        .join();
  }

  /// Parse to UUID format (add dashes if missing)
  String toUuid() {
    if (length != 32) return this;
    return '${substring(0, 8)}-${substring(8, 12)}-${substring(12, 16)}-${substring(16, 20)}-${substring(20)}';
  }

  /// Mask email (show only first and last char before @)
  String maskEmail() {
    if (!isEmail) return this;
    final parts = split('@');
    final username = parts[0];
    if (username.length <= 2) return this;
    final masked = '${username[0]}${'*' * (username.length - 2)}${username[username.length - 1]}';
    return '$masked@${parts[1]}';
  }

  /// Mask phone number (show only last 4 digits)
  String maskPhoneNumber() {
    if (length < 4) return this;
    return '${'*' * (length - 4)}${substring(length - 4)}';
  }
}
