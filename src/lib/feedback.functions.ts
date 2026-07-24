import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { embedTexts } from "@/lib/ai-gateway.server";
import { z } from "zod";

export const rateMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        messageId: z.string().uuid(),
        rating: z.union([z.literal(1), z.literal(-1), z.literal(0)]),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Load prior rating (if any) so we can reverse its impact on chunk scores.
    const { data: existing } = await supabase
      .from("message_feedback")
      .select("rating")
      .eq("message_id", data.messageId)
      .eq("user_id", userId)
      .maybeSingle();
    const prior = existing?.rating ?? 0;

    if (data.rating === 0) {
      // Clear rating: reverse prior effect and delete row.
      if (prior !== 0) {
        await supabase.rpc("apply_message_feedback", {
          _message_id: data.messageId,
          _delta: -prior,
        });
      }
      await supabase
        .from("message_feedback")
        .delete()
        .eq("message_id", data.messageId)
        .eq("user_id", userId);
      return { ok: true, rating: 0 };
    }

    const delta = data.rating - prior;
    if (delta !== 0) {
      await supabase.rpc("apply_message_feedback", {
        _message_id: data.messageId,
        _delta: delta,
      });
    }

    if (existing) {
      await supabase
        .from("message_feedback")
        .update({ rating: data.rating, updated_at: new Date().toISOString() })
        .eq("message_id", data.messageId)
        .eq("user_id", userId);
    } else {
      await supabase.from("message_feedback").insert({
        message_id: data.messageId,
        user_id: userId,
        rating: data.rating,
      });
    }
    return { ok: true, rating: data.rating };
  });

export const reindexDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ documentId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: chunks, error } = await supabase
      .from("document_chunks")
      .select("id, content")
      .eq("document_id", data.documentId)
      .order("chunk_index", { ascending: true });
    if (error) throw new Error(error.message);
    if (!chunks || chunks.length === 0) throw new Error("No chunks to re-index");

    const batchSize = 64;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const slice = chunks.slice(i, i + batchSize);
      const vecs = await embedTexts(slice.map((c) => c.content));
      // Update embeddings + reset score for the re-indexed chunks.
      await Promise.all(
        slice.map((c, idx) =>
          supabase
            .from("document_chunks")
            .update({ embedding: vecs[idx] as unknown as string, score: 0 })
            .eq("id", c.id),
        ),
      );
    }

    await supabase
      .from("documents")
      .update({ needs_reindex: false })
      .eq("id", data.documentId);
    return { ok: true, chunkCount: chunks.length };
  });
