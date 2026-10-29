import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/theme.dart';
import 'package:flutter_svg/flutter_svg.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _form = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _name = TextEditingController();
  bool _register = false, _busy = false;
  String? _error, _notice;

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
      _notice = null;
    });
    try {
      final auth = Supabase.instance.client.auth;
      if (_register) {
        final result = await auth.signUp(
            email: _email.text.trim(),
            password: _password.text,
            data: {'full_name': _name.text.trim()});
        if (result.session == null && mounted)
          setState(() => _notice =
              'Check your email to confirm your account, then sign in.');
      } else {
        await auth.signInWithPassword(
            email: _email.text.trim(), password: _password.text);
      }
    } on AuthException catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) {
        setState(() => _error =
            'Could not connect to AlertBarangay. Check the Supabase project URL, publishable key, and connection.');
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    _name.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
      body: SafeArea(
          child: Center(
              child: SingleChildScrollView(
                  padding: const EdgeInsets.all(24),
                  child: ConstrainedBox(
                      constraints: const BoxConstraints(maxWidth: 440),
                      child: Card(
                          color: AppColors.card,
                          child: Padding(
                              padding: const EdgeInsets.all(24),
                              child: Form(
                                  key: _form,
                                  child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.stretch,
                                      children: [
                                        Center(
                                            child: SvgPicture.asset(
                                                'assets/alert-barangay-logo.svg',
                                                width: 84,
                                                height: 84,
                                                placeholderBuilder: (_) =>
                                                    const Icon(Icons.shield,
                                                        size: 72,
                                                        color:
                                                            AppColors.maroon))),
                                        const SizedBox(height: 14),
                                        const Text('AlertBarangay',
                                            textAlign: TextAlign.center,
                                            style: TextStyle(
                                                fontSize: 24,
                                                fontWeight: FontWeight.bold,
                                                color: AppColors.maroon)),
                                        const SizedBox(height: 6),
                                        Text(
                                            _register
                                                ? 'Create your resident account'
                                                : 'Sign in to your resident account',
                                            textAlign: TextAlign.center,
                                            style: const TextStyle(
                                                color: AppColors.muted)),
                                        const SizedBox(height: 22),
                                        if (_register) ...[
                                          TextFormField(
                                              controller: _name,
                                              decoration: const InputDecoration(
                                                  labelText: 'Full name'),
                                              validator: (v) => (v == null ||
                                                      v.trim().isEmpty)
                                                  ? 'Enter your name'
                                                  : null),
                                          const SizedBox(height: 12)
                                        ],
                                        TextFormField(
                                            controller: _email,
                                            keyboardType:
                                                TextInputType.emailAddress,
                                            decoration: const InputDecoration(
                                                labelText: 'Email'),
                                            validator: (v) =>
                                                (v == null || !v.contains('@'))
                                                    ? 'Enter a valid email'
                                                    : null),
                                        const SizedBox(height: 12),
                                        TextFormField(
                                            controller: _password,
                                            obscureText: true,
                                            decoration: const InputDecoration(
                                                labelText: 'Password'),
                                            validator: (v) => (v == null ||
                                                    v.length < 6)
                                                ? 'Use at least 6 characters'
                                                : null),
                                        if (_error != null) ...[
                                          const SizedBox(height: 12),
                                          Text(_error!,
                                              style: const TextStyle(
                                                  color: Colors.red))
                                        ],
                                        if (_notice != null) ...[
                                          const SizedBox(height: 12),
                                          Text(_notice!,
                                              style: const TextStyle(
                                                  color: Colors.green))
                                        ],
                                        const SizedBox(height: 18),
                                        FilledButton(
                                            onPressed: _busy ? null : _submit,
                                            child: Text(_busy
                                                ? 'Please waitâ€¦'
                                                : _register
                                                    ? 'Register'
                                                    : 'Log in')),
                                        TextButton(
                                            onPressed: _busy
                                                ? null
                                                : () => setState(() {
                                                      _register = !_register;
                                                      _error = null;
                                                      _notice = null;
                                                    }),
                                            child: Text(_register
                                                ? 'Already registered? Log in'
                                                : 'Create resident account')),
                                      ])))))))));
}
