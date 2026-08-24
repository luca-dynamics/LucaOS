import React from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

import { lucaLayerStyle, useLucaEscapePriority } from "./lucaOverlayFoundation";

/**
 * LucaMenu — the one governed menu behavior for LucaOS.
 *
 * Every menu in the app used to be hand-rolled: eight `role="menu"` surfaces
 * across seven files, each with its own outside-click effect, and six of the
 * seven announced `role="menu"` to assistive tech without ever moving focus
 * into the menu — so what was announced and what worked disagreed. This wraps
 * `@radix-ui/react-dropdown-menu` so arrow keys, Home/End, typeahead, roving
 * focus, submenu pointer-grace, portalling and collision flipping are decided
 * once, here, instead of per call site.
 *
 * It owns **behavior only**. Nothing here paints: `className` and `style` pass
 * through verbatim so each call site keeps its exact surface. The single style
 * this file contributes is the named popover layer, and it is merged *under*
 * the caller's style so a call site can always win.
 *
 * Two integration notes worth knowing before you use it:
 *
 * - **Escape is arbitrated through the shared modal stack.** Radix listens for
 *   Escape on `document` in the capture phase, and so does
 *   {@link useLucaModalLayer}; whoever registered first would otherwise win,
 *   which would let a menu opened inside a `LucaDialog` close the *dialog*.
 *   `LucaMenuContent` claims the top of the stack while it is open, so the
 *   dialog defers. One stack, one owner of Escape.
 * - **Radix kills Tab inside menu content** (`react-menu` content `onKeyDown`
 *   calls `preventDefault()` for Tab on any descendant, and swallows single
 *   character keys into typeahead). So a menu must contain menu items and
 *   nothing else. A surface that hosts arbitrary interactive controls is a
 *   popover, not a menu, and putting it behind this primitive would make those
 *   controls keyboard-unreachable.
 */

/** `Root`. Defaults to `modal={false}`, which is what these menus already did — they never locked scroll or trapped focus. */
export type LucaMenuProps = React.ComponentPropsWithoutRef<typeof DropdownMenu.Root>;

export const LucaMenu: React.FC<LucaMenuProps> = ({ modal = false, ...props }) => (
  <DropdownMenu.Root modal={modal} {...props} />
);

/** `Trigger`. Defaults to `asChild` so the call site keeps its own button. */
export type LucaMenuTriggerProps = React.ComponentPropsWithoutRef<typeof DropdownMenu.Trigger>;

export const LucaMenuTrigger = React.forwardRef<HTMLButtonElement, LucaMenuTriggerProps>(
  ({ asChild = true, ...props }, forwardedRef) => (
    <DropdownMenu.Trigger ref={forwardedRef} asChild={asChild} {...props} />
  ),
);

LucaMenuTrigger.displayName = "LucaMenuTrigger";

/**
 * Claims the top of the shared modal stack for as long as it is mounted.
 *
 * Rendered inside the menu content rather than alongside it because Radix
 * mounts content only while the menu is open — so mounting *is* the open
 * signal, and no open state has to be threaded down from the call site.
 */
const LucaMenuEscapePriority: React.FC = () => {
  useLucaEscapePriority(true);
  return null;
};

export type LucaMenuContentProps = React.ComponentPropsWithoutRef<typeof DropdownMenu.Content> & {
  /**
   * Portal target. Defaults to `document.body`, which is the point: an
   * in-place menu is clipped by ancestor `overflow` and trapped in its
   * ancestors' stacking context.
   */
  container?: HTMLElement | null;
};

/**
 * `Portal` + `Content`, carrying the named popover layer (300).
 *
 * The layer matters more than it looks: the menus this replaced used raw
 * z-indexes of 80, 70 and 60 — all *below* `LUCA_LAYER.panel` (100) — so they
 * rendered behind floating panels.
 *
 * `side` / `align` / `sideOffset` are deliberately not defaulted. Portalling
 * hands placement to Floating UI, so each call site states the placement its
 * old anchor classes implied instead of inheriting a guess from here.
 */
export const LucaMenuContent = React.forwardRef<HTMLDivElement, LucaMenuContentProps>(
  ({ container, children, style, ...props }, forwardedRef) => (
    <DropdownMenu.Portal container={container ?? undefined}>
      <DropdownMenu.Content
        ref={forwardedRef}
        style={{ ...lucaLayerStyle("popover"), ...style }}
        {...props}
      >
        <LucaMenuEscapePriority />
        {children}
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  ),
);

LucaMenuContent.displayName = "LucaMenuContent";

export type LucaMenuSubContentProps = React.ComponentPropsWithoutRef<
  typeof DropdownMenu.SubContent
> & {
  container?: HTMLElement | null;
};

/**
 * `Portal` + `SubContent` for a nested section.
 *
 * No escape-priority claim here: Radix arbitrates Escape among its own nested
 * layers (a submenu closes before its parent), and the root content already
 * holds the Luca stack, so claiming it twice would only add a pop to get wrong.
 */
export const LucaMenuSubContent = React.forwardRef<HTMLDivElement, LucaMenuSubContentProps>(
  ({ container, style, ...props }, forwardedRef) => (
    <DropdownMenu.Portal container={container ?? undefined}>
      <DropdownMenu.SubContent
        ref={forwardedRef}
        style={{ ...lucaLayerStyle("popover"), ...style }}
        {...props}
      />
    </DropdownMenu.Portal>
  ),
);

LucaMenuSubContent.displayName = "LucaMenuSubContent";

/* ── Pass-through parts ─────────────────────────────────────────────────────
   Behavior is already correct in Radix and there is nothing for Luca to add,
   so these are aliases rather than wrappers. Use `asChild` to keep an existing
   element: `<LucaMenuItem asChild><button …/></LucaMenuItem>` gives the button
   roving focus, typeahead and `data-highlighted` without restyling it.        */

export const LucaMenuItem = DropdownMenu.Item;
export type LucaMenuItemProps = React.ComponentPropsWithoutRef<typeof DropdownMenu.Item>;

export const LucaMenuGroup = DropdownMenu.Group;
export type LucaMenuGroupProps = React.ComponentPropsWithoutRef<typeof DropdownMenu.Group>;

export const LucaMenuLabel = DropdownMenu.Label;
export type LucaMenuLabelProps = React.ComponentPropsWithoutRef<typeof DropdownMenu.Label>;

export const LucaMenuSeparator = DropdownMenu.Separator;
export type LucaMenuSeparatorProps = React.ComponentPropsWithoutRef<
  typeof DropdownMenu.Separator
>;

export const LucaMenuSub = DropdownMenu.Sub;
export type LucaMenuSubProps = React.ComponentPropsWithoutRef<typeof DropdownMenu.Sub>;

export const LucaMenuSubTrigger = DropdownMenu.SubTrigger;
export type LucaMenuSubTriggerProps = React.ComponentPropsWithoutRef<
  typeof DropdownMenu.SubTrigger
>;

export const LucaMenuRadioGroup = DropdownMenu.RadioGroup;
export type LucaMenuRadioGroupProps = React.ComponentPropsWithoutRef<
  typeof DropdownMenu.RadioGroup
>;

export const LucaMenuRadioItem = DropdownMenu.RadioItem;
export type LucaMenuRadioItemProps = React.ComponentPropsWithoutRef<
  typeof DropdownMenu.RadioItem
>;

export const LucaMenuCheckboxItem = DropdownMenu.CheckboxItem;
export type LucaMenuCheckboxItemProps = React.ComponentPropsWithoutRef<
  typeof DropdownMenu.CheckboxItem
>;

export const LucaMenuItemIndicator = DropdownMenu.ItemIndicator;
export type LucaMenuItemIndicatorProps = React.ComponentPropsWithoutRef<
  typeof DropdownMenu.ItemIndicator
>;
