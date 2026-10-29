import 'package:supabase_flutter/supabase_flutter.dart';

class AlertBarangayBackend {
  AlertBarangayBackend._();
  static final instance = AlertBarangayBackend._();

  SupabaseClient get client => Supabase.instance.client;

  Future<List<Map<String, dynamic>>> reports(
      {int from = 0, int to = 39}) async {
    final rows = await client
        .from('reports')
        .select(
            'id, report_code, type, severity, status, location, description, author, created_at')
        .order('created_at', ascending: false)
        .range(from, to);
    return List<Map<String, dynamic>>.from(rows);
  }

  Future<List<Map<String, dynamic>>> announcements() async {
    final rows = await client
        .from('announcements')
        .select('id, title, body, author, created_at')
        .order('created_at', ascending: false);
    return List<Map<String, dynamic>>.from(rows);
  }

  Future<Map<String, dynamic>> submitReport(
      {required String type,
      required String severity,
      required String location,
      required String description,
      required String author}) async {
    final row = await client
        .from('reports')
        .insert({
          'type': type,
          'severity': severity,
          'location': location,
          'description': description,
          'author': author
        })
        .select(
            'id, report_code, type, severity, status, location, description, author, created_at')
        .single();
    return Map<String, dynamic>.from(row);
  }

  Stream<List<Map<String, dynamic>>> reportsByAuthor(String author) => client
      .from('reports')
      .stream(primaryKey: ['id'])
      .eq('author', author)
      .order('created_at', ascending: false);
}

String residentName(User user) {
  final metadataName = user.userMetadata?['full_name'];
  if (metadataName is String && metadataName.trim().isNotEmpty)
    return metadataName.trim();
  final email = user.email ?? 'Resident';
  return email.length > 80 ? email.substring(0, 80) : email;
}
