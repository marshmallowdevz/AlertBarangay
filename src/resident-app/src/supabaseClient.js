   import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

let client;
let problem = "";

try {
  if (!url || !key) {
    throw new Error(
      "Missing " + [!url && "VITE_SUPABASE_URL", !key && "VITE_SUPABASE_PUBLISHABLE_KEY"].filter(Boolean).join(" and ") + " in .env.local"
    );
  }
  client = createClient(url, key);
} catch (err) {
  problem = err.message;
  // Placeholder client so the page can still show a helpful message instead of going blank
  client = createClient("https://placeholder.supabase.co", "placeholder-key");
}

export const supabase = client;
export const isConfigured = problem === "";
export const configError = problem;
