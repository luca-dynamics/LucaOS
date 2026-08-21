// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { LucaDialog } from "./LucaDialog";
import {
  LucaMenu,
  LucaMenuContent,
  LucaMenuItem,
  LucaMenuSub,
  LucaMenuSubContent,
  LucaMenuSubTrigger,
  LucaMenuTrigger,
} from "./LucaMenu";

/**
 * These are rendered-behavior assertions, not source greps, because the whole
 * point of the primitive is the behavior seven hand-rolled menus did not have:
 * focus that actually moves, arrow/Home/End/typeahead traversal, a submenu you
 * can open from the keyboard, a portal, and one owner of Escape. A source grep
 * could pass while every one of those was broken.
 */

/** Floating UI observes the anchor; jsdom has no ResizeObserver. */
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  if (!("ResizeObserver" in globalThis)) {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverStub;
  }
});

afterEach(() => cleanup());

const Fixture: React.FC = () => (
  <LucaMenu>
    <LucaMenuTrigger>
      <button type="button">Menu</button>
    </LucaMenuTrigger>
    <LucaMenuContent aria-label="Application menu" side="bottom" align="start" sideOffset={6}>
      <LucaMenuItem asChild>
        <button type="button">New session</button>
      </LucaMenuItem>
      <LucaMenuSub>
        <LucaMenuSubTrigger asChild>
          <button type="button">Edit</button>
        </LucaMenuSubTrigger>
        <LucaMenuSubContent sideOffset={4}>
          <LucaMenuItem asChild>
            <button type="button">Undo</button>
          </LucaMenuItem>
          <LucaMenuItem asChild>
            <button type="button">Redo</button>
          </LucaMenuItem>
        </LucaMenuSubContent>
      </LucaMenuSub>
      <LucaMenuItem asChild>
        <button type="button">Window</button>
      </LucaMenuItem>
    </LucaMenuContent>
  </LucaMenu>
);

const active = () => document.activeElement?.textContent ?? null;
const press = (key: string) => fireEvent.keyDown(document.activeElement ?? document.body, { key });

/** ArrowDown on the trigger opens the menu and hands focus to the first item. */
async function openWithKeyboard(trigger: HTMLElement): Promise<void> {
  trigger.focus();
  fireEvent.keyDown(trigger, { key: "ArrowDown" });
  await waitFor(() => expect(active()).toBe("New session"));
}

describe("LucaMenu keyboard behavior", () => {
  it("opens on ArrowDown and moves focus into the menu", async () => {
    const view = render(<Fixture />);
    const trigger = view.getByText("Menu");

    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await openWithKeyboard(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("travels with arrows, jumps with Home/End, and matches on typeahead", async () => {
    const view = render(<Fixture />);
    await openWithKeyboard(view.getByText("Menu"));

    press("ArrowDown");
    await waitFor(() => expect(active()).toBe("Edit"));

    press("End");
    await waitFor(() => expect(active()).toBe("Window"));

    press("Home");
    await waitFor(() => expect(active()).toBe("New session"));

    press("e");
    await waitFor(() => expect(active()).toBe("Edit"));
  });

  it("opens a submenu with ArrowRight and closes it with ArrowLeft", async () => {
    const view = render(<Fixture />);
    await openWithKeyboard(view.getByText("Menu"));

    press("ArrowDown");
    await waitFor(() => expect(active()).toBe("Edit"));
    const subTrigger = document.activeElement as HTMLElement;
    expect(subTrigger).toHaveAttribute("aria-haspopup", "menu");
    expect(subTrigger).toHaveAttribute("aria-expanded", "false");

    press("ArrowRight");
    await waitFor(() => expect(active()).toBe("Undo"));
    expect(subTrigger).toHaveAttribute("aria-expanded", "true");

    press("ArrowLeft");
    await waitFor(() => expect(active()).toBe("Edit"));
    expect(document.body.textContent).not.toContain("Undo");
  });

  it("runs an item on Enter and closes, returning focus to the trigger", async () => {
    const onSelect = vi.fn();
    const view = render(
      <LucaMenu>
        <LucaMenuTrigger>
          <button type="button">Menu</button>
        </LucaMenuTrigger>
        <LucaMenuContent aria-label="Application menu" side="bottom" align="start">
          <LucaMenuItem asChild onSelect={onSelect}>
            <button type="button">New session</button>
          </LucaMenuItem>
        </LucaMenuContent>
      </LucaMenu>,
    );
    const trigger = view.getByText("Menu");
    await openWithKeyboard(trigger);

    press("Enter");
    await waitFor(() => expect(onSelect).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("closes on Escape and restores focus to the trigger", async () => {
    const view = render(<Fixture />);
    const trigger = view.getByText("Menu");
    await openWithKeyboard(trigger);

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(trigger).toHaveAttribute("aria-expanded", "false"));
    expect(document.activeElement).toBe(trigger);
  });
});

describe("LucaMenu integration with the Luca overlay stack", () => {
  it("portals the content out of its ancestors and carries the popover layer", async () => {
    const view = render(
      <div style={{ overflow: "hidden" }}>
        <Fixture />
      </div>,
    );
    await openWithKeyboard(view.getByText("Menu"));

    const content = document.querySelector<HTMLElement>("[data-radix-menu-content]");
    expect(content).not.toBeNull();
    // Not clipped by the ancestor `overflow: hidden`, and not trapped in its
    // stacking context: the content is a child of body, not of the trigger tree.
    expect(view.container.contains(content)).toBe(false);
    expect(document.body.contains(content)).toBe(true);

    // 300 is LUCA_LAYER.popover. The menus this replaced used raw 60/70/80, all
    // below LUCA_LAYER.panel — Radix copies the content's z-index onto the
    // positioned wrapper, which is the element that actually has to win.
    expect(content?.style.zIndex).toBe("300");
    const wrapper = content?.closest<HTMLElement>("[data-radix-popper-content-wrapper]");
    expect(wrapper?.style.zIndex).toBe("300");
  });

  it("consumes Escape itself when it is open on top of a LucaDialog", async () => {
    const onRequestClose = vi.fn();
    const view = render(
      <>
        <LucaDialog modal aria-label="Behind" onRequestClose={onRequestClose}>
          <button type="button">Continue</button>
        </LucaDialog>
        <Fixture />
      </>,
    );
    await waitFor(() => expect(document.body.style.overflow).toBe("hidden"));
    // Let the dialog's own initial focus land before opening the menu. It is
    // scheduled on a frame, and a menu that opens inside that window would be
    // dismissed by the dialog stealing focus — which is the sequence a user
    // never produces, and would test the wrong thing. (In jsdom the dialog
    // lands on its own container: `getClientRects()` is always empty here, so
    // useLucaModalLayer finds no visible child to focus.)
    await waitFor(() => expect(document.activeElement).toBe(view.getByRole("dialog")));

    const trigger = view.getByText("Menu");
    await openWithKeyboard(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(trigger).toHaveAttribute("aria-expanded", "false"));
    // The dialog registered its capture-phase listener first, so without the
    // shared modal stack it would have won and closed the wrong layer.
    expect(onRequestClose).not.toHaveBeenCalled();

    // And once the menu is gone the dialog owns Escape again.
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onRequestClose).toHaveBeenCalledTimes(1);
  });
});
