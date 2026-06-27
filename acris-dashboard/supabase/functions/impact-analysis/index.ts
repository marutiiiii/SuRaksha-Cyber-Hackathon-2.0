import { corsHeaders, errorResponse, json } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { chatJSON } from "../_shared/ai.ts";

const DEPARTMENTS = ["Compliance","Legal","Operations","IT","Cybersecurity","Audit"];

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
      ...(cmp.result_json.added ?? []).map((c: Record<string, unknown>) => ({ ...c, type: "added" })),
      ...(cmp.result_json.modified ?? []).map((c: { id: string; newText: string; category: string; severity: string }) => ({ id: c.id, text: c.newText, category: c.category, severity: c.severity, type: "modified" })),
      ...(cmp.result_json.removed ?? []).map((c: Record<string, unknown>) => ({ ...c, type: "removed" })),
    ].slice(0, 25);

    if (changes.length === 0) return json({ matrix: [], perClause: [] });

    const system =
      `You assess departmental impact of regulatory clause changes. Departments: ${DEPARTMENTS.join(", ")}. ` +
      "For each clause, return impact scores 0-100 across all 6 departments and a one-line reason for the highest-scoring one. " +
      "Return strict JSON: { \"items\": [{ \"clauseId\": \"...\", \"scores\": { \"Compliance\": 0-100, ... }, \"primary\": \"Compliance\", \"reason\": \"...\" }] }";

    const result = await chatJSON<{ items: Record<string, unknown>[] }>({
      system,
      user: JSON.stringify({ changes }),
    });

    // Aggregate matrix
    const agg: Record<string, { dept: string; sum: number; n: number; reasons: string[] }> = {};
    DEPARTMENTS.forEach((d) => (agg[d] = { dept: d, sum: 0, n: 0, reasons: [] }));
    for (const item of result.items ?? []) {
      for (const d of DEPARTMENTS) {
        const s = Number(item.scores?.[d] ?? 0);
        agg[d].sum += s;
        agg[d].n += 1;
      }
      if (item.primary && agg[item.primary]) agg[item.primary].reasons.push(item.reason);
    }
    const matrix = DEPARTMENTS.map((d) => {
      const a = agg[d];
      const impact = a.n ? Math.round(a.sum / a.n) : 0;
      const risk = impact >= 75 ? "High" : impact >= 45 ? "Medium" : "Low";
      return {
        department: d,
        impact,
        risk,
        priority: impact >= 75 ? "P1" : impact >= 45 ? "P2" : "P3",
        action: a.reasons[0] ?? "Review impacted clauses and update SOPs.",
      };
    });

    return json({ matrix, perClause: result.items ?? [] });
  } catch (e) {
    if (e instanceof Response) return new Response(e.body, { status: e.status, headers: corsHeaders });
    return errorResponse((e as Error).message, 500);
  }
});