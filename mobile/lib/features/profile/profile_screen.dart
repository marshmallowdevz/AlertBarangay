import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/backend.dart';
import '../../core/theme.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key, required this.user});
  final User user;
  @override
  Widget build(BuildContext context) => Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: ListView(padding: const EdgeInsets.all(20), children: [
        const SizedBox(height: 18),
        const CircleAvatar(
            radius: 42,
            backgroundColor: AppColors.goldSoft,
            child: Icon(Icons.person, size: 44, color: AppColors.maroon)),
        const SizedBox(height: 14),
        Text(residentName(user),
            textAlign: TextAlign.center,
            style: const TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: AppColors.maroon)),
        const SizedBox(height: 4),
        Text(user.email ?? '',
            textAlign: TextAlign.center,
            style: const TextStyle(color: AppColors.muted)),
        const SizedBox(height: 22),
        Card(
            color: AppColors.card,
            child: ListTile(
                leading: const Icon(Icons.verified_user_outlined,
                    color: AppColors.maroon),
                title: const Text('Resident account'),
                subtitle: Text(
                    'Signed in with Supabase Auth · ${user.id.substring(0, 8)}'))),
        const SizedBox(height: 12),
        OutlinedButton.icon(
            onPressed: () async {
              try {
                await Supabase.instance.client.auth.signOut();
              } catch (e) {
                if (context.mounted)
                  ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('Sign out failed: $e')));
              }
            },
            icon: const Icon(Icons.logout),
            label: const Text('Log out')),
      ]));
}
