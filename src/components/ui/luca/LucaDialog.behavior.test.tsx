// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LucaDialog } from "./LucaDialog";

afterEach(() => cleanup());

describe("LucaDialog modal behavior", () => {
  it("locks page scroll, handles Escape, and restores the previous focus", async () => {
    const onRequestClose = vi.fn();
    const trigger = document.createElement("button");
    document.body.appendChild(trigger);
    trigger.focus();

    const view = render(
      <LucaDialog modal aria-label="Test dialog" onRequestClose={onRequestClose}>
        <button type="button">Continue</button>
      </LucaDialog>,
    );

    await waitFor(() => expect(document.body.style.overflow).toBe("hidden"));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onRequestClose).toHaveBeenCalledTimes(1);

    view.unmount();
    expect(document.body.style.overflow).toBe("");
    expect(document.activeElement).toBe(trigger);
    trigger.remove();
  });

  it("only lets the topmost nested modal consume Escape", () => {
    const parentClose = vi.fn();
    const childClose = vi.fn();
    render(
      <>
        <LucaDialog modal aria-label="Parent" onRequestClose={parentClose} />
        <LucaDialog modal aria-label="Child" onRequestClose={childClose} />
      </>,
    );

    fireEvent.keyDown(document, { key: "Escape" });
    expect(childClose).toHaveBeenCalledTimes(1);
    expect(parentClose).not.toHaveBeenCalled();
  });
});
