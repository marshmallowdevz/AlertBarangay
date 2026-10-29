import 'dart:io';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/backend.dart';
import '../../core/theme.dart';

class CreateReportScreen extends StatefulWidget {
  const CreateReportScreen(
      {super.key, required this.user, required this.onSubmitted});
  final User user;
  final VoidCallback onSubmitted;
  @override
  State<CreateReportScreen> createState() => _CreateReportScreenState();
}

class _CreateReportScreenState extends State<CreateReportScreen> {
  final _form = GlobalKey<FormState>();
  final _location = TextEditingController();
  final _description = TextEditingController();
  final _picker = ImagePicker();
  String _type = 'Medical', _severity = 'Medium';
  XFile? _media;
  bool _saving = false, _locating = false;
  String? _error, _notice;
  static const _types = [
    'Medical',
    'Fire',
    'Rescue',
    'Flooding',
    'Power',
    'Other'
  ];

  Future<void> _chooseMedia() async {
    final choice = await showModalBottomSheet<String>(
        context: context,
        builder: (context) => SafeArea(
                child: Wrap(children: [
              ListTile(
                  leading: const Icon(Icons.photo_camera),
                  title: const Text('Take photo'),
                  onTap: () => Navigator.pop(context, 'cameraPhoto')),
              ListTile(
                  leading: const Icon(Icons.videocam),
                  title: const Text('Record video'),
                  onTap: () => Navigator.pop(context, 'cameraVideo')),
              ListTile(
                  leading: const Icon(Icons.photo_library),
                  title: const Text('Choose photo'),
                  onTap: () => Navigator.pop(context, 'galleryPhoto')),
              ListTile(
                  leading: const Icon(Icons.video_library),
                  title: const Text('Choose video'),
                  onTap: () => Navigator.pop(context, 'galleryVideo')),
            ])));
    if (choice == null) {
      return;
    }
    try {
      XFile? file;
      if (choice.endsWith('Photo'))
        file = await _picker.pickImage(
            source: choice.startsWith('camera')
                ? ImageSource.camera
                : ImageSource.gallery,
            imageQuality: 85);
      else
        file = await _picker.pickVideo(
            source: choice.startsWith('camera')
                ? ImageSource.camera
                : ImageSource.gallery,
            maxDuration: const Duration(minutes: 2));
      if (mounted && file != null) {
        setState(() => _media = file);
      }
    } catch (e) {
      if (mounted) setState(() => _error = 'Unable to select media: $e');
    }
  }

  Future<void> _detectLocation() async {
    setState(() {
      _locating = true;
      _error = null;
    });
    try {
      if (!await Geolocator.isLocationServiceEnabled())
        throw Exception(
            'Enable device location, or enter a location manually.');
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied)
        permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever)
        throw Exception(
            'Location permission unavailable. Enter a location manually.');
      final p = await Geolocator.getCurrentPosition(
          locationSettings:
              const LocationSettings(accuracy: LocationAccuracy.high));
      _location.text =
          '${p.latitude.toStringAsFixed(5)}, ${p.longitude.toStringAsFixed(5)}';
      setState(() => _notice =
          'Coordinates added. Edit to enter a recognizable address or landmark.');
    } catch (e) {
      setState(() => _error = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _locating = false);
    }
  }

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    setState(() {
      _saving = true;
      _error = null;
      _notice = null;
    });
    try {
      await AlertBarangayBackend.instance.submitReport(
          type: _type,
          severity: _severity,
          location: _location.text.trim(),
          description: _description.text.trim(),
          author: residentName(widget.user));
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Report submitted to the shared community reports.')));
      widget.onSubmitted();
    } catch (e) {
      if (mounted) setState(() => _error = 'Report could not be submitted: $e');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  void dispose() {
    _location.dispose();
    _description.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
      appBar: AppBar(title: const Text('Create report')),
      body: Form(
          key: _form,
          child: ListView(padding: const EdgeInsets.all(18), children: [
            Card(
                color: AppColors.card,
                child: InkWell(
                    onTap: _chooseMedia,
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                        height: 170,
                        alignment: Alignment.center,
                        child: _media == null
                            ? const Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                    Icon(Icons.add_a_photo_outlined,
                                        size: 36, color: AppColors.maroon),
                                    SizedBox(height: 8),
                                    Text('Add photo or video')
                                  ])
                            : _media!.mimeType?.startsWith('image/') == true
                                ? Image.file(File(_media!.path),
                                    height: 168, fit: BoxFit.cover)
                                : Column(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                        const Icon(Icons.video_file,
                                            size: 40, color: AppColors.maroon),
                                        Text(_media!.name,
                                            overflow: TextOverflow.ellipsis)
                                      ])))),
            const SizedBox(height: 14),
            DropdownButtonFormField<String>(
                initialValue: _type,
                decoration: const InputDecoration(labelText: 'Incident type'),
                items: _types
                    .map((t) => DropdownMenuItem(value: t, child: Text(t)))
                    .toList(),
                onChanged: (v) => setState(() => _type = v ?? _type)),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
                initialValue: _severity,
                decoration: const InputDecoration(labelText: 'Severity'),
                items: const ['Low', 'Medium', 'High']
                    .map((s) => DropdownMenuItem(value: s, child: Text(s)))
                    .toList(),
                onChanged: (v) => setState(() => _severity = v ?? _severity)),
            const SizedBox(height: 12),
            TextFormField(
                controller: _location,
                maxLength: 160,
                decoration: InputDecoration(
                    labelText: 'Location',
                    suffixIcon: IconButton(
                        onPressed: _locating ? null : _detectLocation,
                        icon: _locating
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child:
                                    CircularProgressIndicator(strokeWidth: 2))
                            : const Icon(Icons.my_location))),
                validator: (v) => v == null || v.trim().isEmpty
                    ? 'Enter the incident location'
                    : null),
            const SizedBox(height: 12),
            TextFormField(
                controller: _description,
                minLines: 4,
                maxLines: 6,
                maxLength: 1000,
                decoration: const InputDecoration(labelText: 'Description'),
                validator: (v) => v == null || v.trim().isEmpty
                    ? 'Enter a description'
                    : null),
            if (_media != null)
              const Padding(
                  padding: EdgeInsets.only(bottom: 12),
                  child: Text(
                      'The selected media is previewed on this device; the current reports backend has no media storage field.',
                      style: TextStyle(color: AppColors.muted))),
            if (_notice != null)
              Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Text(_notice!,
                      style: const TextStyle(color: AppColors.muted))),
            if (_error != null)
              Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child:
                      Text(_error!, style: const TextStyle(color: Colors.red))),
            FilledButton.icon(
                onPressed: _saving ? null : _submit,
                icon: const Icon(Icons.send),
                label: Text(_saving ? 'Submitting…' : 'Submit report')),
          ])));
}
