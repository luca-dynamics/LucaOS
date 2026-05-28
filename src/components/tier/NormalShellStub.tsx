import type { TierShellStubProps } from "./OriginCreatorShellStub";

export function NormalShellStub({
  userTier = "normal",
  shellMode = "normal_shell",
  readOnly = true,
  mockOnly = true,
  runtimeBehaviorChanged = false,
  uiWiringChanged = false,
}: TierShellStubProps) {
  return (
    <section data-tier-shell="normal_shell_stub" data-runtime-behavior-changed={runtimeBehaviorChanged}>
      <h2>Normal Shell Stub</h2>
      <h3>Chat / Voice Center</h3>
      <h3>Simple Preferences</h3>
      <h3>Approved Improvements</h3>
      <h3>Feedback Evidence</h3>
      <h3>Safety Banner</h3>
      <p>{`${userTier} · ${shellMode} · readOnly=${String(readOnly)} · mockOnly=${String(mockOnly)} · uiWiringChanged=${String(uiWiringChanged)}`}</p>
    </section>
  );
}
