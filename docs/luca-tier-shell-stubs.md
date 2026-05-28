# Luca Tier Shell Stubs

Isolated-only shell stub components exist under `src/components/tier/*` for Origin, Tactical, Normal, and Unknown-safe tiers.

Safety constraints:
- Not mounted in `App.tsx`.
- No runtime wiring changes.
- Read-only + mock-only defaults.
- No service/network/evolution mutation calls.
