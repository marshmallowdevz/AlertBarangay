import 'package:flutter_test/flutter_test.dart';
import 'package:alert_barangay_mobile/main.dart';

void main() {
  testWidgets('shows setup message when Supabase values are missing',
      (tester) async {
    await tester.pumpWidget(const AlertBarangayApp());
    expect(find.textContaining('Set SUPABASE_URL'), findsOneWidget);
  });
}
