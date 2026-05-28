import type { TierShellStubProps } from "./OriginCreatorShellStub";

export function UnknownSafeShellStub({
  userTier = "unknown",
  shellMode = "unknown_safe_shell",
  readOnly = true,
  mockOnly = true,
  runtimeBehaviorChanged = false,
  uiWiringChanged = false,
}: TierShellStubProps) {
  return (
    <section data-tier-shell="unknown_safe_shell_stub" data-runtime-behavior-changed={runtimeBehaviorChanged}>
      <h2>Unknown Safe Shell Stub</h2>
      <h3>Safe fallback</h3>
      <h3>setup required</h3>
      <h3>no privileged controls</h3>
      <p>{`${userTier} · ${shellMode} · readOnly=${String(readOnly)} · mockOnly=${String(mockOnly)} · uiWiringChanged=${String(uiWiringChanged)}`}</p>
    </section>
  );
}
