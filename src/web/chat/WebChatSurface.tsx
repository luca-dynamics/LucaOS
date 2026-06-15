import { useMemo, useState, type FormEvent } from "react";
import { Icon } from "../../components/ui/Icon";
import {
  WEB_CHAT_RUNTIME_UNAVAILABLE,
  webChatRuntime,
  type WebChatMessage,
  type WebChatRuntime,
} from "./webChatRuntime";

const welcomeMessage = (): WebChatMessage => ({
  id: "web-luca-welcome",
  role: "system",
  content:
    "LucaOS is running in browser-safe mode. Chat requests stay behind the WebBridge runtime adapter.",
  timestamp: Date.now(),
});

interface WebChatSurfaceProps {
  runtime?: WebChatRuntime;
}

export function WebChatSurface({
  runtime = webChatRuntime,
}: WebChatSurfaceProps) {
  const initialMessages = useMemo(() => [welcomeMessage()], []);
  const [messages, setMessages] = useState<WebChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async (event: FormEvent) => {
    event.preventDefault();
    const text = input.trim();
    if (!text || pending) return;

    const userMessage: WebChatMessage = {
      id: `web-user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: Date.now(),
    };
    const conversation = [...messages, userMessage];
    setMessages(conversation);
    setInput("");
    setError(null);
    setPending(true);

    try {
      const response = await runtime.sendMessage({
        messages: conversation,
        text,
        mode: "chat",
      });
      setMessages((current) => [...current, response]);
    } catch {
      setError(
        "The browser-safe chat adapter could not complete this request. No desktop or provider runtime was invoked.",
      );
    } finally {
      setPending(false);
    }
  };

  return (
    <section
      aria-label="LucaOS web chat"
      className="flex h-full min-h-0 flex-col"
    >
      <header className="flex items-center justify-between border-b border-[var(--app-border-main)] px-5 py-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--app-primary)]">
            Luca workspace
          </p>
          <h2 className="mt-1 text-lg font-semibold">Chat</h2>
        </div>
        <span className="rounded-full border border-[var(--app-border-main)] px-3 py-1 text-[10px] uppercase tracking-widest text-[var(--app-text-muted)]">
          Browser-safe
        </span>
      </header>

      <div
        aria-live="polite"
        className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-6"
      >
        {messages.map((message) => (
          <article
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className="max-w-[85%] rounded-2xl border px-4 py-3 text-sm leading-6"
              style={{
                borderColor: "var(--app-border-main)",
                color: "var(--app-text-main)",
                background:
                  message.role === "user"
                    ? "var(--luca-accent-soft, var(--app-bg-tint))"
                    : "var(--luca-surface-glass, var(--app-bg-tint))",
              }}
            >
              <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--app-text-muted)]">
                {message.role === "user" ? "You" : "LucaOS"}
              </p>
              <p>{message.content}</p>
            </div>
          </article>
        ))}
        {pending && (
          <div role="status" className="flex items-center gap-2 text-sm text-[var(--app-text-muted)]">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--app-primary)]" />
            LucaOS runtime adapter is processing…
          </div>
        )}
        {error && (
          <p role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </p>
        )}
      </div>

      <div className="border-t border-[var(--app-border-main)] p-4">
        <p className="mb-3 text-xs text-[var(--app-text-muted)]">
          {WEB_CHAT_RUNTIME_UNAVAILABLE}
        </p>
        <form onSubmit={send} className="flex items-end gap-3">
          <label className="sr-only" htmlFor="web-chat-input">
            Message LucaOS
          </label>
          <textarea
            id="web-chat-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            rows={2}
            placeholder="Message LucaOS…"
            className="min-h-[48px] flex-1 resize-none rounded-xl border bg-transparent px-4 py-3 text-sm outline-none focus:ring-2"
            style={{
              color: "var(--app-text-main)",
              borderColor: "var(--app-border-main)",
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || pending}
            aria-label="Send message"
            className="flex h-12 w-12 items-center justify-center rounded-xl border disabled:cursor-not-allowed disabled:opacity-40"
            style={{
              color: "var(--app-text-main)",
              borderColor: "var(--app-primary)",
              background: "var(--luca-accent-soft, var(--app-bg-tint))",
            }}
          >
            <Icon name="Send" size={18} color="currentColor" />
          </button>
        </form>
      </div>
    </section>
  );
}
