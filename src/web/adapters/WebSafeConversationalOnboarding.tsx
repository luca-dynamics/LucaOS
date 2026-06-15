import { useMemo, useState } from "react";
import type { OnboardingConversationProps } from "../../components/Onboarding/OnboardingRuntimeAdapter";

interface BrowserConversationMessage {
  id: string;
  role: "luca" | "user";
  content: string;
}

function BrowserMessageBubble({
  message,
  accent,
}: {
  message: BrowserConversationMessage;
  accent: string;
}) {
  const isLuca = message.role === "luca";
  return (
    <div className={`flex ${isLuca ? "justify-start" : "justify-end"}`}>
      <div
        className="max-w-[85%] rounded-2xl border p-4 text-sm"
        style={{
          color: "var(--app-text-main)",
          borderColor: isLuca ? "var(--app-border-main)" : `${accent}55`,
          backgroundColor: isLuca ? "var(--app-bg-tint)" : `${accent}1a`,
        }}
      >
        <p
          className="mb-2 text-xs font-bold uppercase tracking-wider"
          style={{ color: isLuca ? "var(--app-text-muted)" : accent }}
        >
          {isLuca ? "Luca" : "You"}
        </p>
        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
      </div>
    </div>
  );
}

function BrowserTypingIndicator() {
  return (
    <div
      className="w-fit rounded-2xl border px-5 py-3 text-xs"
      style={{
        color: "var(--app-text-muted)",
        borderColor: "var(--app-border-main)",
        backgroundColor: "var(--app-bg-tint)",
      }}
    >
      Luca is typing...
    </div>
  );
}

const prompts = [
  "How do you prefer that I communicate with you: direct and brief, balanced, or detailed?",
  "What is your primary role or focus right now?",
  "What should I help you with first, and should I be proactive or wait for specific requests?",
];

export function WebSafeConversationalOnboarding({
  mode,
  userName,
  theme,
  onBack,
  onComplete,
}: OnboardingConversationProps) {
  const opening = useMemo<BrowserConversationMessage>(
    () => ({
      id: "opening",
      role: "luca",
      content: `Identity Link Established. I am LUCA, your autonomous AI partner. It’s a pleasure to meet you, ${userName || "Operator"}. ${prompts[0]}`,
    }),
    [userName],
  );
  const [messages, setMessages] = useState<BrowserConversationMessage[]>([
    opening,
  ]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const complete = answers.length === prompts.length;

  const submit = () => {
    const answer = input.trim();
    if (!answer || complete || isProcessing) return;

    const nextAnswers = [...answers, answer];
    const userMessage: BrowserConversationMessage = {
      id: `user-${nextAnswers.length}`,
      role: "user",
      content: answer,
    };
    setAnswers(nextAnswers);
    setInput("");
    setMessages((current) => [...current, userMessage]);
    setIsProcessing(true);

    window.setTimeout(() => {
      const nextPrompt = prompts[nextAnswers.length];
      const content = nextPrompt
        ? `Understood. ${nextPrompt}`
        : "Calibration profile captured. I’m ready to configure your LucaOS session.";
      setMessages((current) => [
        ...current,
        {
          id: `luca-${nextAnswers.length}`,
          role: "luca",
          content,
        },
      ]);
      setIsProcessing(false);
    }, 250);
  };

  return (
    <section
      className="flex h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl border glass-blur"
      style={{
        borderColor: "var(--app-border-main)",
        backgroundColor: "var(--app-bg-tint)",
      }}
    >
      <header
        className="flex items-center justify-between gap-4 border-b px-4 py-3 sm:px-6"
        style={{ borderColor: "var(--app-border-main)" }}
      >
        <div>
          <p
            className="text-[10px] font-bold uppercase tracking-[0.2em]"
            style={{ color: theme?.hex || "var(--app-primary)" }}
          >
            Operator calibration
          </p>
          <p
            className="mt-1 text-xs"
            style={{ color: "var(--app-text-muted)" }}
          >
            {mode === "voice"
              ? "Voice selected · browser microphone ready · text remains available"
              : "Chat selected · browser-safe conversation"}
          </p>
        </div>
        <span
          className="text-[10px] uppercase tracking-widest"
          style={{ color: "var(--app-text-muted)" }}
        >
          {Math.min(answers.length + 1, prompts.length)} / {prompts.length}
        </span>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-5 sm:px-6">
        {messages.map((message) => (
          <BrowserMessageBubble
            key={message.id}
            message={message}
            accent={theme?.hex || "var(--app-primary)"}
          />
        ))}
        {isProcessing && <BrowserTypingIndicator />}
      </div>

      <footer
        className="border-t p-4 sm:p-6"
        style={{ borderColor: "var(--app-border-main)" }}
      >
        {!complete ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
            className="flex items-end gap-3"
          >
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submit();
                }
              }}
              rows={2}
              autoFocus
              placeholder={
                mode === "voice"
                  ? "Speak, or type your response…"
                  : "Type your response…"
              }
              className="min-h-[3rem] flex-1 resize-none rounded-xl border bg-black/10 px-4 py-3 text-sm outline-none"
              style={{
                color: "var(--app-text-main)",
                borderColor: "var(--app-border-main)",
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || isProcessing}
              className="rounded-xl border px-5 py-3 text-xs font-bold uppercase tracking-wider disabled:opacity-40"
              style={{
                color: "var(--app-text-main)",
                borderColor: theme?.hex || "var(--app-primary)",
                backgroundColor: "var(--app-bg-tint)",
              }}
            >
              Send
            </button>
          </form>
        ) : (
          <div className="flex flex-wrap justify-end gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="rounded-lg border px-5 py-3 text-xs uppercase tracking-wider"
                style={{
                  color: "var(--app-text-muted)",
                  borderColor: "var(--app-border-main)",
                }}
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={() =>
                onComplete({
                  identity: { name: userName },
                  personality: { preferences: answers },
                  assistantPreferences: {
                    detailLevel: answers[0]?.toLowerCase().includes("detail")
                      ? "verbose"
                      : answers[0]?.toLowerCase().includes("brief")
                        ? "minimal"
                        : "balanced",
                    helpStyle: answers[2]?.toLowerCase().includes("wait")
                      ? "reactive"
                      : "proactive",
                  },
                  workContext: { profession: answers[1] },
                })
              }
              className="rounded-lg border px-5 py-3 text-xs font-bold uppercase tracking-wider"
              style={{
                color: "var(--app-text-main)",
                borderColor: theme?.hex || "var(--app-primary)",
                backgroundColor: "var(--app-bg-tint)",
              }}
            >
              Continue to calibration
            </button>
          </div>
        )}
      </footer>
    </section>
  );
}
