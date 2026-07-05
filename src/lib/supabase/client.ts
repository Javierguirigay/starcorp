/**
 * Cliente de Supabase (@supabase/supabase-js).
 *
 * FASE ACTUAL: el esquema y los seeds están listos en supabase/, pero las
 * pantallas todavía leen los datos locales de src/lib/data/. Este cliente
 * queda configurado para la fase de conexión (ver docs/supabase.md).
 *
 * Se crea de forma perezosa para que `next build` no falle cuando las
 * variables de entorno aún no están definidas.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cliente: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (cliente) return cliente;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL y/o NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Copia .env.example a .env.local y completa los valores de tu proyecto Supabase."
    );
  }

  cliente = createClient(url, anonKey);
  return cliente;
}
