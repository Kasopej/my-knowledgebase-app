"use client";

import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithApprovalResponses,
} from "ai";
import { ArrowUp, Paperclip, Square, X } from "lucide-react";
import { useRef, useState } from "react";
import { Message } from "@/components/message";
import type { ChatUIMessage } from "@/lib/ai/tools";
import { cn } from "@/lib/utils";

export function Chat() {
  const {
    messages,
    sendMessage,
    addToolApprovalResponse,
    status,
    stop,
    error,
    regenerate,
  } = useChat<ChatUIMessage>({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    // Auto-resubmit once the user has approved/denied every pending tool call.
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
  });

  const [input, setInput] = useState("");
  const [files, setFiles] = useState<FileList | undefined>();
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isLoading = status === "submitted" || status === "streaming";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() && !files) return;
    sendMessage({ text: input, files });
    setInput("");
    setFiles(undefined);
    if (fileRef.current) fileRef.current.value = "";
    queueMicrotask(() => {
      scrollRef.current?.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-3">
        <div>
          <h1 className="text-sm font-semibold text-zinc-900">
            AI Chatbot
          </h1>
          <p className="text-xs text-zinc-500">
            Streaming · Tools · Multi-step · RAG · Human approval
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span
            className={cn(
              "inline-block h-2 w-2 rounded-full",
              status === "ready" && "bg-emerald-500",
              isLoading && "bg-amber-500 streaming-dot",
              status === "error" && "bg-rose-500"
            )}
          />
          {status}
        </div>
      </header>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="scrollbar-thin flex-1 overflow-y-auto px-4 py-6 md:px-8"
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-6">
          {messages.length === 0 && <EmptyState />}

          {messages.map((m) => (
            <Message
              key={m.id}
              message={m}
              onApproval={addToolApprovalResponse}
            />
          ))}

          {error && (
            <div className="flex items-center gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <span className="flex-1">Something went wrong.</span>
              <button
                onClick={() => regenerate()}
                className="rounded-md bg-rose-600 px-3 py-1 text-xs font-medium text-white hover:bg-rose-700"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-zinc-200 bg-white px-4 py-4 md:px-8">
        <form
          onSubmit={handleSubmit}
          className="mx-auto flex max-w-3xl flex-col gap-2"
        >
          {files && files.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {Array.from(files).map((f, i) => (
                <span
                  key={i}
                  className="flex items-center gap-2 rounded-md bg-zinc-100 px-2 py-1 text-xs text-zinc-700"
                >
                  {f.name}
                  <button
                    type="button"
                    onClick={() => {
                      setFiles(undefined);
                      if (fileRef.current) fileRef.current.value = "";
                    }}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2 rounded-2xl border border-zinc-300 bg-white p-2 shadow-sm focus-within:border-zinc-400">
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/*,application/pdf,text/*"
              onChange={(e) => setFiles(e.target.files ?? undefined)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="rounded-md p-2 text-zinc-500 hover:bg-zinc-100"
              aria-label="Attach files"
            >
              <Paperclip className="h-4 w-4" />
            </button>

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Ask anything. Attach an image, or upload docs in the sidebar for RAG…"
              rows={1}
              className="max-h-32 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-zinc-400"
            />

            {isLoading ? (
              <button
                type="button"
                onClick={() => stop()}
                className="rounded-lg bg-zinc-900 p-2 text-white hover:bg-zinc-800"
                aria-label="Stop"
              >
                <Square className="h-4 w-4" fill="currentColor" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim() && !files}
                className="rounded-lg bg-zinc-900 p-2 text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Send"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            )}
          </div>
          <p className="text-center text-[10px] text-zinc-400">
            Press Enter to send · Shift+Enter for newline
          </p>
        </form>
      </div>
    </div>
  );
}

function EmptyState() {
  const examples = [
    "What's in my uploaded docs about pricing?",
    "What's the weather in Mumbai?",
    "Email naman@gmail.com saying I'll be late tomorrow.",
    "Summarise this image",
  ];
  return (
    <div className="mt-12 flex flex-col items-center text-center">
      <h2 className="mt-4 text-2xl font-semibold text-zinc-900">
        Ask anything, or pick an example
      </h2>
      <p className="mt-2 max-w-md text-sm text-zinc-500">
        Upload docs in the sidebar to enable retrieval. Try asking the model
        to send an email — it&apos;ll ask for your approval first.
      </p>
      <div className="mt-6 grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
        {examples.map((e) => (
          <div
            key={e}
            className="rounded-lg border border-zinc-200 bg-white p-3 text-left text-xs text-zinc-600"
          >
            {e}
          </div>
        ))}
      </div>
    </div>
  );
}
