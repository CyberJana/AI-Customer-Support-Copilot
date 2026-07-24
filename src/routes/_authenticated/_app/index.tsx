import { createFileRoute } from "@tanstack/react-router";
import { LifeBuoy, MessageSquarePlus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/_app/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <LifeBuoy className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-semibold">Welcome to your Support Copilot</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ask questions in any language and I'll answer from your uploaded knowledge base. Start a
          new conversation, or upload documents to build your knowledge base.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground">
          <MessageSquarePlus className="h-3.5 w-3.5" />
          Click "New conversation" in the sidebar to begin
        </div>
      </div>
    </div>
  );
}
