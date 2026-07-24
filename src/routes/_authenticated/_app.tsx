import { createFileRoute, Outlet, Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { listThreads, createThread, deleteThread } from "@/lib/chat.functions";
import { Button } from "@/components/ui/button";
import { LifeBuoy, MessageSquarePlus, MessageSquare, FileText, LogOut, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_app")({
  head: () => ({
    meta: [
      { title: "Support Copilot" },
      {
        name: "description",
        content: "AI customer support copilot that answers from your knowledge base.",
      },
    ],
  }),
  component: AppShell,
});

function AppShell() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const listFn = useServerFn(listThreads);
  const createFn = useServerFn(createThread);
  const delFn = useServerFn(deleteThread);

  const threadsQuery = useQuery({
    queryKey: ["threads"],
    queryFn: () => listFn(),
  });

  const newThread = useMutation({
    mutationFn: () => createFn(),
    onSuccess: (thread) => {
      qc.invalidateQueries({ queryKey: ["threads"] });
      navigate({ to: "/chat/$threadId", params: { threadId: thread.id } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const removeThread = useMutation({
    mutationFn: (threadId: string) => delFn({ data: { threadId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["threads"] });
      navigate({ to: "/" });
    },
  });

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  const threads = threadsQuery.data ?? [];
  const activeThreadId = pathname.startsWith("/chat/") ? pathname.split("/")[2] : null;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <aside className="flex w-72 flex-col border-r bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-2 border-b border-sidebar-border p-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <LifeBuoy className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold">Support Copilot</div>
            <div className="text-xs text-sidebar-foreground/60">Powered by Lovable AI</div>
          </div>
        </div>

        <div className="p-3">
          <Button
            onClick={() => newThread.mutate()}
            disabled={newThread.isPending}
            className="w-full justify-start gap-2"
            size="sm"
          >
            <MessageSquarePlus className="h-4 w-4" />
            New conversation
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2">
          <div className="mb-1 px-2 text-xs font-medium uppercase tracking-wider text-sidebar-foreground/50">
            Conversations
          </div>
          {threadsQuery.isLoading ? (
            <div className="p-2 text-xs text-sidebar-foreground/60">Loading…</div>
          ) : threads.length === 0 ? (
            <div className="p-2 text-xs text-sidebar-foreground/60">
              No conversations yet. Start one!
            </div>
          ) : (
            <ul className="space-y-0.5">
              {threads.map((t) => {
                const active = t.id === activeThreadId;
                return (
                  <li key={t.id} className="group flex items-center gap-1">
                    <Link
                      to="/chat/$threadId"
                      params={{ threadId: t.id }}
                      className={cn(
                        "flex flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-sm truncate transition",
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "hover:bg-sidebar-accent/50",
                      )}
                    >
                      <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-60" />
                      <span className="truncate">{t.title}</span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("Delete this conversation?")) removeThread.mutate(t.id);
                      }}
                      className="rounded p-1 opacity-0 hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </nav>

        <div className="border-t border-sidebar-border p-2">
          <Link
            to="/documents"
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition",
              pathname === "/documents"
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "hover:bg-sidebar-accent/50",
            )}
          >
            <FileText className="h-4 w-4" />
            Knowledge base
          </Link>
          <button
            onClick={signOut}
            className="mt-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent/50"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
