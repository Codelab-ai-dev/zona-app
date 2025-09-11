import 'package:supabase_flutter/supabase_flutter.dart';

class SupabaseConfig {
  static const String supabaseUrl = 'https://api.zona-gol.com';
  static const String supabaseAnonKey = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc1NjI2MDQyMCwiZXhwIjo0OTExOTM0MDIwLCJyb2xlIjoiYW5vbiJ9.nEhMCVJKRGBFFNTsg-pJuEj4nzC_06DB0RO41wLR1fw';

  static late SupabaseClient client;

  static Future<void> initialize() async {
    await Supabase.initialize(
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
    );
    client = Supabase.instance.client;
  }
}