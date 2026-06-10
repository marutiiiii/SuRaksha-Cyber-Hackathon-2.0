import { corsHeaders, errorResponse, json } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { userId, serviceClient } = await requireUser(req);
    const today = new Date().toISOString().slice(0, 10);

    const { data: maps } = await serviceClient
      .from("maps").select("status, owner, severity, deadline").eq("user_id", userId);

    const all = maps ?? [];
    const total = all.length;
    const completed = all.filter((m) => m.status === "Done").length;
    const overdue = all.filter((m) => m.status !== "Done" && m.deadline && m.deadline < today).length;
    const score = total ? Math.round((completed / total) * 100) : 0;

    const byDept: Record<string, { total: number; done: number }> = {};
    for (const m of all) {
      const d = m.owner ?? "Other";
      byDept[d] ??= { total: 0, done: 0 };
      byDept[d].total++;
      if (m.status === "Done") byDept[d].done++;
    }
    const departments = Object.entries(byDept).map(([dept, v]) => ({
      department: dept,
      total: v.total,
      done: v.done,
      readiness: v.total ? Math.round((v.done / v.total) * 100) : 0,
    })).sort((a, b) => b.readiness - a.readiness);

    return json({ score, total, completed, overdue, departments });
  } catch (e) {
    if (e instanceof Response) return new Response(e.body, { status: e.status, headers: corsHeaders });
    return errorResponse((e as Error).message, 500);
  }
});