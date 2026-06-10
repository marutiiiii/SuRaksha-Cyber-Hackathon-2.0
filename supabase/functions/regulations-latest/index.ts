import { corsHeaders, errorResponse, json } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { serviceClient } = await requireUser(req);
    const { data, error } = await serviceClient
      .from("regulations").select("*").order("date", { ascending: false });
    if (error) return errorResponse(error.message, 500);
    return json({ regulations: data });
  } catch (e) {
    if (e instanceof Response) return new Response(e.body, { status: e.status, headers: corsHeaders });
    return errorResponse((e as Error).message, 500);
  }
});