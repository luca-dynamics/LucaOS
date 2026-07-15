import { useEffect, type RefObject } from "react";

export const LUCA_LAYER = {
  base: 0,
  panel: 100,
  popover: 300,
  modal: 500,
  critical: 700,
  system: 900,
} as const;

export type LucaLayer = keyof typeof LUCA_LAYER;

export const lucaLayerStyle = (layer: LucaLayer) => ({
  zIndex: LUCA_LAYER[layer],
});

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

const modalStack: symbol[] = [];
let bodyLockCount = 0;
let previousBodyOverflow = "";

function visibleFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) =>
      !element.hidden &&
      element.getAttribute("aria-hidden") !== "true" &&
      element.getClientRects().length > 0,
  );
}

export interface LucaModalLayerOptions {
  open?: boolean;
  containerRef: RefObject<HTMLElement>;
  initialFocusRef?: RefObject<HTMLElement>;
  returnFocusRef?: RefObject<HTMLElement>;
  onRequestClose?: () => void;
  closeOnEscape?: boolean;
  lockBodyScroll?: boolean;
}

/** Shared keyboard, focus, and scroll contract for Luca modal surfaces. */
export function useLucaModalLayer({
  open = true,
  containerRef,
  initialFocusRef,
  returnFocusRef,
  onRequestClose,
  closeOnEscape = true,
  lockBodyScroll = true,
}: LucaModalLayerOptions): void {
  useEffect(() => {
    if (!open || typeof document === "undefined") return;

    const token = Symbol("luca-modal-layer");
    const previouslyFocused = document.activeElement as HTMLElement | null;
    modalStack.push(token);

    if (lockBodyScroll) {
      if (bodyLockCount === 0) {
        previousBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
      }
      bodyLockCount += 1;
    }

    const focusFrame = window.requestAnimationFrame(() => {
      const container = containerRef.current;
      if (!container) return;
      const target =
        initialFocusRef?.current ??
        container.querySelector<HTMLElement>("[data-luca-autofocus]") ??
        visibleFocusableElements(container)[0] ??
        container;
      target.focus({ preventScroll: true });
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (modalStack[modalStack.length - 1] !== token) return;
      const container = containerRef.current;
      if (!container) return;

      if (event.key === "Escape" && closeOnEscape && onRequestClose) {
        event.preventDefault();
        event.stopPropagation();
        onRequestClose();
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = visibleFocusableElements(container);
      if (focusable.length === 0) {
        event.preventDefault();
        container.focus({ preventScroll: true });
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !container.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", onKeyDown, true);
      const stackIndex = modalStack.lastIndexOf(token);
      if (stackIndex >= 0) modalStack.splice(stackIndex, 1);

      if (lockBodyScroll) {
        bodyLockCount = Math.max(0, bodyLockCount - 1);
        if (bodyLockCount === 0) document.body.style.overflow = previousBodyOverflow;
      }

      const returnTarget = returnFocusRef?.current ?? previouslyFocused;
      if (returnTarget?.isConnected) returnTarget.focus({ preventScroll: true });
    };
  }, [
    closeOnEscape,
    containerRef,
    initialFocusRef,
    lockBodyScroll,
    onRequestClose,
    open,
    returnFocusRef,
  ]);
}

export interface LucaDismissableLayerOptions {
  open?: boolean;
  containerRef: RefObject<HTMLElement>;
  triggerRef?: RefObject<HTMLElement>;
  onRequestClose?: () => void;
}

/** Escape and outside-pointer behavior for non-modal popovers. */
export function useLucaDismissableLayer({
  open = true,
  containerRef,
  triggerRef,
  onRequestClose,
}: LucaDismissableLayerOptions): void {
  useEffect(() => {
    if (!open || !onRequestClose || typeof document === "undefined") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onRequestClose();
      triggerRef?.current?.focus({ preventScroll: true });
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current?.contains(target) ||
        triggerRef?.current?.contains(target)
      ) return;
      onRequestClose();
    };
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [containerRef, onRequestClose, open, triggerRef]);
}
