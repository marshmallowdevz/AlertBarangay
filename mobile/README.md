# AlertBarangay Mobile

Resident Flutter app using the same Supabase project, database, and schema as the desktop app. The mobile launcher reads the desktop app’s ignored root `.env.local` directly; it does not duplicate the values in mobile source.

## Configuration

The repo root `.env.local` must contain the same client-safe values used by the desktop:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

Use a Supabase publishable/anon key only. Never use a service-role key. This checkout currently has no `.env.local`, so live Supabase features remain disconnected until you configure that file locally. The launcher reads it without printing the values.

## Setup and run

From this folder in PowerShell:

```powershell
flutter pub get
powershell -ExecutionPolicy Bypass -File .\with-supabase.ps1 run
```

The script passes the desktop URL and publishable key as Flutter compile-time defines. It refuses to run if the root config is absent or incomplete.

## Analyze and APK builds

```powershell
flutter analyze
powershell -ExecutionPolicy Bypass -File .\with-supabase.ps1 debug-apk
powershell -ExecutionPolicy Bypass -File .\with-supabase.ps1 release-apk
```

Debug APK: `build\app\outputs\flutter-apk\app-debug.apk`. Configure Android release signing before distributing a release APK.

## Shared data and known backend gaps

The app initializes Supabase with the same project URL/key as desktop and uses the existing `reports` and `announcements` tables. Report submissions write the desktop’s existing fields, so they appear in the shared dashboard. Sign-in/register use Supabase Auth.

- Desktop has no resident sign-in/register UI. Account creation and email confirmation must be enabled in the shared Supabase project.
- Reports have no resident user ID, media storage/URL, likes, comments, or report flags. “My Reports” matches the existing `author` string; picked media remains a local preview.
- The `reports` table is not enabled in Supabase Realtime, so My Reports refreshes every 15 seconds and on pull-to-refresh.
- Reports contain no video URLs, so the feed cannot autoplay videos.
