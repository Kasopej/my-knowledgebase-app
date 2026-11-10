import { Chat } from "@/components/chat";
import { KnowledgeBase } from "@/components/knowledge-base";

export default function Page() {
  return (
    <div className="flex h-screen w-screen flex-col bg-zinc-50 md:flex-row">
      {/* Sidebar: knowledge base */}
      <aside className="flex h-1/3 w-full flex-col border-b border-zinc-200 bg-white md:h-full md:w-80 md:border-b-0 md:border-r">
        <KnowledgeBase />
      </aside>

      {/* Main: chat */}
      <main className="flex flex-1 flex-col overflow-hidden">
        <Chat />
      </main>
    </div>
  );
}
