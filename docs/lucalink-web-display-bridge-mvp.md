# LucaLink Web Display Bridge MVP

## Purpose

The LucaLink Web Display Bridge MVP is a governed, read-only intent and preview layer for representing a presentation session between a Primary Host and a companion or display host. It models what could be presented, whether the request is ready for review, which host approval is required, and what an inert preview payload contains.

This MVP is **not remote browser control**. It does not connect a display session to live transport or grant interaction with a browser, page, host, or device.

## Safety boundary

The bridge:

- creates typed `display.present` session intents;
- requires host approval for every presentation;
- requires explicit approval for private content;
- sanitizes HTTP(S) URL previews without fetching them;
- rejects unsafe schemes, credential-bearing or token-like URLs, and references to hidden prompts, private reasoning, or raw files;
- creates non-interactive preview payloads with no allowed actions;
- records audit-only lifecycle events with `sideEffectsPerformed: false`; and
- can derive an approval-required or blocked intent from an adapter sandbox execution plan.

The bridge does **not**:

- fetch URLs or call network APIs;
- open browser windows or call LucaBrowser;
- call VisualCore or alter Luca Screen runtime behavior;
- send Socket.IO messages or change LucaLink relay, LAN, WebRTC, VPN, pairing, guest, or QR behavior;
- automate DOM actions, clicks, typing, credentials, uploads, downloads, installs, shell commands, payments, or device control;
- execute an adapter entrypoint or grant adapter execution;
- access local storage, cookies, tokens, credentials, secrets, private reasoning, Personal Intelligence files, or raw files.

## Session lifecycle

A new intent starts as `approval_required`. Validation and policy evaluation may block it, and expiration changes it to `expired`. A valid host approval can move it only to `approved_preview`. That status allows construction of an inert preview payload; it does not open a display, send a message, or execute anything.

Preview payloads expose either `read_only` or `presentation_only` mode, have an empty `allowedActions` array, and enumerate every blocked remote-control and browser-automation action.

## Adapter sandbox integration

The bridge builds on the controlled adapter sandbox model from PR #210. An adapter plan can create a display intent only when it requests `display.present`. Blocked or rejected plans produce blocked display intents. Plans that require approval produce `approval_required` intents.

Adapter approval and display approval remain separate model states. Neither approval executes an adapter, invokes its entrypoint, mutates transport, or presents content.

## Future work

A future PR may connect companion-host approval notifications. Actual display-session transport may be considered only after a dedicated network and transport permission model exists. Those future integrations must preserve explicit host consent, auditable capability boundaries, and the separation between preview approval and execution.

## Companion approval notification surface

An `approval_required` display session intent can now be represented as a companion-host approval notification using the existing LucaLink approval queue shape and multi-host authority evaluation. The notification contains only sanitized preview metadata and blocked-action summaries.

A notification `approve_preview_intent` is separate from Web Display Bridge state and display execution. It does not call the display approval helper, move the session to `approved_preview`, open or cast a display, automate a browser, or send a transport message.

## Transport permission conversion

Web display session intents can be converted into side-effect-free LucaLink transport permission requests. The conversion summarizes display metadata for channel/message-class evaluation only; it does not send a display intent, approve a session, open or control a browser, cast content, or authorize runtime transport.
