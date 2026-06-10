// Lovable AI Gateway helpers (chat + embeddings) using direct REST calls.
const GATEWAY = "https://ai.gateway.lovable.dev/v1";

function key() {
  const k = Deno.env.get("LOVABLE_API_KEY");
  if (!k) throw new Error("LOVABLE_API_KEY is not configured");
  return k;
}

export async function chatJSON<T = unknown>(opts: {
  system?: string;
  user: string;
  model?: string;
  temperature?: number;
}): Promise<T> {
  const res = await fetch(`${GATEWAY}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key(),
    },
    body: JSON.stringify({
      model: opts.model ?? "google/gemini-2.5-flash",
      temperature: opts.temperature ?? 0.2,
      response_format: { type: "json_object" },
      messages: [
        ...(opts.system ? [{ role: "system", content: opts.system }] : []),
        { role: "user", content: opts.user },
      ],
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI gateway ${res.status}: ${t}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content ?? "{}";
  try {
    return JSON.parse(content) as T;
  } catch {
    // Try to extract JSON from text
    const m = content.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]) as T;
    throw new Error(`AI returned non-JSON: ${content.slice(0, 200)}`);
  }
}

export async function chatText(opts: {
  system?: string;
  user: string;
  model?: string;
  temperature?: number;
}): Promise<string> {
  const res = await fetch(`${GATEWAY}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key(),
    },
    body: JSON.stringify({
      model: opts.model ?? "google/gemini-2.5-flash",
      temperature: opts.temperature ?? 0.3,
      messages: [
        ...(opts.system ? [{ role: "system", content: opts.system }] : []),
        { role: "user", content: opts.user },
      ],
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI gateway ${res.status}: ${t}`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const res = await fetch(`${GATEWAY}/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key(),
    },
    body: JSON.stringify({
      model: "google/gemini-embedding-001",
      input: texts,
      dimensions: 768,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Embedding ${res.status}: ${t}`);
  }
  const data = await res.json();
  return data.data.map((d: any) => d.embedding as number[]);
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
}