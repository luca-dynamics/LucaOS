# Memory Spec

## Memory Model
Luca memory is dual-form:
1. **Structured runtime memory** (indexed/queryable)
2. **Human-readable vault memory** (editable markdown)

## Layers
- **NOW layer**: short-lived active state.
- **Long-term layer**: projects, preferences, history, relationships, operational patterns.
- **Mission-derived layer**: tapes, lessons, trajectories.

## Required Properties
- Source attribution and confidence.
- Privacy classification and write controls.
- Staleness/expiry handling.
- Cross-device sync via LucaLink.
- Import/export support.

## Compression
Large artifacts (logs, pages, tool output, long documents) are compressed into compact summaries + anchors before model use.
