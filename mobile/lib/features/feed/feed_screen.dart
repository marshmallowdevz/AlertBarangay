import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';
import '../../core/backend.dart';
import '../../core/theme.dart';

class FeedScreen extends StatefulWidget {
  const FeedScreen({super.key, required this.onCreate});
  final VoidCallback onCreate;
  @override
  State<FeedScreen> createState() => _FeedScreenState();
}

class _FeedScreenState extends State<FeedScreen> {
  final _pager = PageController();
  final List<Map<String, dynamic>> _items = [];
  int _page = 0;
  bool _loading = true, _more = true;
  String? _error;
  final Set<String> _liked = {};

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final reports = await AlertBarangayBackend.instance
          .reports(from: _page * 40, to: _page * 40 + 39);
      final announcements = _page == 0
          ? await AlertBarangayBackend.instance.announcements()
          : <Map<String, dynamic>>[];
      final combined = <Map<String, dynamic>>[
        ...reports.map((r) => {...r, '_kind': 'report'}),
        ...announcements.map((a) => {...a, '_kind': 'announcement'}),
      ]..sort((a, b) => DateTime.parse(b['created_at'])
          .compareTo(DateTime.parse(a['created_at'])));
      if (!mounted) return;
      setState(() {
        _items.addAll(combined);
        _more = reports.length == 40;
        _page++;
        _loading = false;
        _error = null;
      });
    } catch (e) {
      if (mounted)
        setState(() {
          _loading = false;
          _error = e.toString();
        });
    }
  }

  @override
  void dispose() {
    _pager.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_loading && _items.isEmpty)
      return const Center(child: CircularProgressIndicator());
    if (_error != null && _items.isEmpty)
      return Center(
          child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                Text('Feed unavailable: $_error'),
                const SizedBox(height: 12),
                FilledButton(
                    onPressed: () {
                      setState(() => _loading = true);
                      _load();
                    },
                    child: const Text('Retry'))
              ])));
    if (_items.isEmpty)
      return Center(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
        const Text('No reports or announcements yet.'),
        TextButton(
            onPressed: widget.onCreate, child: const Text('Create a report'))
      ]));
    return PageView.builder(
        controller: _pager,
        scrollDirection: Axis.vertical,
        itemCount: _items.length + (_more ? 1 : 0),
        onPageChanged: (index) {
          if (_more && index >= _items.length - 3 && !_loading) {
            setState(() => _loading = true);
            _load();
          }
        },
        itemBuilder: (context, index) {
          if (index >= _items.length)
            return const Center(child: CircularProgressIndicator());
          return _feedItem(_items[index]);
        });
  }

  Widget _feedItem(Map<String, dynamic> item) {
    final isAnnouncement = item['_kind'] == 'announcement';
    final id = (item['report_code'] ?? item['id']).toString();
    final date = DateTime.tryParse(item['created_at'] ?? '')?.toLocal();
    final age =
        date == null ? '' : '${DateTime.now().difference(date).inHours}h ago';
    return Stack(fit: StackFit.expand, children: [
      Container(
          decoration: const BoxDecoration(
              gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
            AppColors.maroonDark,
            Color(0xFF35101D),
            AppColors.maroon
          ]))),
      Positioned(
          left: 24,
          right: 82,
          top: 40,
          child: Row(children: [
            const Icon(Icons.shield, color: AppColors.gold),
            const SizedBox(width: 8),
            Text(isAnnouncement ? 'OFFICIAL ANNOUNCEMENT' : 'COMMUNITY REPORT',
                style: const TextStyle(
                    color: AppColors.gold,
                    letterSpacing: 1.1,
                    fontWeight: FontWeight.bold))
          ])),
      Positioned(
          left: 24,
          right: 78,
          bottom: 28,
          child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                if (!isAnnouncement) _pill(item['status'] ?? 'Pending'),
                const SizedBox(height: 14),
                Text(
                    isAnnouncement
                        ? (item['title'] ?? '')
                        : (item['type'] ?? 'Incident'),
                    style: const TextStyle(
                        color: Colors.white,
                        fontSize: 28,
                        fontWeight: FontWeight.bold)),
                const SizedBox(height: 10),
                Text(item['description'] ?? item['body'] ?? '',
                    maxLines: 6,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                        color: Colors.white, height: 1.4, fontSize: 16)),
                const SizedBox(height: 16),
                if (!isAnnouncement)
                  Text('📍 ${item['location'] ?? ''}',
                      style: const TextStyle(color: Colors.white)),
                const SizedBox(height: 8),
                Text('${item['author'] ?? 'AlertBarangay'}  ·  $age',
                    style: const TextStyle(color: Colors.white70)),
              ])),
      Positioned(
          right: 14,
          bottom: 90,
          child: Column(children: [
            _action(
                Icons.favorite,
                _liked.contains(id) ? Colors.redAccent : Colors.white,
                () => setState(() =>
                    _liked.contains(id) ? _liked.remove(id) : _liked.add(id)),
                'Like'),
            _action(
                Icons.mode_comment_outlined,
                Colors.white,
                () => _message(
                    'Comments are not available in the current backend.'),
                'Comment'),
            _action(
                Icons.share_outlined,
                Colors.white,
                () => Share.share(
                    'AlertBarangay ${isAnnouncement ? 'announcement' : 'report'}: $id'),
                'Share'),
            _action(
                Icons.flag_outlined,
                Colors.white,
                () => _message(
                    'Report flagging is not available in the current backend.'),
                'Report'),
          ])),
      Positioned(
          top: 12,
          right: 10,
          child: IconButton(
              onPressed: () {},
              icon: const Icon(Icons.volume_off, color: Colors.white))),
    ]);
  }

  Widget _pill(String status) => Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
          color: AppColors.goldSoft, borderRadius: BorderRadius.circular(30)),
      child: Text(status,
          style: const TextStyle(
              color: AppColors.maroon, fontWeight: FontWeight.bold)));
  Widget _action(
          IconData icon, Color color, VoidCallback action, String label) =>
      Padding(
          padding: const EdgeInsets.only(bottom: 18),
          child: Column(children: [
            IconButton(
                onPressed: action, icon: Icon(icon, color: color, size: 28)),
            Text(label,
                style: const TextStyle(color: Colors.white, fontSize: 11))
          ]));
  void _message(String text) =>
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));
}
