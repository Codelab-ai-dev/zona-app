import 'dart:math';

/// Generates a random password with specified requirements
/// Ported from zona-gol/lib/utils.ts generatePassword()
String generatePassword({int length = 12}) {
  const lowercase = 'abcdefghijkmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const special = '!@#\$%&*';

  final random = Random.secure();

  // Ensure at least one of each category
  final password = <String>[
    lowercase[random.nextInt(lowercase.length)],
    uppercase[random.nextInt(uppercase.length)],
    digits[random.nextInt(digits.length)],
    special[random.nextInt(special.length)],
  ];

  // Fill the rest
  const allChars = '$lowercase$uppercase$digits$special';
  for (var i = password.length; i < length; i++) {
    password.add(allChars[random.nextInt(allChars.length)]);
  }

  // Shuffle
  password.shuffle(random);
  return password.join();
}
