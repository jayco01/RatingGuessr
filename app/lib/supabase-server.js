import { createClient } from "@supabase/supabase-js";

let _admin = null;

function getAdmin() {
  if (!_admin) {
    _admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }
  return _admin;
}

export const supabaseAdmin = new Proxy(
  {},
  {
    get(_, prop) {
      const client = getAdmin();
      const value = client[prop];
      return typeof value === "function" ? value.bind(client) : value;
    },
  }
);
