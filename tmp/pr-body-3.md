## Summary

Product controls for the last two maturity steps after #644:

### Provider Hub chat cohort UI
- Model Manager: clearer “chat cohort” opt-in copy
- Task scope selector: `chat_only` (recommended) vs `all`
- Persists `runtimeRouteSelectionTaskScope`
- Diagnostics when preview task is outside chat-only scope

### LucaLink soft-enforcement step-up
- Settings → LucaLink → Advanced: mode control
  - **observe-only** (default)
  - **high-risk-only** (queue high-risk outbound)
  - **disabled**
- Uses `lucaLinkManager.governance` (not read-only console)
- Full outbound not exposed in the simple control

## Test plan

- [ ] `npx vitest run src/components/ModelManager.providerHubRuntimeRouteSelection.test.ts src/components/settings/SettingsLucaLinkSoftEnforcement.test.ts src/components/settings/SettingsLucaLinkDeviceCenter.test.ts`
- [ ] Manual: Model Manager → task scope chat_only / all persists
- [ ] Manual: LucaLink Advanced → switch observe-only ↔ high-risk-only ↔ disabled

## Notes

- Selection and kill switch still default-safe (selection off unless user enables)
- Soft enforcement default remains observe-only
