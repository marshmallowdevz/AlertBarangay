# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Alert Barangay incident map

### Local setup

1. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_PUBLISHABLE_KEY` to the Supabase publishable key. `.env.local` is ignored by Git.
2. Install dependencies with `npm install`, then start the app with `npm run dev`.
3. The map loads Leaflet 1.9.4 and MarkerCluster 1.5.3 from unpkg and uses OpenStreetMap tiles, so map assets and tiles require an internet connection.

### Supabase setup

The project is linked to `lemnfqjyrhirjnfukfrm`. Apply the incidents table, RLS, media bucket, Realtime publication, and daily cleanup schedule with:

```sh
supabase db push
```

Deploy the storage cleanup function:

```sh
supabase functions deploy cleanup-resolved-incident-media
```

The scheduled job runs at 03:00 Singapore time. It calls the function after the function secret and publishable key have been added to Supabase Vault. Set the same strong random value as the Edge Function secret and Vault secret; keep it out of the frontend and source control:

```sh
supabase secrets set INCIDENT_CLEANUP_SECRET="paste-the-strong-random-value-here"
```

Then run these in the Supabase SQL Editor. Replace the first placeholder with the same random value and the second with the publishable key from `.env.local`:

```sql
select vault.create_secret('<strong-random-value>', 'incident_cleanup_secret');
select vault.create_secret('<publishable-key-from-.env.local>', 'incident_cleanup_publishable_key');
```

The Edge Function uses the server-side service role key from its Supabase runtime environment to remove Storage objects. The scheduled HTTP request is protected by the separate cleanup secret. It clears media paths after deleting media for resolved incidents older than 30 days; the incident rows and EIDs remain.

### Map and report flow

- Open **Reels**, then double-click (desktop) or double-tap (mobile) its bottom navigation item within about 300 ms to open the map. Repeat to return to the Reels feed. Reels also has an **Incident map** button.
- Use the locate button for the map or open **Report Emergency** to request GPS. If location permission is denied, tap the map to place a pin or drag the pin to adjust it.
- Incident photos are compressed in the browser; videos are limited to 15 seconds and 15 MB. New incident media is private to signed-in users.
- To verify the flow, sign in, open the map, submit a report, copy its EID, then confirm its marker and popup appear. Realtime updates require the incidents migration and table in `supabase_realtime`.
