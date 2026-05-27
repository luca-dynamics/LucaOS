# Runtime Validation Environment Guide (Codex/CI)

This guide documents recurring environment failures observed while validating the LucaOS runtime scaffold. It is intended to make failures easier to diagnose and hand off.

## Important Scope Note

This guide does **not** claim to automatically fix CI/Codex. It documents common blockers and practical setup steps for fully provisioned environments.

## Recurring Validation Failures

### 1) `robotjs` native build failures

Symptoms typically appear during dependency install and native module build steps.

### 2) `node-gyp` failures

Common when required Python/C/C++ build toolchain prerequisites are absent or mismatched.

### 3) Missing Python `distutils` / build modules

Some environments fail native builds due to incomplete Python packaging/build modules.

### 4) Missing `X11/extensions/XTest.h`

Linux environments without X11/XTest development headers may fail native dependency compile steps.

### 5) `vitest` not found

When `npm ci` fails early, test runner binaries are not installed, producing `vitest`/test-command resolution errors.

### 6) Repo-wide missing dependency/types (for example `react`, `@google/generative-ai`)

Partially provisioned environments can report broad type/import failures unrelated to runtime scaffold code changes.

## Provisioning Recommendations

Use a fully provisioned environment before drawing runtime conclusions:

1. Install Python build tooling needed by `node-gyp`/native module builds.
2. Install Linux X11/XTest development headers where applicable.
3. Ensure C/C++ build tools are available for native dependency compilation.
4. Run `npm ci` from a clean state and confirm it completes before type-check/test.

## Targeted Runtime Validation Commands

After dependencies install successfully, run targeted checks first:

```bash
npm run type-check
npm test -- --run src/services/voice
npm test -- --run src/services/computerUse
npm test -- --run src/services/voice/VoiceProviderReadiness.test.ts
npm test -- --run src/services/computerUse/BrowserRuntimeRouterInvocationGuard.test.ts
npm test -- --run src/services/computerUse/BrowserRuntimeRouterGuardedAdapter.test.ts
npm test -- --run src/services/voice/VoiceModeUiBridge.test.ts
npm test -- --run src/services/computerUse/ComputerUseConfirmationUiBridge.test.ts
```

## Codex Cloud Limitation Guidance

Codex Cloud runners can fail due to host toolchain/system-library constraints beyond repo-local code.

When that happens:

- Record the **exact command** that failed.
- Record the **first actionable error** (for example missing header/module/tool).
- Keep PR messaging explicit that failure is environment/dependency related, not necessarily a runtime scaffold regression.

This improves handoff quality and avoids false-negative architecture conclusions.
