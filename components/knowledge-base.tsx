"use client";

import { FileText, Loader2, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type Doc = {
  id: string;
  name: string;
  chunkCount: number;
  createdAt: string;
};

export function KnowledgeBase() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/rag/documents");
    if (res.ok) {
      const data = (await res.json()) as Doc[];
      setDocs(data);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch("/api/rag/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");

      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/rag/documents/${id}`, { method: "DELETE" });
    refresh();
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-zinc-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-900">
          Knowledge Base
        </h2>
        <p className="text-xs text-zinc-500">
          Upload .txt or .md files to enable RAG.
        </p>
      </div>

      <div className="border-b border-zinc-200 p-4">
        <input
          ref={inputRef}
          type="file"
          accept=".txt,.md,text/plain,text/markdown"
          onChange={handleUpload}
          disabled={uploading}
          className="hidden"
        />
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-zinc-300 bg-zinc-50 px-3 py-3 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Embedding…
            </>
          ) : (
            <>
              <Upload className="h-3.5 w-3.5" />
              Upload document
            </>
          )}
        </button>
        {error && (
          <p className="mt-2 text-[11px] text-rose-600">{error}</p>
        )}
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto p-2">
        {docs.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-zinc-400">
            No documents yet.
          </div>
        ) : (
          <ul className="space-y-1">
            {docs.map((d) => (
              <li
                key={d.id}
                className="group flex items-start gap-2 rounded-md px-2 py-2 hover:bg-zinc-50"
              >
                <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium text-zinc-800">
                    {d.name}
                  </div>
                  <div className="text-[10px] text-zinc-500">
                    {d.chunkCount} chunk{d.chunkCount === 1 ? "" : "s"}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(d.id)}
                  className="rounded p-1 text-zinc-400 opacity-0 transition group-hover:opacity-100 hover:bg-zinc-200 hover:text-rose-600"
                  aria-label="Delete"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-zinc-200 p-3 text-[10px] text-zinc-400">
        Embeddings: text-embedding-3-small · Chat: gpt-4o-mini
      </div>
    </div>
  );
}
