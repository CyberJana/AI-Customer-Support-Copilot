import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { createLovableAiGatewayProvider, embedTexts } from "@/lib/ai-gateway.server";

function extractText(m: UIMessage): string {
  return (m.parts ?? [])
    .filter((p: { type: string }) => p.type === "text")
    .map((p) => (p as { type: "text"; text: string }).text)
    .join("");
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization") ?? "";
        const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
        if (!token) return new Response("Unauthorized", { status: 401 });

        const key = process.env.LOVABLE_API_KEY;
        const supabaseUrl = process.env.SUPABASE_URL!;
        const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY!;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const body = (await request.json()) as {
          messages: UIMessage[];
          id?: string;
        };
        const { messages, id: threadId } = body;
        if (!threadId) return new Response("Missing thread id", { status: 400 });
        if (!Array.isArray(messages) || messages.length === 0) {
          return new Response("Messages required", { status: 400 });
        }

        const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: userData, error: authErr } = await supabase.auth.getUser(token);
        if (authErr || !userData.user) return new Response("Unauthorized", { status: 401 });
        const userId = userData.user.id;

        // Verify thread ownership
        const { data: thread } = await supabase
          .from("threads")
          .select("id, title")
          .eq("id", threadId)
          .maybeSingle();
        if (!thread) return new Response("Thread not found", { status: 404 });

        const lastUser = [...messages].reverse().find((m) => m.role === "user");
        const lastUserText = lastUser ? extractText(lastUser) : "";

        // RAG lookup
        let ragContext = "";
        let citedChunkIds: string[] = [];
        if (lastUserText.trim()) {
          try {
            const [embedding] = await embedTexts([lastUserText]);
            const { data: matches } = await supabase.rpc("match_chunks", {
              query_embedding: embedding as unknown as string,
              match_count: 5,
            });
            if (matches && matches.length > 0) {
              citedChunkIds = matches.map((m: { id: string }) => m.id);
              ragContext = matches
                .map(
                  (m: { content: string; similarity: number }, i: number) =>
                    `[Source ${i + 1} · similarity ${m.similarity.toFixed(2)}]\n${m.content}`,
                )
                .join("\n\n");
            }
          } catch (e) {
            console.error("RAG lookup failed", e);
          }
        }

        // Persist user message (best-effort)
        if (lastUser && lastUserText) {
          await supabase.from("messages").insert({
            thread_id: threadId,
            user_id: userId,
            role: "user",
            content: lastUserText,
          });
        }

        const system = [
          "You are a helpful, concise customer support copilot.",
          "Answer the user's question clearly and politely.",
          "IMPORTANT: Respond in the same language the user wrote in.",
          "When knowledge base sources are provided below, ground your answer in them and cite the source number in brackets like [1]. If the sources don't cover the question, say so and answer from general knowledge.",
          ragContext
            ? `\n--- Knowledge base sources ---\n${ragContext}\n--- End of sources ---`
            : "\n(No knowledge base sources matched this question.)",
        ].join("\n");

        const gateway = createLovableAiGatewayProvider(key);
        const result = streamText({
          model: gateway("google/gemini-3.5-flash"),
          system,
          messages: await convertToModelMessages(messages),
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages,
          onFinish: async ({ responseMessage }) => {
            const text = extractText(responseMessage);
            if (!text) return;
            const { data: inserted } = await supabase
              .from("messages")
              .insert({
                thread_id: threadId,
                user_id: userId,
                role: "assistant",
                content: text,
              })
              .select("id")
              .single();

            if (inserted && citedChunkIds.length > 0) {
              await supabase.from("message_sources").insert(
                citedChunkIds.map((chunkId) => ({
                  message_id: inserted.id,
                  chunk_id: chunkId,
                  user_id: userId,
                })),
              );
            }

            const newTitle =
              thread.title === "New conversation" && lastUserText
                ? lastUserText.slice(0, 60)
                : thread.title;
            await supabase
              .from("threads")
              .update({ updated_at: new Date().toISOString(), title: newTitle })
              .eq("id", threadId);
          },
        });
      },
    },
  },
});
