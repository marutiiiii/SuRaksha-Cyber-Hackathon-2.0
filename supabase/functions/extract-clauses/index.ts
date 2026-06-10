import { corsHeaders, errorResponse, json } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { chatJSON, embed } from "../_shared/ai.ts";

interface ExtractedClause {
  clauseId: string;
  text: string;
  category: string;
  obligation: string;
  severity: "Low" | "Medium" | "High" | "Critical";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { userId, serviceClient } = await requireUser(req);
    const { documentId } = await req.json();
    if (!documentId) return errorResponse("documentId required");

    const { data: doc, error } = await serviceClient
      .from("documents").select("*").eq("id", documentId).eq("user_id", userId).single();
    if (error || !doc) return errorResponse("Document not found", 404);
    if (!doc.extracted_text) return errorResponse("Run text extraction first", 400);

    const sample = doc.extracted_text.slice(0, 40_000);

    const system =
      "You are a regulatory analyst for Indian banking (RBI/SEBI/NPCI/CERT-In). " +
      "Extract the discrete regulatory clauses from the provided text. " +
      "Return strict JSON: { \"clauses\": [{ \"clauseId\": \"C001\", \"text\": \"...\", " +
      "\"category\": \"KYC|AML|Cybersecurity|Reporting|Risk|Governance|Operations|Other\", " +
      "\"obligation\": \"What the bank must do\", " +
      "\"severity\": \"Low|Medium|High|Critical\" }] }. " +
      "Aim for 8-20 clauses. clauseId must be C001, C002, ... in order. Keep clause text < 600 chars.";

    const result = await chatJSON<{ clauses: ExtractedClause[] }>({
      system,
      user: `Document: ${doc.title}\nSource: ${doc.source}\n\nText:\n${sample}`,
    });

    const clauses = (result.clauses ?? []).slice(0, 40);
    if (clauses.length === 0) return json({ clauses: [] });

    const embeddings = await embed(clauses.map((c) => c.text));

    // Replace existing clauses for this document
    await serviceClient.from("clauses").delete().eq("document_id", documentId);
    const rows = clauses.map((c, i) => ({
      document_id: documentId,
      clause_id: c.clauseId || `C${String(i + 1).padStart(3, "0")}`,
      text: c.text,
      category: c.category,
      obligation: c.obligation,
      severity: c.severity,
      embedding: embeddings[i] as unknown as string, // pgvector accepts array via supabase-js
    }));
    const { error: insErr } = await serviceClient.from("clauses").insert(rows);
    if (insErr) return errorResponse(insErr.message, 500);

    await serviceClient.from("documents")
      .update({ status: "analyzed" }).eq("id", documentId);

    return json({ documentId, count: clauses.length, clauses });
  } catch (e) {
    if (e instanceof Response) return new Response(e.body, { status: e.status, headers: corsHeaders });
    return errorResponse((e as Error).message, 500);
  }
});