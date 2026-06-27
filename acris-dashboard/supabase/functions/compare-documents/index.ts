import { corsHeaders, errorResponse, json } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { cosine, embed } from "../_shared/ai.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { userId, serviceClient } = await requireUser(req);
    const { oldDocumentId, newDocumentId } = await req.json();
    if (!oldDocumentId || !newDocumentId) return errorResponse("oldDocumentId and newDocumentId required");

    const { data: oldClauses } = await serviceClient
      .from("clauses").select("id, clause_id, text, category, severity, embedding")
      .eq("document_id", oldDocumentId);
    const { data: newClauses } = await serviceClient
      .from("clauses").select("id, clause_id, text, category, severity, embedding")
      .eq("document_id", newDocumentId);

    if (!oldClauses?.length || !newClauses?.length)
      return errorResponse("Both documents must have extracted clauses", 400);

    // pgvector embeddings come back as string "[0.1,0.2,...]" — parse if needed
    const parse = (e: string | number[] | Record<string, unknown>): number[] =>
      Array.isArray(e) ? e : typeof e === "string" ? JSON.parse(e) : [];

    const oldEmb = oldClauses.map((c) => parse(c.embedding));
    const newEmb = newClauses.map((c) => parse(c.embedding));

    const SIM = 0.85;
    const matchedNew = new Set<number>();
    const added: Record<string, unknown>[] = [];
    const removed: Record<string, unknown>[] = [];
    const modified: Record<string, unknown>[] = [];

    // For each old clause, find best new match
    for (let i = 0; i < oldClauses.length; i++) {
      let bestJ = -1, bestS = -1;
      for (let j = 0; j < newClauses.length; j++) {
        if (matchedNew.has(j)) continue;
        const s = cosine(oldEmb[i], newEmb[j]);
        if (s > bestS) { bestS = s; bestJ = j; }
      }
      if (bestJ >= 0 && bestS >= SIM) {
        matchedNew.add(bestJ);
        const oc = oldClauses[i], nc = newClauses[bestJ];
        if (oc.text.trim() !== nc.text.trim()) {
          modified.push({
            id: nc.clause_id, oldText: oc.text, newText: nc.text,
            category: nc.category, severity: nc.severity, similarity: +bestS.toFixed(3),
          });
        }
      } else {
        removed.push({ id: oldClauses[i].clause_id, text: oldClauses[i].text, category: oldClauses[i].category });
      }
    }
    for (let j = 0; j < newClauses.length; j++) {
      if (!matchedNew.has(j))
        added.push({ id: newClauses[j].clause_id, text: newClauses[j].text, category: newClauses[j].category, severity: newClauses[j].severity });
    }

    const result_json = { added, removed, modified, counts: { added: added.length, removed: removed.length, modified: modified.length } };

    const { data: cmp, error: cmpErr } = await serviceClient
      .from("comparisons")
      .insert({ user_id: userId, old_document_id: oldDocumentId, new_document_id: newDocumentId, result_json })
      .select("*").single();
    if (cmpErr) return errorResponse(cmpErr.message, 500);

    return json({ comparisonId: cmp.id, ...result_json });
  } catch (e) {
    if (e instanceof Response) return new Response(e.body, { status: e.status, headers: corsHeaders });
    return errorResponse((e as Error).message, 500);
  }
});