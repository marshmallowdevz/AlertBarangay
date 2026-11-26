# Admin User Management Dashboard Design

Date: 2026-11-23

## Intent
Build an AlertBarangay-styled admin dashboard to manage application accounts through Supabase Auth and profile records, with server-only privileged operations and an audit trail.

## Goals
- Provide an admin-gated user overview with counts, search, role/status filters, and useful loading, empty, and error states.
- Create, edit, password-reset, and delete Supabase Auth users and their profiles without disturbing the acting administrator session.
- Keep service-role credentials on the server, verify admin role for all privileged operations, and audit account actions.
- Supply environment setup instructions and an idempotent SQL schema/policy migration.
- Match the requested burgundy, warm ivory, and alabaster visual system.

## Non-goals
- Rebuild unrelated AlertBarangay features or add public self-registration flows.
- Assume the absent official dashboard's routes/components exist; keep the module isolated for later integration.

## Constraints and calls
- The repository currently contains only a minimal package manifest, README, and dependencies for React Router and Lucide; it has no application or server architecture.
- Proposed architecture: Next.js App Router, with protected dashboard UI and server route handlers for Supabase Auth Admin API operations. This avoids introducing a separately deployed API service. It is the default recommendation because the existing repository has no client framework implementation to preserve and needs a trusted server boundary.
- Use Supabase session authentication with server-side role verification. Keep the service-role client in server-only modules; client code uses only the public URL and anon key.
- Profiles are keyed to `auth.users`; role values are `admin`, `official`, or `resident`. Additional position/department metadata is stored in profile fields. Active status is represented explicitly and checked by dashboard authorization.
- Deletion removes the Auth user; profile/audit referential behavior is defined in the migration so account deletion remains auditable while dependent profile data is cleaned up safely. The current authenticated admin cannot delete their own account.
- The dashboard remains a modular `/admin/users` section suitable for adding a sidebar entry when merged into the official dashboard.

## Approaches considered
1. Next.js App Router with colocated protected UI and server route handlers (recommended): one deployment boundary and straightforward server-only service-role protection; replaces the bare scaffold's framework direction.
2. React SPA plus a separate API server: preserves the current dependency direction, but adds another deployable service and session/CORS coordination despite no existing SPA to preserve.

## UI and behavior
- Left burgundy sidebar, alabaster canvas, white cards, ivory inner tiles, warm borders, Lucide outline icons, and maroon primary actions follow the supplied tokens.
- User list supports search and role/status filtering; summary metrics report totals by role and active state.
- Create/edit/password/delete forms provide validation, pending/success/error feedback, and explicit destructive confirmation. Password reset and deletion are audited. Delete confirmation names the target and prevents self-deletion.

## Security and data
- Protected page and every account-management endpoint authenticate the request and verify an active `admin` profile before doing work.
- The service-role key is read only in server-side modules and is never serialized to browser code.
- SQL enables RLS on profiles and audit records, restricts user-visible profile operations, and reserves admin mutations/audit writes for trusted server-side paths. Bootstrap guidance explains how to establish the first admin safely.

## Acceptance
- The project builds as a Next.js app with the user dashboard and protected CRUD/auth operations.
- Setup docs provide `.env.example`, migration instructions, and first-admin bootstrap steps.
- UI states and role/status metrics work with Supabase data; server endpoints reject unauthenticated and non-admin requests.
- Service-role secret is absent from client bundles and all required actions produce audit records.
