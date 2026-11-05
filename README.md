# React + Vite

## Official dashboard access

- Sign-in is disabled by default so the dashboard opens directly. In this mode, the profile is shared, and anonymous visitors can post announcements, edit the shared contact numbers, and create dispatch records.
- After an admin account-management flow is ready, set `VITE_REQUIRE_AUTH=true` to restore the login gate. Before enabling it, add and apply a security migration that restricts anonymous announcement, contact, and dispatch writes.
- Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env.local`.
- Apply the SQL migrations in `supabase/migrations` to the Supabase project before using login, profiles, or shared contacts. This repository does not apply migrations to the hosted project automatically.
- Create official accounts in Supabase Auth. Each account needs the trusted app metadata claim `{"barangay_role":"official"}`; public sign-up is not available in the app.
- With auth enabled, this branch uses `/login` and `/dashboard`. Its `/` path redirects to login until the landing-page branch is merged; after merging, mount `AuthApp` with the landing page component (for example, `<AuthApp LandingPage={LandingPage} />`) and link its sign-in action to `/login`.
- The web host must serve the SPA entry point for `/login` and `/dashboard` so direct visits and reloads resolve to the app.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
