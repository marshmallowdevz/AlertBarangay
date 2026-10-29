import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'core/theme.dart';
import 'features/auth/login_screen.dart';
import 'features/shell/resident_shell.dart';

const _url = String.fromEnvironment('SUPABASE_URL');
const _key = String.fromEnvironment('SUPABASE_PUBLISHABLE_KEY');

bool get _hasBackendConfig {
  final uri = Uri.tryParse(_url);
  final key = _key.toLowerCase();
  return uri != null &&
      (uri.scheme == 'https' || uri.scheme == 'http') &&
      uri.host.isNotEmpty &&
      uri.host != 'example.supabase.co' &&
      !key.contains('placeholder') &&
      !key.contains('your_publishable_key') &&
      _key.isNotEmpty;
}

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  if (_hasBackendConfig) {
    await Supabase.initialize(url: _url, publishableKey: _key);
  }
  runApp(const AlertBarangayApp());
}

class AlertBarangayApp extends StatelessWidget {
  const AlertBarangayApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
        title: 'AlertBarangay',
        debugShowCheckedModeBanner: false,
        theme: buildTheme(),
        home: !_hasBackendConfig
            ? const _ConfigurationScreen()
            : const _SessionGate(),
      );
}

class _SessionGate extends StatelessWidget {
  const _SessionGate();
  @override
  Widget build(BuildContext context) => StreamBuilder<AuthState>(
        stream: Supabase.instance.client.auth.onAuthStateChange,
        builder: (context, snapshot) {
          final session = Supabase.instance.client.auth.currentSession;
          return session == null
              ? const LoginScreen()
              : ResidentShell(user: session.user);
        },
      );
}

class _ConfigurationScreen extends StatelessWidget {
  const _ConfigurationScreen();
  @override
  Widget build(BuildContext context) => Scaffold(
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(28),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Card(
                color: AppColors.card,
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: const [
                      Icon(Icons.shield_outlined,
                          size: 52, color: AppColors.maroon),
                      SizedBox(height: 16),
                      Text('Connect AlertBarangay',
                          style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              color: AppColors.maroon)),
                      SizedBox(height: 10),
                      Text(
                        'Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY to the same values used by the desktop app. Do not use example URLs or placeholder keys.',
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      );
}
