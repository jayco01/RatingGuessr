import { createClient } from "@supabase/supabase-js";

// Lazily create the client so module-level evaluation during Next.js static
// build doesn't throw when NEXT_PUBLIC_SUPABASE_* env vars aren't set yet.
let _client = null;

function getClient() {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    );
  }
  return _client;
}

export const supabase = new Proxy(
  {},
  {
    get(_, prop) {
      const client = getClient();
      const value = client[prop];
      return typeof value === "function" ? value.bind(client) : value;
    },
  }
);
