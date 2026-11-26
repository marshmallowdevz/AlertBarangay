import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Avatars and incident photos come from Supabase Storage (often short-lived
      // signed URLs), which next/image cannot optimise or cache safely.
      "@next/next/no-img-element": "off",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "coverage/**", "android/**", "resident-app/**", "supabase/functions/**", "next-env.d.ts"]),
]);
