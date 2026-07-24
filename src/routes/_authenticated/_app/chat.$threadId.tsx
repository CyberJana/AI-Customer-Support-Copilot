import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useRef, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getThreadMessages } from "@/lib/chat.functions";
import { rateMessage } from "@/lib/feedback.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, LifeBuoy, User, ThumbsUp, ThumbsDown } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/_app/chat/$threadId")({
  component: ChatPage,
});

type StoredMsg = { id: string; role: string; content: string };

function toUIMessages(rows: StoredMsg[]): UIMessage[] {
  return rows
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant",
      parts: [{ type: "text", text: m.content }],
    }));
}

function ChatPage() {
  const { threadId } = Route.useParams();
  const qc = useQueryClient();
  const loadFn = useServerFn(getThreadMessages);

  const threadQuery = useQuery({
    queryKey: ["thread", threadId],
    queryFn: () => loadFn({ data: { threadId } }),
  });

  const initialMessages = useMemo(
    () => (threadQuery.data ? toUIMessages(threadQuery.data.messages as StoredMsg[]) : []),
    [threadQuery.data],
  );
  const initialFeedback = threadQuery.data?.feedback ?? {};

  return (
    <div className="flex h-full flex-col">
      <header className="border-b px-6 py-3">
        <h2 className="truncate text-sm font-medium">
          {threadQuery.data?.thread.title ?? "Conversation"}
        </h2>
      </header>
      {threadQuery.isLoading ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          Loading…
        </div>
      ) : (
        <ChatWindow
          key={threadId}
          threadId={threadId}
          initialMessages={initialMessages}
          initialFeedback={initialFeedback}
          onThreadUpdated={() => qc.invalidateQueries({ queryKey: ["threads"] })}
        />
      )}
    </div>
  );
}

function ChatWindow({
  threadId,
  initialMessages,
  initialFeedback,
  onThreadUpdated,
}: {
  threadId: string;
  initialMessages: UIMessage[];
  initialFeedback: Record<string, number>;
  onThreadUpdated: () => void;
}) {
  const [input, setInput] = useState("");
  const [feedback, setFeedback] = useState<Record<string, number>>(initialFeedback);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const rateFn = useServerFn(rateMessage);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        fetch: async (url, init) => {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          const headers = new Headers(init?.headers);
          if (token) headers.set("Authorization", `Bearer ${token}`);
          return fetch(url, { ...init, headers });
        },
      }),
    [],
  );

  const { messages, sendMessage, status, error } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
    onError: (e) => toast.error(e.message),
    onFinish: () => {
      onThreadUpdated();
      inputRef.current?.focus();
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [threadId]);

  const isLoading = status === "submitted" || status === "streaming";

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    await sendMessage({ text });
  }

  async function handleRate(messageId: string, next: 1 | -1) {
    const current = feedback[messageId] ?? 0;
    const target = current === next ? 0 : next;
    // Optimistic
    setFeedback((f) => ({ ...f, [messageId]: target }));
    try {
      await rateFn({ data: { messageId, rating: target } });
      if (target === 1) toast.success("Thanks — I'll rank these sources higher.");
      else if (target === -1) toast.success("Noted — I'll rank these sources lower.");
    } catch (e) {
      setFeedback((f) => ({ ...f, [messageId]: current }));
      toast.error(e instanceof Error ? e.message : "Couldn't save rating");
    }
  }

  return (
    <>
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
          {messages.length === 0 && (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Ask anything — I'll search your knowledge base and respond in your language.
            </div>
          )}
          {messages.map((m) => {
            // Only show feedback on persisted assistant messages (uuid), not
            // in-flight streaming ones (temp ids look like "msg_...").
            const isPersisted = /^[0-9a-f-]{36}$/i.test(m.id);
            return (
              <MessageBubble
                key={m.id}
                message={m}
                rating={feedback[m.id] ?? 0}
                canRate={m.role === "assistant" && isPersisted && !isLoading}
                onRate={(r) => handleRate(m.id, r)}
              />
            );
          })}
          {status === "submitted" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Thinking…
            </div>
          )}
          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error.message}
            </div>
          )}
        </div>
      </div>

      <form onSubmit={submit} className="border-t bg-background p-4">
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Ask a question in any language…"
            rows={1}
            className="min-h-[44px] resize-none"
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !input.trim()} size="icon">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </form>
    </>
  );
}

function MessageBubble({
  message,
  rating,
  canRate,
  onRate,
}: {
  message: UIMessage;
  rating: number;
  canRate: boolean;
  onRate: (r: 1 | -1) => void;
}) {
  const text = (message.parts ?? [])
    .filter((p) => p.type === "text")
    .map((p) => (p as { type: "text"; text: string }).text)
    .join("");
  const isUser = message.role === "user";
  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <LifeBuoy className="h-4 w-4" />}
      </div>
      <div className={`flex max-w-[80%] flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm ${
            isUser ? "bg-primary text-primary-foreground" : "bg-muted"
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{text}</p>
          ) : (
            <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-headings:my-2">
              <ReactMarkdown>{text}</ReactMarkdown>
            </div>
          )}
        </div>
        {message.role === "assistant" && canRate && (
          <div className="flex items-center gap-1 px-1">
            <button
              type="button"
              aria-label="Helpful"
              onClick={() => onRate(1)}
              className={`rounded-md p-1 transition-colors hover:bg-muted ${
                rating === 1 ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <ThumbsUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label="Not helpful"
              onClick={() => onRate(-1)}
              className={`rounded-md p-1 transition-colors hover:bg-muted ${
                rating === -1 ? "text-destructive" : "text-muted-foreground"
              }`}
            >
              <ThumbsDown className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
