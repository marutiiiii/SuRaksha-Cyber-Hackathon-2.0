import { corsHeaders, errorResponse, json } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { userId, serviceClient } = await requireUser(req);
    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean);
    // /documents OR /documents/{id} OR /documents/{id}/text
    const id = parts[1];
    const sub = parts[2];

    if (!id) {
      const { data, error } = await serviceClient
        .from("documents")
        .select("id, title, source, pages, status, file_path, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) return errorResponse(error.message, 500);
      return json({ documents: data });
    }

    const { data: doc, error } = await serviceClient
      .from("documents")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) return errorResponse(error.message, 500);
    if (!doc) return errorResponse("Not found", 404);

    if (sub === "text") {
      return json({ id: doc.id, pages: doc.pages, text: doc.extracted_text ?? "" });
    }

    const { data: signed } = await serviceClient.storage
      .from("documents")
      .createSignedUrl(doc.file_path, 300);
    return json({ ...doc, signed_url: signed?.signedUrl });
  } catch (e) {
    if (e instanceof Response) return new Response(e.body, { status: e.status, headers: corsHeaders });
    return errorResponse((e as Error).message, 500);
  }
});