import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { listDocuments, ingestDocument, deleteDocument } from "@/lib/documents.functions";
import { reindexDocument } from "@/lib/feedback.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Trash2, Upload, Loader2, RefreshCw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/_app/documents")({
  head: () => ({
    meta: [
      { title: "Knowledge base · Support Copilot" },
      {
        name: "description",
        content: "Upload documents to power your AI support copilot's answers.",
      },
    ],
  }),
  component: DocumentsPage,
});

async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  // Configure worker
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const out: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    out.push(content.items.map((it) => ("str" in it ? (it as { str: string }).str : "")).join(" "));
  }
  return out.join("\n\n");
}

function DocumentsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listDocuments);
  const ingestFn = useServerFn(ingestDocument);
  const deleteFn = useServerFn(deleteDocument);
  const reindexFn = useServerFn(reindexDocument);

  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const docsQuery = useQuery({ queryKey: ["documents"], queryFn: () => listFn() });

  const del = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["documents"] }),
  });

  const reindex = useMutation({
    mutationFn: (id: string) => reindexFn({ data: { documentId: id } }),
    onSuccess: () => {
      toast.success("Document re-indexed");
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Re-index failed"),
  });

  async function handleFile(file: File) {
    setBusy(true);
    try {
      let content: string;
      if (file.name.toLowerCase().endsWith(".pdf")) {
        content = await extractPdfText(file);
      } else {
        content = await file.text();
      }
      if (!content.trim()) throw new Error("No text extracted from file");
      await ingestFn({
        data: { title: title || file.name, filename: file.name, text: content },
      });
      toast.success("Document added to knowledge base");
      setTitle("");
      if (fileInput.current) fileInput.current.value = "";
      qc.invalidateQueries({ queryKey: ["documents"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function handlePasteSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !text.trim()) return;
    setBusy(true);
    try {
      await ingestFn({ data: { title, text } });
      toast.success("Content added to knowledge base");
      setTitle("");
      setText("");
      qc.invalidateQueries({ queryKey: ["documents"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  const docs = docsQuery.data ?? [];

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl space-y-6 p-8">
        <div>
          <h1 className="text-2xl font-semibold">Knowledge base</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload PDFs, text, or paste content. The copilot will search these to answer questions.
          </p>
        </div>

        <Card className="p-6">
          <h2 className="mb-4 text-sm font-semibold">Upload a file</h2>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="doc-title">Title (optional)</Label>
              <Input
                id="doc-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Product handbook"
                disabled={busy}
              />
            </div>
            <input
              ref={fileInput}
              type="file"
              accept=".pdf,.txt,.md,.csv,.json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInput.current?.click()}
              disabled={busy}
            >
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Choose file (PDF, TXT, MD)
            </Button>
          </div>

          <div className="my-6 h-px bg-border" />

          <form onSubmit={handlePasteSubmit} className="space-y-3">
            <h2 className="text-sm font-semibold">Or paste text</h2>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste FAQ, policy, or help center content…"
              rows={6}
              disabled={busy}
            />
            <Button type="submit" disabled={busy || !title.trim() || !text.trim()}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add to knowledge base
            </Button>
          </form>
        </Card>

        <div>
          <h2 className="mb-3 text-sm font-semibold">
            Your documents{" "}
            <span className="text-muted-foreground">({docs.length})</span>
          </h2>
          {docsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : docs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No documents yet.</p>
          ) : (
            <ul className="space-y-2">
              {docs.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between rounded-lg border bg-card p-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{d.title}</span>
                        {d.needs_reindex && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
                            <AlertTriangle className="h-3 w-3" /> Needs re-index
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {d.chunk_count} chunks ·{" "}
                        {formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {d.needs_reindex && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => reindex.mutate(d.id)}
                        disabled={reindex.isPending && reindex.variables === d.id}
                      >
                        {reindex.isPending && reindex.variables === d.id ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-1 h-3 w-3" />
                        )}
                        Re-index
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("Delete this document?")) del.mutate(d.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
