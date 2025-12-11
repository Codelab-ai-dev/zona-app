import 'package:supabase_flutter/supabase_flutter.dart';

class SupabaseConfig {
  static const String supabaseUrl = 'https://srv1190257.hstgr.cloud';
  static const String supabaseAnonKey =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzY1Mzg4OTkyLCJleHAiOjIwODA3NDg5OTJ9.o4ltxPTWM3ij5MrUvpZF86FuQK1qXwTRugmJzO0OoNY';

  static late SupabaseClient client;

  static Future<void> initialize() async {
    await Supabase.initialize(url: supabaseUrl, anonKey: supabaseAnonKey);
    client = Supabase.instance.client;
  }
}
