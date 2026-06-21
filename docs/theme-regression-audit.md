# LucaOS Theme Regression Audit

Date: 2026-06-21

## Search patterns used

Focused `rg` audit across the requested shell, web, settings, mobile, and visual surfaces using:

- `text-white`, `text-black`, `text-gray-`, `text-slate-`
- `bg-white/`, `bg-black/`, `bg-gray-`, `bg-slate-`
- `border-white/`, `border-black/`, `border-gray-`, `border-slate-`
- `shadow-[0_0_`, `shadow-black`, `shadow-white`
- `#ffffff`, `#fff`, `#000000`, `#000`, `#121212`, `#050507`, `#00ffff`
- `rgba(255`, `rgba(0, 0, 0`, `rgba(0,0,0`, `rgba(255,255,255`

## Files inspected

Prioritized audit paths:

- `src/components/boot/`
- `src/components/layout/`
- `src/components/ChatWidgetInput.tsx`
- `src/web/`
- `src/App.tsx`
- `src/styles/`
- `src/components/settings/`
- `src/components/mobile/`
- `src/components/visual/`

Note: `src/components/overlays/` was requested, but that directory is not present in this checkout.

## Issues fixed

- Tokenized the detached floating panel surface, border, and soft shadow so the default/basic shell no longer branches to fixed white/black rgba backgrounds.
- Tokenized the detached floating panel reattach hover surface away from `hover:bg-white/10`.
- Tokenized the reboot overlay scrim and progress-track surface/border away from fixed white/black rgba and `bg-gray-900/50`.
- Tokenized the desktop operations sidebar surface away from fixed white/black rgba backgrounds.
- Tokenized the panel resizer handle border away from `border-white/10`.

## Intentional remaining hardcoded/advanced visual classes

Remaining matches were classified as intentional and left unchanged when they fell into these buckets:

- Semantic/status/accent styling that is already token-driven or tied to explicit danger/success/info/persona/plugin accents.
- Advanced, tactical, creator, TV/data-room, mobile-screen-mirror, canvas/orb, and sovereignty visuals that intentionally use black/white/slate/neon styling as part of their specialized presentation rather than default/basic shell chrome.
- Web post-boot/onboarding/capability-card visual treatment that is separate from the default/basic desktop shell and needs a broader web-theme pass before piecemeal tokenization.
- Token fallback strings inside shared style helpers, where the hardcoded value is only a fallback after Luca/app tokens.

## Known follow-up items

- `src/web/` still contains a cohesive dark glass visual language. Audit it separately when web theme tokens are finalized.
- `src/components/settings/` contains many existing app-token fallbacks with rgba values and a few mobile-only `bg-white/5` surfaces. These should be migrated in a settings-specific pass to avoid changing mobile/settings behavior opportunistically.
- `src/components/mobile/` and `src/components/visual/` contain intentional advanced/pro/tactical presentation classes. Revisit only if those views become part of the default/basic shell.
