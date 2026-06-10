import { corsHeaders, errorResponse, json } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { userId, serviceClient } = await requireUser(req);
    const form = await req.formData();
    const file = form.get("file");
    const source = (form.get("source") as string) || "Unknown";
    if (!(file instanceof File)) return errorResponse("file is required");
    if (file.size > 25 * 1024 * 1024) return errorResponse("File exceeds 25 MB", 413);

    const buf = new Uint8Array(await file.arrayBuffer());
    const filename = file.name || "document.pdf";
    const path = `${userId}/${crypto.randomUUID()}-${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

    const { error: upErr } = await serviceClient.storage
      .from("documents")
      .upload(path, buf, { contentType: file.type || "application/pdf", upsert: false });
    if (upErr) return errorResponse(upErr.message, 500);

    const { data: doc, error: insErr } = await serviceClient
      .from("documents")
      .insert({ user_id: userId, title: filename, source, file_path: path, status: "uploaded" })
      .select("*")
      .single();
    if (insErr) return errorResponse(insErr.message, 500);

    return json({ documentId: doc.id, status: "uploaded", document: doc });
  } catch (e) {
    if (e instanceof Response) return new Response(e.body, { status: e.status, headers: corsHeaders });
    return errorResponse((e as Error).message, 500);
  }
});