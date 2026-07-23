## Summary

Wires real product paths for several scaffolded systems, finishes the PI / Mission Control / LucaLink continuity loops, and hard-deletes unused dual stacks. Product defaults stay **opt-in**; execution remains gated.

### Computer use (real sandbox path)
- Settings-gated real sandbox stack (Playwright / Electron drivers)
- Feature flags + stack resolver from settings
- Maturity map / README updates
- Removes unused browser runtime adapters and probes

### Path A — Personal Intelligence memory
- Live memory pilot closes the write loop via `markWritten` + governance
- Queue refresh after successful write
- Skill permission UI seeded from **live** skill registry (fixtures only when empty)
- In-panel success feedback (`Remembered: …`)

### Path B — Mission Control advisory
- Live MissionControl snapshot → real alignment evaluation, advisory recommendation, and collaborative guidance
- Metadata constraints / success criteria when present
- Honest live vs sample labels

### Path C — LucaLink continuity
- Single continuity bridge: mesh `connectedDevices` + trust store
- Provisional paired records for mesh-only devices (no trust elevation)
- Shell `useLucaLinkDevices` and Settings device center share the same identity view
- Pairing modal readiness gains a Continuity chip (continuations / handoffs)

### Cleanup (zero product callers)
- Voice dual-stack scaffolds removed
- PI pure-model clusters removed (continuity / memoryGraph / dashboard / etc.)
- MissionEngine class removed (types/docs remain where needed)
- LucaLink smoke/QA harnesses removed

## Test plan

- [ ] `npx vitest run src/services/personalIntelligence/memoryProposalWriteClose.test.ts src/services/personalIntelligence/memoryProposalBridge.test.ts src/services/memory/MemoryProposalService.test.ts src/components/settings/PersonalIntelligenceMemoryApprovalPilot.test.tsx`
- [ ] `npx vitest run src/services/personalIntelligence/missionAdvisoryBridge.test.ts src/services/personalIntelligence/missionSnapshotBridge.test.ts src/components/settings/PersonalIntelligenceMissionRuntimePanel.test.tsx`
- [ ] `npx vitest run src/services/lucaLink/lucaLinkContinuityBridge.test.ts src/hooks/useLucaLinkDevices.test.ts src/components/lucaLink/lucaLinkModalReadiness.test.ts src/components/settings/SettingsLucaLinkDeviceCenter.test.ts`
- [ ] `npx vitest run src/services/browserRuntime src/services/computerUse --reporter=default` (or project CU test subset)
- [ ] Manual: Settings → Data → governed memory pilot dry-run → write → queue drops written proposal + "Remembered" banner
- [ ] Manual: Settings → PI mission panel shows Live mission when MissionControl has an active mission
- [ ] Manual: Settings → Autonomy computer-use flags stay default off; enabling real sandbox does not auto-run actions
- [ ] Manual: LucaLink modal Continuity chip; shell Body devices reflect mesh+trust when paired

## Notes for reviewers

- **No autonomous execution** added for skills, missions, or LucaLink handoffs
- Memory live write remains multi-gate (pilot + confirmation phrase + dry-run)
- Dual-stack deletions were checked for zero product UI callers before hard-delete
