import { createBrowserClient } from "@supabase/ssr";

// Cliente de Supabase para usar dentro de componentes de cliente (el navegador).
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
