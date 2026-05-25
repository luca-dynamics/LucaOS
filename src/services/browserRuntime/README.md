# Browser Runtime Router scaffold

Minimal routing scaffold for browser-runtime lane selection.

## Supported lanes
- `direct_host_browser`
- `sandbox_browser`
- `remote_linked_browser`
- `ghost_browser`
- `custom`

## Core behavior
- dangerous actions require guard approval
- untrusted/high-risk requests prefer sandbox
- authenticated sessions route direct host only when trusted + approved
- remote linked lane allowed only in trusted linked-device context
- uncertain/no-availability falls back to sandbox attempt, then deny

## Scope
Additive scaffold only. Not deeply integrated into production runtime yet.
