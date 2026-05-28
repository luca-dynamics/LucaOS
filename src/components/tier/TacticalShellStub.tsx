import type { TierShellStubProps } from "./OriginCreatorShellStub";

export function TacticalShellStub({
  userTier = "tactical",
  shellMode = "tactical_shell",
  readOnly = true,
  mockOnly = true,
  runtimeBehaviorChanged = false,
  uiWiringChanged = false,
}: TierShellStubProps) {
  return (
    <section data-tier-shell="tactical_shell_stub" data-runtime-behavior-changed={runtimeBehaviorChanged}>
      <h2>Tactical Shell Stub</h2>
      <p>Standalone placeholder only. Not wired into runtime routing.</p>
      <ul>
        <li>User tier: {userTier}</li>
        <li>Shell mode: {shellMode}</li>
        <li>Read-only: {String(readOnly)}</li>
        <li>Mock-only: {String(mockOnly)}</li>
        <li>UI wiring changed: {String(uiWiringChanged)}</li>
      </ul>
      <h3>Tools</h3>
      <h3>Skills</h3>
      <h3>Diagnostics</h3>
      <h3>Safe Improvement Requests</h3>
      <h3>Safety Banner</h3>
    </section>
  );
}
