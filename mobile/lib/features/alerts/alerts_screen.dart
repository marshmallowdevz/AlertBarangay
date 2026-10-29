import 'package:flutter/material.dart';
import '../../core/backend.dart';
import '../../core/theme.dart';

class AlertsScreen extends StatefulWidget {
  const AlertsScreen({super.key, required this.author});
  final String author;
  @override
  State<AlertsScreen> createState() => _AlertsScreenState();
}

class _AlertsScreenState extends State<AlertsScreen> {
  late Future<List<Map<String, dynamic>>> _future;
  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<List<Map<String, dynamic>>> _load() async {
    final announcements = await AlertBarangayBackend.instance.announcements();
    final reports =
        await AlertBarangayBackend.instance.reports(from: 0, to: 99);
    final updates = reports
        .where((r) => r['author'] == widget.author)
        .map((r) => {...r, '_kind': 'status'})
        .toList();
    final items = <Map<String, dynamic>>[
      ...announcements.map((a) => {...a, '_kind': 'announcement'}),
      ...updates
    ];
    items.sort((a, b) => DateTime.parse(b['created_at'])
        .compareTo(DateTime.parse(a['created_at'])));
    return items;
  }

  Future<void> _refresh() async {
    setState(() => _future = _load());
    await _future;
  }

  @override
  Widget build(BuildContext context) => Scaffold(
      appBar: AppBar(title: const Text('Alerts'), actions: [
        IconButton(
            onPressed: _refresh,
            tooltip: 'Refresh',
            icon: const Icon(Icons.refresh))
      ]),
      body: FutureBuilder<List<Map<String, dynamic>>>(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.hasError)
              return Center(
                  child: Text('Alerts unavailable: ${snapshot.error}'));
            if (!snapshot.hasData)
              return const Center(child: CircularProgressIndicator());
            final items = snapshot.data!;
            if (items.isEmpty)
              return const Center(
                  child: Text('No announcements or status updates yet.'));
            return RefreshIndicator(
                onRefresh: _refresh,
                child: ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: items.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (context, i) {
                      final item = items[i];
                      final isStatus = item['_kind'] == 'status';
                      final title = isStatus
                          ? '${item['type']} · ${item['report_code'] ?? ''}'
                          : item['title'];
                      final body = isStatus
                          ? 'Your report status is ${item['status']}. ${item['description']}'
                          : item['body'];
                      return Card(
                          color: AppColors.card,
                          child: ListTile(
                              leading: CircleAvatar(
                                  backgroundColor: AppColors.goldSoft,
                                  child: Icon(
                                      isStatus
                                          ? Icons.assignment_outlined
                                          : Icons.campaign,
                                      color: AppColors.maroon)),
                              title: Text(title ?? '',
                                  style: const TextStyle(
                                      color: AppColors.maroon,
                                      fontWeight: FontWeight.bold)),
                              subtitle: Padding(
                                  padding: const EdgeInsets.only(top: 8),
                                  child: Text(
                                      '$body\n\n${isStatus ? 'Report update' : 'Posted by ${item['author'] ?? 'Official'}'}')),
                              isThreeLine: true));
                    }));
          }));
}
