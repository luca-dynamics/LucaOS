import { describe, expect, it } from "vitest";

const { readFileSync } = process.getBuiltinModule("node:fs");
const electronMainSource = readFileSync("platforms/electron/main.cjs", "utf8");
const windowsSetupSource = readFileSync(
  "cortex/python/setup_vision.ps1",
  "utf8",
);
const unixSetupSource = readFileSync("cortex/python/setup_vision.sh", "utf8");
const bootRequirements = readFileSync(
  "cortex/python/requirements.boot.txt",
  "utf8",
);

describe("Electron first-run provisioning", () => {
  it("does not block desktop boot on the full AI dependency stack", () => {
    expect(electronMainSource).toContain(
      "spawn('powershell.exe', ['-ExecutionPolicy', 'Bypass', '-File', setupScript])",
    );
    expect(electronMainSource).toContain("spawn('/bin/bash', [setupScript])");
    expect(electronMainSource).toContain("'.luca-boot-ready'");
    expect(electronMainSource).toContain("'.luca-full-ready'");
    expect(electronMainSource).toContain("app.isPackaged ? 180 : 420");
    expect(electronMainSource).toContain("renderer-ready");
    expect(electronMainSource).toContain("ready-to-show");
    expect(electronMainSource).toContain("did-finish-load");
    expect(electronMainSource).toContain("show('timeout')");
    expect(electronMainSource).not.toContain(
      "['-ExecutionPolicy', 'Bypass', '-File', setupScript, '--full']",
    );
    expect(electronMainSource).not.toContain("[setupScript, '--full']");
  });

  it("keeps heavyweight AI packages out of the boot requirements", () => {
    for (const packageName of [
      "torch",
      "transformers",
      "accelerate",
      "bitsandbytes",
      "faster-whisper",
      "piper-tts",
      "kokoro",
      "moshi",
      "sentence-transformers",
      "model2vec",
      "lightrag-hku",
    ]) {
      expect(bootRequirements).not.toContain(packageName);
    }
  });

  it("keeps full and capability pack installs available after boot", () => {
    for (const source of [windowsSetupSource, unixSetupSource]) {
      expect(source).toContain("--full");
      expect(source).toContain("--pack");
      expect(source).toContain("requirements.pack.");
      expect(source).toContain("requirements.boot.txt");
      expect(source).toContain(".luca-");
    }
  });
});
