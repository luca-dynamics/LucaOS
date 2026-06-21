import { useMemo, useState } from "react";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import type { OnboardingConversationProps } from "./OnboardingRuntimeAdapter";
import type { Message } from "../../types/conversation";

const conversationPrompts = [
  "How do you prefer that I communicate with you: direct and brief, balanced, or detailed?",
  "What is your primary role or focus right now?",
  "What should I help you with first, and should I be proactive or wait for specific requests?",
];

const createMessage = (id: string, role: Message["role"], content: string): Message => ({
  id,
  role,
  content,
  timestamp: new Date(),
});

export function OnboardingConversationSurface({
  mode,
  userName,
  theme,
  onBack,
  onComplete,
}: OnboardingConversationProps) {
  const openingMessage = useMemo(
    () =>
      createMessage(
        "opening",
        "luca",
        `Hi ${userName || "there"}, I’m Luca. Let’s set up how I should work with you. ${conversationPrompts[0]}`,
      ),
    [userName],
  );
  const [messages, setMessages] = useState<Message[]>([openingMessage]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const complete = answers.length === conversationPrompts.length;

  const submit = () => {
    const answer = input.trim();
    if (!answer || complete || isProcessing) return;

    const nextAnswers = [...answers, answer];
    setAnswers(nextAnswers);
    setInput("");
    setMessages((current) => [
      ...current,
      createMessage(`user-${nextAnswers.length}`, "user", answer),
    ]);
    setIsProcessing(true);

    window.setTimeout(() => {
      const nextPrompt = conversationPrompts[nextAnswers.length];
      setMessages((current) => [
        ...current,
        createMessage(
          `luca-${nextAnswers.length}`,
          "luca",
          nextPrompt
            ? `Understood. ${nextPrompt}`
            : "Calibration profile captured. I’m ready to configure your LucaOS session.",
        ),
      ]);
      setIsProcessing(false);
    }, 250);
  };

  return (
    <section
      className="flex h-full min-h-dvh w-full max-w-3xl flex-col overflow-hidden border glass-blur sm:min-h-0 sm:rounded-2xl"
      style={{
        borderColor: "var(--app-border-main)",
        backgroundColor: "var(--app-bg-tint)",
      }}
      aria-label="Luca conversational onboarding"
    >
      <header
        className="flex items-center justify-between gap-4 border-b px-4 py-3 sm:px-6"
        style={{ borderColor: "var(--app-border-main)" }}
      >
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="rounded-full border px-3 py-2 text-[10px] font-bold uppercase tracking-wider"
              style={{
                borderColor: "var(--app-border-main)",
                color: "var(--app-text-main)",
              }}
            >
              Back / Change mode
            </button>
          )}
          <div>
            <p
              className="text-[10px] font-bold uppercase tracking-[0.2em]"
              style={{ color: theme?.hex || "var(--app-primary)" }}
            >
              Personalization
            </p>
            <p className="mt-1 text-xs" style={{ color: "var(--app-text-muted)" }}>
              {mode === "voice" ? "Voice mode selected" : "Text mode selected"}
            </p>
          </div>
        </div>
        <span
          className="text-[10px] uppercase tracking-widest"
          style={{ color: "var(--app-text-muted)" }}
        >
          {Math.min(answers.length + 1, conversationPrompts.length)} / {conversationPrompts.length}
        </span>
      </header>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-5 sm:px-6">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} theme={theme} />
        ))}
        {isProcessing && <TypingIndicator />}
      </div>

      <footer
        className="shrink-0 border-t px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:p-6"
        style={{ borderColor: "var(--app-border-main)" }}
      >
        {!complete ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
            className="flex items-end gap-2 sm:gap-3"
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
              autoFocus={mode === "text"}
              placeholder="Type your response…"
              aria-label={mode === "voice" ? "Text fallback response" : "Your response"}
              className="min-h-[3.5rem] min-w-0 flex-1 resize-none rounded-xl border bg-black/10 px-4 py-3 text-base outline-none sm:text-sm"
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
