import { corsHeaders, errorResponse, json } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { chatJSON } from "../_shared/ai.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { userId, serviceClient } = await requireUser(req);
    const { comparisonId } = await req.json();
    if (!comparisonId) return errorResponse("comparisonId required");

    const { data: cmp, error } = await serviceClient
      .from("comparisons").select("*").eq("id", comparisonId).eq("user_id", userId).single();
    if (error || !cmp) return errorResponse("Comparison not found", 404);

    const changes = [
      ...(cmp.result_json.added ?? []).map((c: any) => ({ ...c, type: "added" })),
      ...(cmp.result_json.modified ?? []).map((c: any) => ({ id: c.id, text: c.newText, category: c.category, severity: c.severity, type: "modified" })),
    ].slice(0, 25);

    if (changes.length === 0) return json({ maps: [] });

    const system =
      "You convert regulatory clause changes into Mitigation Action Points (MAPs) for a bank. " +
      "For each clause produce one task. Owners must be one of: " +
      "Compliance Team, Legal Team, Operations Team, IT Team, Cybersecurity Team, Audit Team. " +
      "Severity: Low|Medium|High|Critical. Deadline: ISO date within the next 7-90 days from today. " +
      "Return strict JSON: { \"maps\": [{ \"clauseRef\": \"C001\", \"title\": \"...\", \"description\": \"...\", \"owner\": \"...\", \"severity\": \"...\", \"deadline\": \"YYYY-MM-DD\" }] }";

    const today = new Date().toISOString().slice(0, 10);
    const result = await chatJSON<{ maps: any[] }>({
      system,
      user: `Today is ${today}.\n\nChanges:\n${JSON.stringify(changes)}`,
    });

    const rows = (result.maps ?? []).map((m) => ({
      user_id: userId,
      comparison_id: comparisonId,
      clause_ref: m.clauseRef ?? null,
      title: m.title ?? "Untitled action",
      description: m.description ?? "",
      owner: m.owner ?? "Compliance Team",
      severity: m.severity ?? "Medium",
      status: "Open",
      deadline: m.deadline ?? null,
    }));

    if (rows.length) {
      const { error: insErr } = await serviceClient.from("maps").insert(rows);
      if (insErr) return errorResponse(insErr.message, 500);
    }

    return json({ count: rows.length, maps: rows });
  } catch (e) {
    if (e instanceof Response) return new Response(e.body, { status: e.status, headers: corsHeaders });
    return errorResponse((e as Error).message, 500);
  }
});