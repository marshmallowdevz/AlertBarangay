import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/backend.dart';
import '../../core/theme.dart';
import '../alerts/alerts_screen.dart';
import '../feed/feed_screen.dart';
import '../profile/profile_screen.dart';
import '../reports/create_report_screen.dart';
import '../reports/my_reports_screen.dart';

class ResidentShell extends StatefulWidget {
  const ResidentShell({super.key, required this.user});
  final User user;
  @override
  State<ResidentShell> createState() => _ResidentShellState();
}

class _ResidentShellState extends State<ResidentShell> {
  int _index = 0;
  int _refresh = 0;
  @override
  Widget build(BuildContext context) {
    final name = residentName(widget.user);
    final pages = [
      FeedScreen(
          key: ValueKey('feed$_refresh'),
          onCreate: () => setState(() => _index = 2)),
      AlertsScreen(author: name),
      CreateReportScreen(
          user: widget.user,
          onSubmitted: () {
            setState(() {
              _refresh++;
              _index = 0;
            });
          }),
      MyReportsScreen(author: name, key: ValueKey('reports$name')),
      ProfileScreen(user: widget.user),
    ];
    return Scaffold(
      body: IndexedStack(index: _index, children: pages),
      bottomNavigationBar: NavigationBar(
          selectedIndex: _index,
          onDestinationSelected: (i) => setState(() => _index = i),
          backgroundColor: AppColors.card,
          indicatorColor: AppColors.goldSoft,
          destinations: const [
            NavigationDestination(
                icon: Icon(Icons.home_outlined),
                selectedIcon: Icon(Icons.home),
                label: 'Home'),
            NavigationDestination(
                icon: Icon(Icons.notifications_outlined),
                selectedIcon: Icon(Icons.notifications),
                label: 'Alerts'),
            NavigationDestination(
                icon: Icon(Icons.add_circle_outline, size: 30),
                selectedIcon: Icon(Icons.add_circle, size: 30),
                label: 'Create'),
            NavigationDestination(
                icon: Icon(Icons.assignment_outlined),
                selectedIcon: Icon(Icons.assignment),
                label: 'My Reports'),
            NavigationDestination(
                icon: Icon(Icons.person_outline),
                selectedIcon: Icon(Icons.person),
                label: 'Profile'),
          ]),
    );
  }
}
