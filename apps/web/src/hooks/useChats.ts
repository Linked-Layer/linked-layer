import { useCallback, useEffect, useRef, useState } from "react";
import { type Attachment, type RecallSource, streamAsk } from "@/lib/api";

export type MessageStatus = "streaming" | "done" | "error";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: RecallSource[];
  status?: MessageStatus;
  /** Names of files attached to a user message (for display). */
  files?: string[];
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
}

const KEY = "linked.chats.v1";

function uid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `id-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
  }
}

function load(): Conversation[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Conversation[];
  } catch {
    /* ignore */
  }
  return [];
}

/** Multi-conversation chat state for the standalone chat app (persisted to localStorage). */
export function useChats() {
  const [conversations, setConversations] = useState<Conversation[]>(() => load());
  const [activeId, setActiveId] = useState<string | null>(() => load()[0]?.id ?? null);
  const [streaming, setStreaming] = useState(false);

  const convRef = useRef(conversations);
  useEffect(() => {
    convRef.current = conversations;
    try {
      localStorage.setItem(KEY, JSON.stringify(conversations));
    } catch {
      /* quota / private mode — ignore */
    }
  }, [conversations]);

  const active = conversations.find((c) => c.id === activeId) ?? null;
  const totalAsked = conversations.reduce(
    (n, c) => n + c.messages.filter((m) => m.role === "user").length,
    0,
  );

  const newChat = useCallback(() => {
    const id = uid();
    setConversations((prev) => [{ id, title: "New chat", messages: [], createdAt: Date.now() }, ...prev]);
    setActiveId(id);
    return id;
  }, []);

  const selectChat = useCallback((id: string) => setActiveId(id), []);

  const deleteChat = useCallback(
    (id: string) => {
      setConversations((prev) => prev.filter((c) => c.id !== id));
      setActiveId((cur) => (cur === id ? null : cur));
    },
    [],
  );

  const ask = useCallback(
    async (question: string, attachments: Attachment[] = []) => {
      const q = question.trim();
      if ((!q && attachments.length === 0) || streaming) return;

      // Ensure an active conversation exists.
      let convId = activeId;
      if (!convId || !convRef.current.find((c) => c.id === convId)) {
        convId = uid();
        setConversations((prev) => [
          { id: convId!, title: "New chat", messages: [], createdAt: Date.now() },
          ...prev,
        ]);
        setActiveId(convId);
      }

      const conv = convRef.current.find((c) => c.id === convId);
      const history = (conv?.messages ?? [])
        .filter((m) => m.content.trim() && m.status !== "error")
        .map((m) => ({ role: m.role, content: m.content }))
        .slice(-8);

      const userMsg: ChatMessage = {
        id: uid(),
        role: "user",
        content: q,
        ...(attachments.length ? { files: attachments.map((a) => a.name) } : {}),
      };
      const aId = uid();
      const aMsg: ChatMessage = { id: aId, role: "assistant", content: "", status: "streaming" };

      setConversations((prev) =>
        prev.map((c) =>
          c.id === convId
            ? {
                ...c,
                title: c.messages.length === 0 ? q.slice(0, 48) : c.title,
                messages: [...c.messages, userMsg, aMsg],
              }
            : c,
        ),
      );
      setStreaming(true);

      const patch = (fn: (m: ChatMessage) => ChatMessage) =>
        setConversations((prev) =>
          prev.map((c) =>
            c.id === convId ? { ...c, messages: c.messages.map((m) => (m.id === aId ? fn(m) : m)) } : c,
          ),
        );

      try {
        await streamAsk(q || "(see attached files)", history, attachments, {
          onSources: (sources: RecallSource[]) => patch((m) => ({ ...m, sources })),
          onToken: (t) => patch((m) => ({ ...m, content: m.content + t })),
          onDone: () => patch((m) => (m.status === "streaming" ? { ...m, status: "done" } : m)),
          onError: (message) => patch((m) => ({ ...m, content: message, status: "error" })),
        });
      } catch (err) {
        patch((m) => ({ ...m, content: (err as Error).message, status: "error" }));
      }
      setStreaming(false);
    },
    [activeId, streaming],
  );

  return { conversations, active, activeId, streaming, totalAsked, newChat, selectChat, deleteChat, ask };
}
