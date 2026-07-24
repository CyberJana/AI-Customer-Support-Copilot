import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { embedTexts } from "@/lib/ai-gateway.server";
import { z } from "zod";

function chunkText(text: string, size = 1200, overlap = 150): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const chunks: string[] = [];
  let i = 0;
  while (i < clean.length) {
    chunks.push(clean.slice(i, i + size));
    i += size - overlap;
  }
  return chunks;
}

export const listDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("documents")
      .select("id, title, filename, chunk_count, created_at, needs_reindex")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const deleteDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("documents").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const ingestDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        title: z.string().min(1).max(200),
        filename: z.string().max(200).optional(),
        text: z.string().min(1),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const chunks = chunkText(data.text);
    if (chunks.length === 0) throw new Error("No text to ingest");
    if (chunks.length > 200) chunks.length = 200; // cap per doc

    // Embed in batches to stay under limits.
    const embeddings: number[][] = [];
    const batchSize = 64;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const slice = chunks.slice(i, i + batchSize);
      const vecs = await embedTexts(slice);
      embeddings.push(...vecs);
    }

    const { data: doc, error: dErr } = await context.supabase
      .from("documents")
      .insert({
        user_id: context.userId,
        title: data.title,
        filename: data.filename ?? null,
        chunk_count: chunks.length,
      })
      .select("id")
      .single();
    if (dErr) throw new Error(dErr.message);

    const rows = chunks.map((content, idx) => ({
      document_id: doc.id,
      user_id: context.userId,
      chunk_index: idx,
      content,
      embedding: embeddings[idx] as unknown as string,
    }));
    const { error: cErr } = await context.supabase.from("document_chunks").insert(rows);
    if (cErr) {
      await context.supabase.from("documents").delete().eq("id", doc.id);
      throw new Error(cErr.message);
    }
    return { id: doc.id, chunkCount: chunks.length };
  });
