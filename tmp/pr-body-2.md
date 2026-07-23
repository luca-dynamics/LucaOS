## Summary

Follow-up to #643: finish the skill dry-run pipeline and the next maturity modules (1–4) without opening broad execution.

### Skill dry-run pipeline
- Live registry → sandbox plan → controlled dry-run simulations (`skillDryRunBridge`)
- Skill Registry UI: live/sample labels; optional live MissionControl alignment on dry-runs
- Operation Permission Center: live skill dry-run items (capped); fixture skill dry-runs dropped when live present
- **Still no skill execution** (Act skipped)

### 1. Memory write unification
- Unified audit timeline: proposal `written` + PI pilot audit + GovernedMemoryWriteService
- Settings Data: “Unified memory write audit” card

### 2. LucaLink soft enforcement default
- Default mode **`observe-only`** (was `disabled`)
- Observes high-risk signals without blocking mesh transport by default

### 3. Thin execution pilot
- Single kind: `governed_memory_write_once` via existing governed write service
- Explicitly blocks skills/tools/shell/browser/LucaLink remote/mission auto-run

### 4. Provider Hub chat-only opt-in
- `runtimeRouteSelectionTaskScope: "chat_only" | "all"` (default **chat_only**)
- Selection remains **default off** + kill switch
- When enabled: chat may hand off; code / fast_reply / long_context stay on ProviderFactory (shadow can still observe)

## Test plan

- [ ] `npx vitest run src/services/personalIntelligence/skillDryRunBridge.test.ts src/services/personalIntelligence/memoryWriteAuditBridge.test.ts src/services/runtime/thinExecutionPilot.test.ts src/services/llm/ProviderFactory.chatOnlyScope.test.ts src/services/settingsService.providerHubRuntimeRouteSelection.test.ts src/services/lucaLink/relayClientAdapter.softEnforcement.test.ts`
- [ ] `npx vitest run src/components/SkillDryRunPanel.test.tsx src/components/SkillsMatrix.test.tsx src/components/right-panel/OperationPermissionCenter.test.tsx`
- [ ] Manual: Skills matrix dry-run shows live/sample; no Run control
- [ ] Manual: Settings → Data shows unified memory write audit
- [ ] Manual: LucaLink soft enforcement defaults to observe-only
- [ ] Manual: Provider Hub selection off by default; chat_only scope present in settings type/default

## Notes for reviewers

- No skill execution, mission auto-run, or full outbound LucaLink actuation
- Memory write remains multi-gate; thin pilot reuses GovernedMemoryWriteService
- Provider Hub handoff still opt-in and kill-switchable
