"use client";

import {
  AlertTriangle,
  Check,
  CloudSun,
  FileSearch,
  Loader2,
  Mail,
  X,
} from "lucide-react";
import { useChat } from "@ai-sdk/react";
import type { ChatUIMessage } from "@/lib/ai/tools";
import { cn } from "@/lib/utils";

type Props = {
  message: ChatUIMessage;
  onApproval: ReturnType<typeof useChat<ChatUIMessage>>["addToolApprovalResponse"];
};

export function Message({ message, onApproval }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3", isUser && "justify-end")}>
      {!isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">
          AI
        </div>
      )}

      <div
        className={cn(
          "flex max-w-[85%] flex-col gap-2",
          isUser && "items-end"
        )}
      >
        {message.parts.map((part, i) => {
          switch (part.type) {
            case "text":
              return (
                <div
                  key={i}
                  className={cn(
                    "whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm leading-relaxed",
                    isUser
                      ? "bg-zinc-900 text-white"
                      : "bg-white text-zinc-900 ring-1 ring-zinc-200"
                  )}
                >
                  {part.text}
                </div>
              );

            case "file":
              if (part.mediaType?.startsWith("image/")) {
                return (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={part.url}
                    alt={part.filename ?? "attachment"}
                    className="max-w-xs rounded-lg ring-1 ring-zinc-200"
                  />
                );
              }
              return (
                <a
                  key={i}
                  href={part.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg bg-zinc-100 px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-200"
                >
                  📎 {part.filename ?? "file"}
                </a>
              );

            case "step-start":
              return i > 0 ? (
                <hr key={i} className="my-1 border-zinc-200" />
              ) : null;

            case "tool-searchKnowledgeBase":
              return (
                <ToolCard
                  key={part.toolCallId}
                  icon={<FileSearch className="h-3.5 w-3.5" />}
                  title="Searching knowledge base"
                  state={part.state}
                  errorText={
                    part.state === "output-error" ? part.errorText : undefined
                  }
                >
                  {part.state === "input-streaming" && (
                    <PendingRow label="Preparing query…" />
                  )}
                  {part.state === "input-available" && (
                    <PendingRow label={`Query: "${part.input.query}"`} />
                  )}
                  {part.state === "output-available" && (
                    <KbResults output={part.output} />
                  )}
                </ToolCard>
              );

            case "tool-getWeather":
              return (
                <ToolCard
                  key={part.toolCallId}
                  icon={<CloudSun className="h-3.5 w-3.5" />}
                  title="Checking weather"
                  state={part.state}
                  errorText={
                    part.state === "output-error" ? part.errorText : undefined
                  }
                >
                  {part.state === "input-available" && (
                    <PendingRow label={`City: ${part.input.location}`} />
                  )}
                  {part.state === "output-available" && (
                    <div className="text-xs text-zinc-700">
                      <span className="font-medium">{part.output.location}</span>:{" "}
                      {part.output.condition},{" "}
                      {part.output.temperature}°C, humidity{" "}
                      {part.output.humidity}
                    </div>
                  )}
                </ToolCard>
              );

            case "tool-sendEmail":
              return (
                <SendEmailToolPart
                  key={part.toolCallId}
                  part={part}
                  onApproval={onApproval}
                />
              );

            default:
              return null;
          }
        })}
      </div>

      {isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-semibold text-zinc-700">
          You
        </div>
      )}
    </div>
  );
}

/* ----------------------------- Shared bits ----------------------------- */

function ToolCard({
  icon,
  title,
  state,
  errorText,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  state: string;
  errorText?: string;
  children: React.ReactNode;
}) {
  const inProgress =
    state === "input-streaming" || state === "input-available";
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs">
      <div className="flex items-center gap-2 text-zinc-600">
        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-zinc-100">
          {inProgress ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : state === "output-error" ? (
            <AlertTriangle className="h-3 w-3 text-rose-600" />
          ) : state === "output-available" ? (
            <Check className="h-3 w-3 text-emerald-600" />
          ) : (
            icon
          )}
        </span>
        <span className="font-medium">{title}</span>
      </div>
      <div className="mt-2 pl-7">
        {errorText ? (
          <div className="text-rose-600">Error: {errorText}</div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

function PendingRow({ label }: { label: string }) {
  return <div className="text-zinc-500">{label}</div>;
}

function KbResults({
  output,
}: {
  output: {
    found: boolean;
    chunks: { source: string; similarity: number; content: string }[];
    message?: string;
  };
}) {
  if (!output.found) {
    return <div className="text-zinc-500">{output.message}</div>;
  }
  return (
    <div className="space-y-1.5">
      <div className="text-zinc-500">
        Found {output.chunks.length} relevant chunk
        {output.chunks.length === 1 ? "" : "s"}:
      </div>
      {output.chunks.map((c, i) => (
        <div
          key={i}
          className="rounded-md bg-zinc-50 px-2 py-1.5 text-[11px] text-zinc-700"
        >
          <div className="flex items-center justify-between text-zinc-500">
            <span className="font-mono">{c.source}</span>
            <span>sim {c.similarity}</span>
          </div>
          <div className="mt-0.5 line-clamp-2">{c.content}</div>
        </div>
      ))}
    </div>
  );
}

/* --------------------------- sendEmail w/ approval --------------------- */
// `part` here is the discriminated tool part for `sendEmail`.
function SendEmailToolPart({
  part,
  onApproval,
}: {
  part: Extract<
    ChatUIMessage["parts"][number],
    { type: "tool-sendEmail" }
  >;
  onApproval: ReturnType<typeof useChat<ChatUIMessage>>["addToolApprovalResponse"];
}) {
  const callId = part.toolCallId;

  return (
    <ToolCard
      icon={<Mail className="h-3.5 w-3.5" />}
      title="Send email"
      state={part.state}
      errorText={part.state === "output-error" ? part.errorText : undefined}
    >
      {part.state === "input-streaming" && (
        <PendingRow label="Drafting email…" />
      )}

      {part.state === "input-available" && (
        <div className="text-zinc-700">
          <EmailDraft
            to={part.input.address}
            subject={part.input.subject}
            body={part.input.body}
          />
          <PendingRow label="Waiting on server…" />
        </div>
      )}

      {part.state === "approval-requested" && (
        <div className="space-y-2">
          <EmailDraft
            to={part.input.address}
            subject={part.input.subject}
            body={part.input.body}
          />
          <div className="rounded-md border border-amber-200 bg-amber-50 px-2 py-2 text-amber-800">
            <div className="font-medium">Approval required</div>
            <div>Allow the AI to send this email?</div>
            <div className="mt-2 flex gap-2">
              <button
                onClick={() =>
                  onApproval({ id: part.approval.id, approved: true })
                }
                className="flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-emerald-700"
              >
                <Check className="h-3 w-3" /> Approve
              </button>
              <button
                onClick={() =>
                  onApproval({ id: part.approval.id, approved: false })
                }
                className="flex items-center gap-1 rounded-md bg-zinc-200 px-2.5 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-300"
              >
                <X className="h-3 w-3" /> Deny
              </button>
            </div>
          </div>
        </div>
      )}

      {part.state === "output-available" && (
        <div className="space-y-1.5 text-zinc-700">
          <EmailDraft
            to={part.input.address}
            subject={part.input.subject}
            body={part.input.body}
          />
          <div className="text-emerald-700">
            ✓ Sent at{" "}
            {new Date(part.output.timestamp).toLocaleTimeString()}
          </div>
        </div>
      )}
    </ToolCard>
  );
}

function EmailDraft({
  to,
  subject,
  body,
}: {
  to: string;
  subject: string;
  body: string;
}) {
  return (
    <div className="space-y-0.5 rounded-md bg-zinc-50 px-2 py-1.5 text-[11px]">
      <div>
        <span className="text-zinc-500">To: </span>
        <span className="font-mono">{to}</span>
      </div>
      <div>
        <span className="text-zinc-500">Subject: </span>
        <span className="font-medium">{subject}</span>
      </div>
      <div className="mt-1 whitespace-pre-wrap text-zinc-700">{body}</div>
    </div>
  );
}
