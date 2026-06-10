import { corsHeaders, errorResponse, json } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { chatText, cosine, embed } from "../_shared/ai.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { userId, serviceClient } = await requireUser(req);
    const { message, sessionId } = await req.json();
    if (!message) return errorResponse("message required");
    const session = sessionId || crypto.randomUUID();

    // RAG-lite: embed query, retrieve top clauses across user's docs
    const [qEmb] = await embed([message]);
    const { data: clauses } = await serviceClient
      .from("clauses")
      .select("clause_id, text, category, severity, embedding, document_id, documents!inner(user_id, title)")
      .eq("documents.user_id", userId)
      .limit(500);

    const parse = (e: any): number[] =>
      Array.isArray(e) ? e : typeof e === "string" ? JSON.parse(e) : [];

    const scored = (clauses ?? [])
      .map((c: any) => ({ c, s: cosine(qEmb, parse(c.embedding)) }))
      .sort((a, b) => b.s - a.s)
      .slice(0, 6);

    const { data: openMaps } = await serviceClient
      .from("maps").select("title, owner, severity, status, deadline")
      .eq("user_id", userId).neq("status", "Done").limit(10);

    const context = scored.map((x, i) =>
      `[${i + 1}] (${x.c.clause_id} · ${x.c.documents.title}) ${x.c.text}`
    ).join("\n");

    const system =
      "You are ReguFlow AI Copilot — a compliance assistant for Indian banks. " +
      "Answer based on the provided clauses. Cite clauses using their bracket numbers like [1], [2]. " +
      "Be concise, structured, and practical. If the answer is not in context, say so.";

    const userPrompt =
      `User question: ${message}\n\n` +
      `Relevant clauses:\n${context || "(none indexed yet)"}\n\n` +
      `Open MAPs: ${JSON.stringify(openMaps ?? [])}`;

    const answer = await chatText({ system, user: userPrompt });

    const citations = scored.map((x, i) => ({
      n: i + 1, clauseId: x.c.clause_id, document: x.c.documents.title, similarity: +x.s.toFixed(3),
    }));

    await serviceClient.from("chat_history").insert([
      { user_id: userId, session_id: session, role: "user", content: message },
      { user_id: userId, session_id: session, role: "assistant", content: answer, citations_json: citations },
    ]);

    return json({ sessionId: session, answer, citations });
  } catch (e) {
    if (e instanceof Response) return new Response(e.body, { status: e.status, headers: corsHeaders });
    return errorResponse((e as Error).message, 500);
  }
});