import 'dart:async';
import 'package:flutter/material.dart';
import '../../core/backend.dart';
import '../../core/theme.dart';

class MyReportsScreen extends StatefulWidget {
  const MyReportsScreen({super.key, required this.author});
  final String author;
  @override
  State<MyReportsScreen> createState() => _MyReportsScreenState();
}

class _MyReportsScreenState extends State<MyReportsScreen> {
  Timer? _timer;
  List<Map<String, dynamic>> _rows = [];
  Object? _error;
  bool _loading = true;
  @override
  void initState() {
    super.initState();
    _refresh();
    _timer = Timer.periodic(const Duration(seconds: 15), (_) => _refresh());
  }

  Future<void> _refresh() async {
    try {
      final all = await AlertBarangayBackend.instance.reports(from: 0, to: 99);
      final mine = all.where((row) => row['author'] == widget.author).toList();
      if (mounted)
        setState(() {
          _rows = mine;
          _error = null;
          _loading = false;
        });
    } catch (e) {
      if (mounted)
        setState(() {
          _error = e;
          _loading = false;
        });
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
      appBar: AppBar(title: const Text('My Reports')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Text('Reports unavailable: $_error')))
              : _rows.isEmpty
                  ? const Center(
                      child: Text('You have not submitted any reports yet.'))
                  : RefreshIndicator(
                      onRefresh: _refresh,
                      child: ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: _rows.length,
                          separatorBuilder: (_, __) =>
                              const SizedBox(height: 10),
                          itemBuilder: (context, i) {
                            final r = _rows[i];
                            return Card(
                                color: AppColors.card,
                                child: Padding(
                                    padding: const EdgeInsets.all(16),
                                    child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Row(children: [
                                            Expanded(
                                                child: Text(
                                                    '${r['type']} · ${r['report_code'] ?? ''}',
                                                    style: const TextStyle(
                                                        color: AppColors.maroon,
                                                        fontWeight:
                                                            FontWeight.bold,
                                                        fontSize: 16))),
                                            Container(
                                                padding:
                                                    const EdgeInsets.symmetric(
                                                        horizontal: 10,
                                                        vertical: 5),
                                                decoration: BoxDecoration(
                                                    color: AppColors.goldSoft,
                                                    borderRadius:
                                                        BorderRadius.circular(
                                                            20)),
                                                child: Text(
                                                    r['status'] ?? 'Pending',
                                                    style: const TextStyle(
                                                        color: AppColors.maroon,
                                                        fontWeight:
                                                            FontWeight.bold,
                                                        fontSize: 12)))
                                          ]),
                                          const SizedBox(height: 8),
                                          Text('📍 ${r['location'] ?? ''}'),
                                          const SizedBox(height: 6),
                                          Text(r['description'] ?? '',
                                              maxLines: 3,
                                              overflow: TextOverflow.ellipsis,
                                              style: const TextStyle(
                                                  color: AppColors.muted)),
                                        ])));
                          })));
}
