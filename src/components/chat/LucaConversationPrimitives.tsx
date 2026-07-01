import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Icon } from "../ui/Icon";
import { mergeClassNames } from "../ui/luca/mergeClassNames";

type MessageTone = "user" | "luca" | "system";

type NavigationRailItem = {
  id: string;
  tone: MessageTone;
  label: string;
};

const escapeMessageSelectorId = (id: string) => {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(id);
  }
  return id.replace(/["\\]/g, "\\$&");
};

export function MessageScroller({
  children,
  anchorRef,
  anchorKey,
  className,
  latestLabel = "Jump to latest",
  restoreKey,
  restoreAnchorId,
  turnAnchorId,
}: {
  children: React.ReactNode;
  anchorRef?: React.RefObject<HTMLDivElement>;
  anchorKey?: unknown;
  className?: string;
  latestLabel?: string;
  restoreKey?: string;
  restoreAnchorId?: string;
  turnAnchorId?: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const isFollowingRef = useRef(true);
  const previousHeightRef = useRef(0);
  const previousAnchorKeyRef = useRef(anchorKey);
  const previousTurnAnchorIdRef = useRef(turnAnchorId);
  const hasRestoredRef = useRef(false);
  const [isFollowing, setIsFollowing] = useState(true);
  const [offscreenCount, setOffscreenCount] = useState(0);
  const [navigationItems, setNavigationItems] = useState<NavigationRailItem[]>([]);
  const [currentAnchorId, setCurrentAnchorId] = useState<string | null>(null);
  const [visibleMessageIds, setVisibleMessageIds] = useState<string[]>([]);

  const getStoredAnchorId = () => {
    if (!restoreKey || typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(`luca:chat-scroll:${restoreKey}`);
    } catch {
      return null;
    }
  };

  const setStoredAnchorId = (id: string | null) => {
    if (!restoreKey || !id || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(`luca:chat-scroll:${restoreKey}`, id);
    } catch {
      // Storage may be unavailable in restricted browser contexts.
    }
  };

  const getMessageElements = () => {
    const scroller = scrollerRef.current;
    if (!scroller) return [];

    return Array.from(
      scroller.querySelectorAll<HTMLElement>("[data-luca-message][id]"),
    );
  };

  const refreshNavigationItems = () => {
    setNavigationItems(
      getMessageElements().map((message, index) => ({
        id: message.id,
        tone: (message.dataset.lucaMessage as MessageTone | undefined) ?? "luca",
        label:
          message.dataset.lucaMessageLabel ||
          `${message.dataset.lucaMessage || "message"} ${index + 1}`,
      })),
    );
  };

  const refreshVisibility = () => {
    const scroller = scrollerRef.current;
    if (!scroller) return null;

    const scrollerRect = scroller.getBoundingClientRect();
    const visibleIds: string[] = [];

    const visible = getMessageElements().find((message) => {
      const rect = message.getBoundingClientRect();
      if (rect.bottom > scrollerRect.top && rect.top < scrollerRect.bottom) {
        visibleIds.push(message.id);
      }
      return rect.bottom > scrollerRect.top + 24;
    });

    const anchorId = visible?.id ?? null;
    setCurrentAnchorId(anchorId);
    setVisibleMessageIds(visibleIds);
    return anchorId;
  };

  const findTopVisibleMessageId = () => {
    return refreshVisibility();
  };

  const scrollToMessage = (
    id: string | null | undefined,
    options: { behavior?: ScrollBehavior; preserveContext?: boolean } = {},
  ) => {
    const scroller = scrollerRef.current;
    if (!scroller || !id) return false;

    const target = scroller.querySelector<HTMLElement>(
      `[data-luca-message][id="${escapeMessageSelectorId(id)}"]`,
    );
    if (!target) return false;

    const scrollerRect = scroller.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const contextOffset = options.preserveContext
      ? Math.min(140, scroller.clientHeight * 0.22)
      : 24;
    const top =
      targetRect.top - scrollerRect.top + scroller.scrollTop - contextOffset;

    scroller.scrollTo({
      top: Math.max(0, top),
      behavior: options.behavior ?? "auto",
    });
    return true;
  };

  const syncFollowState = () => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const distanceFromBottom =
      scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
    const nextIsFollowing = distanceFromBottom < 96;
    isFollowingRef.current = nextIsFollowing;
    setIsFollowing(nextIsFollowing);

    if (nextIsFollowing) setOffscreenCount(0);
    if (!nextIsFollowing) setStoredAnchorId(findTopVisibleMessageId());
    if (nextIsFollowing) refreshVisibility();
  };

  const pauseFollowing = () => {
    isFollowingRef.current = false;
    setIsFollowing(false);
    setStoredAnchorId(findTopVisibleMessageId());
  };

  const jumpToLatest = () => {
    isFollowingRef.current = true;
    setIsFollowing(true);
    setOffscreenCount(0);
    anchorRef?.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  };

  const jumpToRailItem = (id: string) => {
    pauseFollowing();
    if (scrollToMessage(id, { behavior: "smooth", preserveContext: true })) {
      setCurrentAnchorId(id);
      setStoredAnchorId(id);
    }
  };

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    syncFollowState();
    refreshNavigationItems();
    refreshVisibility();
    scroller.addEventListener("scroll", syncFollowState, { passive: true });
    return () => scroller.removeEventListener("scroll", syncFollowState);
  }, []);

  useLayoutEffect(() => {
    if (hasRestoredRef.current) return;
    const storedAnchorId = getStoredAnchorId();
    const targetAnchorId = storedAnchorId || restoreAnchorId;

    if (scrollToMessage(targetAnchorId, { preserveContext: true })) {
      isFollowingRef.current = false;
      setIsFollowing(false);
      hasRestoredRef.current = true;
      previousHeightRef.current = scrollerRef.current?.scrollHeight ?? 0;
      return;
    }

    if (restoreAnchorId) return;
    hasRestoredRef.current = true;
  }, [restoreAnchorId, restoreKey]);

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const currentHeight = scroller.scrollHeight;
    const heightDelta = currentHeight - previousHeightRef.current;
    const anchorChanged = previousAnchorKeyRef.current !== anchorKey;
    const turnAnchorChanged =
      Boolean(turnAnchorId) && previousTurnAnchorIdRef.current !== turnAnchorId;

    if (turnAnchorChanged) {
      scrollToMessage(turnAnchorId, { preserveContext: true });
      isFollowingRef.current = true;
      setIsFollowing(true);
      setOffscreenCount(0);
    } else if (isFollowingRef.current) {
      anchorRef?.current?.scrollIntoView({ block: "end" });
    } else if (heightDelta > 0) {
      scroller.scrollTop += heightDelta;
      if (anchorChanged) setOffscreenCount((count) => Math.min(count + 1, 99));
    }

    previousHeightRef.current = currentHeight;
    previousAnchorKeyRef.current = anchorKey;
    previousTurnAnchorIdRef.current = turnAnchorId;
    refreshNavigationItems();
    refreshVisibility();
  }, [anchorKey, anchorRef, turnAnchorId]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => {
      if (isFollowingRef.current) {
        anchorRef?.current?.scrollIntoView({ block: "end" });
        previousHeightRef.current = scroller.scrollHeight;
        return;
      }

      const nextHeight = scroller.scrollHeight;
      const heightDelta = nextHeight - previousHeightRef.current;
      if (heightDelta > 0) scroller.scrollTop += heightDelta;
      previousHeightRef.current = nextHeight;
      refreshNavigationItems();
      refreshVisibility();
    });

    observer.observe(contentRef.current ?? scroller);
    return () => observer.disconnect();
  }, [anchorRef]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollerRef}
        data-luca-message-scroller
        aria-live={isFollowing ? "polite" : "off"}
        aria-busy={offscreenCount > 0 && !isFollowing}
        className={mergeClassNames(
          "flex-1 min-h-0 overflow-y-auto scroll-smooth custom-scrollbar scroll-fade-y",
          className,
        )}
        onPointerDown={pauseFollowing}
        onKeyDown={pauseFollowing}
        onFocusCapture={pauseFollowing}
        onClickCapture={(event) => {
          if ((event.target as HTMLElement).closest("a")) pauseFollowing();
        }}
      >
        <div ref={contentRef} data-luca-message-scroller-content>
          {children}
        </div>
      </div>
      {!isFollowing && (
        <button
          type="button"
          onClick={jumpToLatest}
          className="absolute bottom-3 left-1/2 z-30 inline-flex -translate-x-1/2 items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold shadow-lg glass-blur shimmer shimmer-once shimmer-color-accent shimmer-spread-tight transition hover:scale-[1.02] active:scale-95"
          style={{
            borderColor: "var(--luca-border-subtle, var(--app-border-main))",
            backgroundColor: "var(--luca-surface-glass, var(--app-bg-tint))",
            color: "var(--luca-text-primary, var(--app-text-main))",
          }}
        >
          <Icon name="ArrowDown" size={13} variant="BoldDuotone" />
          {offscreenCount > 0 ? `${offscreenCount} new update${offscreenCount === 1 ? "" : "s"}` : latestLabel}
        </button>
      )}
      {navigationItems.length > 3 && (
        <nav
          aria-label="Conversation navigation"
          className="absolute left-2 top-4 bottom-16 z-20 hidden w-5 flex-col items-center justify-center gap-1 opacity-45 transition-opacity hover:opacity-100 md:flex"
        >
          {navigationItems.map((item) => {
            const isCurrent = item.id === currentAnchorId;
            const isVisible = visibleMessageIds.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => jumpToRailItem(item.id)}
                className="group/rail relative flex h-3 w-5 shrink-0 items-center justify-start outline-none"
                aria-current={isCurrent ? "location" : undefined}
                aria-label={`Jump to ${item.label}`}
              >
                <span
                  className="h-px w-2 shrink-0 rounded-full transition group-hover/rail:w-4 group-focus-visible/rail:w-4"
                  style={{
                    backgroundColor: isCurrent
                      ? "var(--luca-accent-primary)"
                      : isVisible
                        ? "var(--luca-text-secondary, var(--app-text-muted))"
                        : "var(--luca-border-strong, var(--app-border-main))",
                    boxShadow: isCurrent ? "0 0 8px var(--luca-accent-primary)" : undefined,
                    opacity: isVisible || isCurrent ? 1 : 0.55,
                  }}
                />
                <span
                  className="pointer-events-none absolute left-6 hidden max-w-[240px] truncate rounded-md border px-2 py-1 text-left text-[11px] font-medium shadow-lg glass-blur group-hover/rail:block group-focus-visible/rail:block"
                  style={{
                    borderColor: "var(--luca-border-subtle, var(--app-border-main))",
                    backgroundColor: "var(--luca-surface-glass, var(--app-bg-tint))",
                    color: "var(--luca-text-primary, var(--app-text-main))",
                  }}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}

export function Message({
  tone,
  children,
  className,
  id,
  label,
}: {
  tone: MessageTone;
  children: React.ReactNode;
  className?: string;
  id?: string;
  label?: string;
}) {
  return (
    <div
      id={id}
      data-luca-message={tone}
      data-luca-message-label={label}
      tabIndex={-1}
      className={mergeClassNames(
        "group relative flex w-full scroll-mt-28 animate-in duration-300",
        tone === "user"
          ? "justify-end slide-in-from-right-2"
          : tone === "system"
            ? "justify-center zoom-in"
            : "justify-start slide-in-from-left-2",
        className,
      )}
    >
      {id && (
        <a
          href={`#${id}`}
          aria-label="Link to this message"
          title="Link to this message"
          className="absolute -top-2 right-2 z-20 rounded-full border px-2 py-1 text-[10px] font-semibold opacity-0 glass-blur transition focus:opacity-100 group-hover:opacity-100"
          style={{
            borderColor: "var(--luca-border-subtle, var(--app-border-main))",
            backgroundColor: "var(--luca-surface-glass, var(--app-bg-tint))",
            color: "var(--luca-text-secondary, var(--app-text-muted))",
          }}
        >
          <Icon name="Link" size={10} variant="BoldDuotone" />
        </a>
      )}
      {children}
    </div>
  );
}

export function Bubble({
  tone,
  children,
  className,
  style,
}: {
  tone: MessageTone;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      data-luca-bubble={tone}
      className={mergeClassNames(
        "relative overflow-hidden border glass-blur",
        tone === "user"
          ? "rounded-2xl rounded-tr-sm px-4 py-3"
          : tone === "system"
            ? "rounded-xl px-4 py-2"
            : "rounded-2xl rounded-tl-sm px-4 py-3",
        className,
      )}
      style={{
        borderColor: "var(--app-border-main, rgba(255,255,255,0.1))",
        backgroundColor:
          tone === "luca"
            ? "var(--app-bg-tint, rgba(255,255,255,0.02))"
            : "var(--app-bg-tint, rgba(255,255,255,0.05))",
        color: "var(--app-text-main, #ffffff)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Attachment({
  src,
  alt,
  prunedLabel,
  className,
}: {
  src?: string | null;
  alt: string;
  prunedLabel?: string;
  className?: string;
}) {
  return (
    <div
      data-luca-attachment
      className={mergeClassNames(
        "mb-3 overflow-hidden rounded-xl border border-white/10 bg-black/20 shadow-lg",
        className,
      )}
    >
      {src ? (
        <img src={src} alt={alt} className="max-h-80 w-auto max-w-full object-contain bg-black/40" />
      ) : (
        <div className="flex items-center gap-2 p-3 text-xs text-slate-500">
          <Icon name="Image" size={14} variant="BoldDuotone" />
          {prunedLabel || "Attachment unavailable"}
        </div>
      )}
    </div>
  );
}

export function Marker({
  label,
  icon = "Sparkles",
  color,
  className,
}: {
  label: string;
  icon?: string;
  color?: string;
  className?: string;
}) {
  return (
    <div
      data-luca-marker
      className={mergeClassNames(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em]",
        className,
      )}
      style={{
        borderColor: "var(--app-border-main, rgba(255,255,255,0.1))",
        backgroundColor: "var(--app-bg-tint, rgba(255,255,255,0.04))",
        color: color || "var(--app-text-muted, #94a3b8)",
      }}
    >
      <Icon name={icon} size={11} variant="BoldDuotone" />
      <span>{label}</span>
    </div>
  );
}

export function StreamingMarker({
  color,
  label = "Generating response",
}: {
  color: string;
  label?: string;
}) {
  return (
    <Message tone="luca" className="mb-4">
      <Bubble tone="luca" className="flex items-center gap-3 px-3 py-2">
        <span className="flex items-center gap-1 shimmer shimmer-color-accent shimmer-duration-slow rounded-full px-1 py-0.5">
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              className="h-1.5 w-1.5 rounded-full animate-bounce"
              style={{
                backgroundColor: color,
                animationDelay: `${index * 90}ms`,
              }}
            />
          ))}
        </span>
        <span className="text-xs font-medium text-[var(--app-text-muted,#94a3b8)]">
          {label}
        </span>
      </Bubble>
    </Message>
  );
}
