import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";
import { corsHeaders, errorResponse, json } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { userId, serviceClient } = await requireUser(req);
    const { documentId } = await req.json();
    if (!documentId) return errorResponse("documentId required");

    const { data: doc, error } = await serviceClient
      .from("documents").select("*").eq("id", documentId).eq("user_id", userId).single();
    if (error || !doc) return errorResponse("Document not found", 404);

    const { data: file, error: dlErr } = await serviceClient.storage
      .from("documents").download(doc.file_path);
    if (dlErr || !file) return errorResponse("Download failed", 500);

    const buffer = new Uint8Array(await file.arrayBuffer());
    const pdf = await getDocumentProxy(buffer);
    const { totalPages, text } = await extractText(pdf, { mergePages: true });
    const fullText = (text as string).slice(0, 200_000); // cap

    await serviceClient.from("documents")
      .update({ pages: totalPages, extracted_text: fullText, status: "extracted" })
      .eq("id", documentId);

    return json({ documentId, pages: totalPages, text: fullText });
  } catch (e) {
    if (e instanceof Response) return new Response(e.body, { status: e.status, headers: corsHeaders });
    return errorResponse((e as Error).message, 500);
  }
});