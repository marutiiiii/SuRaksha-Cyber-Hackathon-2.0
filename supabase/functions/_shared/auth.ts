import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

export interface AuthResult {
  userId: string;
  userClient: SupabaseClient;
  serviceClient: SupabaseClient;
}

export async function requireUser(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  const token = authHeader.slice(7);
  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data, error } = await userClient.auth.getUser(token);
  if (error || !data?.user) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  const serviceClient = createClient(url, service);
  return { userId: data.user.id, userClient, serviceClient };
}