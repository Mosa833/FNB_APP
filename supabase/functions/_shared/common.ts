import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function env(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new HttpError(500, `Server setting ${name} is missing. Add it with: supabase secrets set ${name}=...`);
  return value;
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// Service role client: bypasses row level security, only used on the server
export function adminClient(): SupabaseClient {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Returns the signed in user, or throws 401
export async function requireUser(req: Request, admin: SupabaseClient) {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) throw new HttpError(401, "Please log in first.");
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) throw new HttpError(401, "Please log in first.");
  return data.user;
}

// Wraps a handler with CORS and error handling
export function serve(handler: (req: Request) => Promise<Response>) {
  Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    try {
      return await handler(req);
    } catch (err) {
      const status = err instanceof HttpError ? err.status : 500;
      console.error(err);
      return json({ error: err instanceof Error ? err.message : "Something went wrong." }, status);
    }
  });
}
