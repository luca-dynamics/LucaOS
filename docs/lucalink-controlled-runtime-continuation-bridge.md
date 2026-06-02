# LucaLink Controlled Runtime Continuation Bridge

PR #196 adds a narrow, security-first bridge between approved LucaLink continuation tokens and safe continuation preparation. The bridge is intentionally model-only: it evaluates a token, prepares a read-only continuation object for allowed categories, and can mark that prepared token consumed as state.

## Purpose

Continuation tokens already record that a LucaLink action received Primary Host approval and passed token validation. The controlled bridge adds the next gate: deciding whether a valid token is safe enough to prepare for continuation without introducing broad runtime execution.

The bridge only prepares a structured model object. It does not continue runtime work by itself.

## Why continuation remains limited

Approval is not execution. A valid continuation token is still refused unless it fits the bridge's safe category rules. This keeps approved records from becoming a generic retry/replay channel for tools, files, code, browser control, payments, robotics, smart-home controls, actuator commands, or other physical-world actions.

## Safe categories

The only categories that can prepare a safe continuation model are low/medium-risk notification and conversation-like records, including:

- `notification.send`
- `conversation.continue`
- `message.send`
- low/medium-risk `notification` lane records
- low/medium-risk `conversation` lane records

Safe records must still be validated, unexpired, unconsumed, uncancelled, unblocked, and `single-use-replayable`.

## Manual retry-only categories

The bridge refuses these categories as manual-retry-only and does not return a prepared safe action:

- `shell.execute`
- `files.write`
- `code.modify`
- `git.create_pr`
- `browser.control`
- any token marked `manual-retry-only`

These categories require a separate user action outside this bridge.

## Fresh-confirmation categories

The bridge refuses these categories as fresh-confirmation-required and does not return a prepared safe action:

- `payment.spend`
- `robotics.motion`
- `smart_home.control`
- actuator or physical-world command hints
- critical `safety` lane records
- any token marked `fresh-confirmation-required`

Fresh-confirmation-required actions cannot be continued by this bridge.

## Validation, prepare, consume lifecycle

1. **Validate** the continuation token against token status, expiry, replay mode, and requested validation context.
2. **Classify** the requested continuation as safe, manual-retry-only, fresh-confirmation-required, blocked, or unknown.
3. **Prepare** only safe notification/conversation/message records as a model object with a payload preview.
4. **Consume** only a prepared safe continuation token by updating token state to consumed.

Consuming a prepared continuation only updates continuation state. It does not perform the underlying action.

## No runtime send/emit/execute boundary

The controlled bridge does not:

- send messages
- emit socket events
- call beam transport
- execute shell commands
- write files
- modify code
- create pull requests
- control a browser
- spend money
- move robotics
- control smart-home devices
- actuate physical-world systems
- retry, replay, auto-run, or continue dangerous actions

## Next step

After the bridge is proven safe, the next LucaLink step can add full runtime enforcement around continuation usage. That future work should remain separate from this model-only bridge and continue preserving the boundary between Creator/source-code authority and normal Primary Host mesh authority.
