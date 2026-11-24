# AlertBarangay Admin User Management

A standalone Next.js App Router module for administrators to create, edit, disable, reset passwords for, and delete AlertBarangay user accounts. Account identity is stored in Supabase Auth; roles and organization fields are stored in `public.profiles`.

## Requirements

- Node.js 20.9 or newer and npm
- A Supabase project with email/password authentication enabled
- An initial administrator account provisioned using the steps below

## Local setup

1. Install packages with `npm install`.
2. Copy `.env.example` to `.env.local` and set the three values:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
   SUPABASE_SECRET_KEY=YOUR_SUPABASE_SECRET_KEY
   ```

   `SUPABASE_SECRET_KEY` is preferred; `SUPABASE_SERVICE_ROLE_KEY` is supported as a fallback. The privileged key is read only by server-only modules and must never use a `NEXT_PUBLIC_` prefix. Do not commit `.env.local`.

3. In the Supabase SQL Editor, run [`supabase/migrations/202611230001_admin_user_management.sql`](supabase/migrations/202611230001_admin_user_management.sql), then [`supabase/migrations/202611250001_profiles_self_read_policy.sql`](supabase/migrations/202611250001_profiles_self_read_policy.sql).
4. Create the first user under **Authentication → Users** in Supabase, or use the Auth Admin API. Then promote that user's UUID in the SQL Editor:

   ```sql
   update public.profiles
   set role = 'admin', is_active = true
   where id = 'PASTE_AUTH_USER_UUID_HERE';
   ```

   The migration creates a `resident` profile when an Auth user is created. The browser cannot assign roles; only the trusted server routes or a database administrator can do that.

5. Start the app with `npm run dev` and open [http://localhost:3000](http://localhost:3000). Sign in at `/login` with the administrator credentials.

## Account behavior

- New accounts are email-confirmed and receive the temporary password entered by the administrator. Communicate it to the user using a secure channel; this dashboard does not email credentials.
- New-account temporary passwords must be at least 8 characters. Admin password resets require matching passwords of at least 12 characters and are audited without storing the password.
- Disabling an account marks its profile inactive and applies a long Auth ban. Re-enabling clears that ban. All connected dashboards must also check `profiles.is_active` and the profile role during authorization.
- Deleting an account removes the Auth user and cascades deletion of the profile. Audit rows intentionally retain actor and target UUIDs without Auth foreign keys.
- This app only exposes user management. Announcements/settings entries in the sidebar are visual placeholders for integration with the official dashboard.

## Security and RLS

All `/api/admin/users` operations independently validate the cookie-backed Supabase session, then require an active `admin` profile before using the service-role client. The admin client is isolated in `src/lib/supabase/admin.ts`, marked `server-only`, and never passed to client components. Client bundles use only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

RLS is enabled on `profiles` and `audit_logs`. Authenticated users can read their own profile and update only their own `full_name`; active administrators can read profiles and audit history. No browser role assignment or audit write policy is granted. The service-role API handlers perform account mutations and audit writes on the server.

The migration is safe to re-run. Review it against existing project policies and schema before applying to a production database. Existing official dashboard code must use the same `profiles` table/role names (or be adapted during merge) and must enforce `is_active` on protected pages and API operations.

## Commands

- `npm run dev` — local development
- `npm run typecheck` — TypeScript check
- `npm run build` — production build
- `npm start` — serve a production build

## Integration notes

The user management view lives at `/admin/users`. When merging into the official dashboard, connect the navigation item to this route and reuse the existing dashboard shell if appropriate. The role names are `admin`, `official`, and `resident`; officials and residents are application-level roles, not Supabase Auth roles. Keep the API routes and service-role client on a trusted Node/server runtime.
