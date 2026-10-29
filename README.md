# AlertBarangay

Resident portal landing page with Supabase email and password authentication.

## Local setup

1. Copy `.env.example` to `.env.local` and set the Supabase project URL and publishable key.
2. Run `npm install` and `npm run dev`.

## Dashboard assignment

New sign-ups are resident accounts. Existing accounts are routed from trusted Supabase `app_metadata`: use `role: "resident"` or `role: "official"`. The official dashboard also accepts `barangay_official`, `admin`, and `administrator`. An explicit internal `dashboard_path` can be set when a dashboard needs a custom route.

The default destination paths are `/resident` and `/official`. Set `VITE_RESIDENT_DASHBOARD_PATH` and `VITE_OFFICIAL_DASHBOARD_PATH` in `.env.local` to match the dashboard branches before merging. Accounts without an assignment stay on the portal and see a message instead of being sent to an unrelated dashboard.
