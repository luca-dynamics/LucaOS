import type { LucaTierShellMode } from "../../types/lucaTierRouting";
import type { LucaUserTier } from "../../types/lucaUserTier";

export interface TierShellStubProps {
  userTier?: LucaUserTier;
  shellMode?: LucaTierShellMode;
  readOnly?: boolean;
  mockOnly?: boolean;
  runtimeBehaviorChanged?: false;
  uiWiringChanged?: false;
}

export function OriginCreatorShellStub({
  userTier = "origin",
  shellMode = "origin_creator_shell",
  readOnly = true,
  mockOnly = true,
  runtimeBehaviorChanged = false,
  uiWiringChanged = false,
}: TierShellStubProps) {
  return (
    <section data-tier-shell="origin_creator_shell_stub" data-runtime-behavior-changed={runtimeBehaviorChanged}>
      <h2>Origin Creator Shell Stub</h2>
      <p>Standalone placeholder only. Not wired into runtime routing.</p>
      <ul>
        <li>User tier: {userTier}</li>
        <li>Shell mode: {shellMode}</li>
        <li>Read-only: {String(readOnly)}</li>
        <li>Mock-only: {String(mockOnly)}</li>
        <li>UI wiring changed: {String(uiWiringChanged)}</li>
      </ul>
      <h3>Creator Command Center</h3>
      <h3>Evolution Review</h3>
      <h3>External Lab Status</h3>
      <h3>Rollback Plans</h3>
      <h3>Private Migration Status</h3>
      <h3>Safety Banner</h3>
    </section>
  );
}
