# Ghost Browser Spec

## Purpose
Define LucaOS browser-use subsystem for controlled navigation, extraction, and interaction.

## Capabilities
- page navigation and session management
- content extraction/snapshotting
- bounded interactions (click/type/select)
- artifact capture and replay traces

## Security & Policy
- browser actions are guard-evaluated like host actions
- sensitive workflows should run under constrained profiles
- snapshots must respect redaction policy when persisted

## Existing Implementations
- `mcp-servers/luca-chrome-mcp/src/browser.ts`
- `mcp-servers/luca-chrome-mcp/src/tools/navigation.ts`
- `mcp-servers/luca-chrome-mcp/src/tools/interaction.ts`
- `mcp-servers/luca-chrome-mcp/src/tools/snapshot.ts`
- `cortex/server/services/chromeProfileService.js`
