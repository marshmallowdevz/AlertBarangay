# Alert Barangay

This repository contains two separate sites connected to the same Supabase project:

- **Officials’ desktop dashboard** is the root Vite app. Its entrypoint is `src/main.jsx` and it loads `AuthApp`.
- **Residents’ mobile/web app** is the independent Vite and Capacitor project in `resident-app/`. Its entrypoint is `resident-app/src/main.jsx` and it loads the resident reporting UI and incident map.

The sites keep separate entrypoints and access flows. Supabase Row Level Security and the officials app’s role checks control access to their shared data. Database migrations and Edge Functions live once at the repository root under `supabase/` because they affect the shared project.

## Run the officials’ dashboard

1. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
2. From the repository root, run `npm install` and `npm run dev`.
3. The officials site requires sign-in by default. Official accounts need the trusted `app_metadata` claim `{"barangay_role":"official"}`. Keep `VITE_REQUIRE_AUTH=true` in production deployments; set it to `false` only for a local demo.

## Run the residents’ app

From the repository root, run:

```sh
npm --prefix resident-app install
npm --prefix resident-app run dev
```

The resident Vite config reads the root `.env.local` during local development. Its deployment should be configured with the same Supabase URL and publishable key as the officials’ dashboard. Build it with `npm --prefix resident-app run build`.

For Android, use the project inside `resident-app/`: build the resident app, then run `npx cap sync android` from `resident-app/` before opening the Android project.

## Shared Supabase setup

The incidents table, incident dispatches, notifications and resident read receipts, private `incident-media` and `community-media` buckets, Realtime setup, cleanup function, and migration files are shared by both sites. The officials dashboard reads and dispatches resident incidents; residents receive status updates. Review all pending migrations in the shared project before applying them; a database migration changes the data service used by both sites.

The cleanup function is configured at `supabase/functions/cleanup-resolved-incident-media`. Its scheduled job runs at 03:00 Singapore time. Set `INCIDENT_CLEANUP_SECRET` as a Supabase Edge Function secret and store the matching value in Vault as `incident_cleanup_secret`; store the publishable key in Vault as `incident_cleanup_publishable_key`. Keep all secret values out of frontend files and source control.

The resident map loads Leaflet and marker clustering from unpkg and uses OpenStreetMap tiles, so map assets and tiles need an internet connection.
