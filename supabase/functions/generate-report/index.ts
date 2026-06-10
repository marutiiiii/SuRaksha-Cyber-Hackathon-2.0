import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";
import { corsHeaders, errorResponse, json } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { userId, serviceClient } = await requireUser(req);
    const { type = "executive" } = await req.json().catch(() => ({}));

    const [{ data: docs }, { data: maps }, { data: comps }] = await Promise.all([
      serviceClient.from("documents").select("title, source, status, created_at").eq("user_id", userId),
      serviceClient.from("maps").select("title, owner, severity, status, deadline").eq("user_id", userId),
      serviceClient.from("comparisons").select("result_json, created_at").eq("user_id", userId),
    ]);

    const allMaps = maps ?? [];
    const total = allMaps.length;
    const done = allMaps.filter((m) => m.status === "Done").length;
    const score = total ? Math.round((done / total) * 100) : 0;

    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    let page = pdf.addPage([595, 842]); // A4
    let y = 800;
    const line = (text: string, opts: { size?: number; b?: boolean; color?: [number,number,number] } = {}) => {
      if (y < 50) { page = pdf.addPage([595, 842]); y = 800; }
      page.drawText(text, {
        x: 50, y, size: opts.size ?? 11,
        font: opts.b ? bold : font,
        color: rgb(...(opts.color ?? [0.1, 0.1, 0.15])),
      });
      y -= (opts.size ?? 11) + 6;
    };
    const sep = () => { y -= 6; page.drawLine({ start: { x: 50, y }, end: { x: 545, y }, thickness: 0.5, color: rgb(0.7,0.7,0.75) }); y -= 12; };

    line("ReguFlow AI", { size: 10, color: [0.4,0.4,0.5] });
    line(`${type.charAt(0).toUpperCase() + type.slice(1)} Report`, { size: 22, b: true });
    line(`Generated ${new Date().toISOString().slice(0,10)} · Confidential`, { size: 10, color: [0.4,0.4,0.5] });
    sep();

    line("Overview", { size: 14, b: true });
    line(`Documents analyzed: ${docs?.length ?? 0}`);
    line(`Comparisons run: ${comps?.length ?? 0}`);
    line(`MAP tasks: ${total} total, ${done} completed`);
    line(`Audit readiness score: ${score}%`);
    sep();

    line("Open Action Points", { size: 14, b: true });
    for (const m of allMaps.filter((x) => x.status !== "Done").slice(0, 30)) {
      line(`• [${m.severity}] ${m.title}`, { b: true, size: 11 });
      line(`   Owner: ${m.owner ?? "—"}  ·  Deadline: ${m.deadline ?? "—"}  ·  Status: ${m.status}`, { size: 10, color: [0.35,0.35,0.4] });
    }
    if (allMaps.filter((x) => x.status !== "Done").length === 0) line("No open action points.", { color: [0.4,0.4,0.5] });

    const bytes = await pdf.save();
    const path = `${userId}/${type}-${Date.now()}.pdf`;
    const { error: upErr } = await serviceClient.storage
      .from("reports").upload(path, bytes, { contentType: "application/pdf" });
    if (upErr) return errorResponse(upErr.message, 500);

    const { data: report } = await serviceClient.from("reports")
      .insert({ user_id: userId, type, title: `${type} report`, file_path: path }).select("*").single();

    const { data: signed } = await serviceClient.storage
      .from("reports").createSignedUrl(path, 300);

    return json({ report, signed_url: signed?.signedUrl });
  } catch (e) {
    if (e instanceof Response) return new Response(e.body, { status: e.status, headers: corsHeaders });
    return errorResponse((e as Error).message, 500);
  }
});