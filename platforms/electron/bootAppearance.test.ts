import { afterEach, describe, expect, it } from "vitest";

import { createLucaNativeBootAppearanceSnapshot } from "../../src/styles/lucaNativeBootAppearance";

const { mkdtempSync, readFileSync, rmSync } = process.getBuiltinModule("node:fs");
const { tmpdir } = process.getBuiltinModule("node:os");
const { join } = process.getBuiltinModule("node:path");
const { createRequire } = process.getBuiltinModule("node:module");
const require = createRequire(import.meta.url);
const {
  ALLOWED_VARIABLE_NAMES,
  getBootAppearancePath,
  getBootWindowBackground,
  readBootAppearanceSnapshot,
  sanitizeBootAppearanceSnapshot,
  writeBootAppearanceSnapshot,
} = require("./bootAppearance.cjs");

const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("Electron boot appearance persistence", () => {
  it("round-trips only the contracted Luca material variables", () => {
    const userDataPath = mkdtempSync(join(tmpdir(), "luca-boot-appearance-"));
    temporaryDirectories.push(userDataPath);
    const input = createLucaNativeBootAppearanceSnapshot({ skinId: "pearl" });

    expect(writeBootAppearanceSnapshot(userDataPath, input)).toEqual(input);
    expect(readBootAppearanceSnapshot(userDataPath)).toEqual(input);
    expect(
      Object.keys(
        JSON.parse(readFileSync(getBootAppearancePath(userDataPath), "utf8"))
          .variables,
      ),
    ).toEqual(ALLOWED_VARIABLE_NAMES);
    expect(getBootWindowBackground(input)).toBe("#f7f6f2");
  });

  it("rejects incomplete or CSS-injecting snapshots", () => {
    const input = createLucaNativeBootAppearanceSnapshot({ skinId: "flow" });
    const incomplete = { ...input, variables: {} };
    const injected = {
      ...input,
      variables: {
        ...input.variables,
        "--luca-background-base": "url(https://example.invalid/pixel)",
      },
    };

    expect(sanitizeBootAppearanceSnapshot(incomplete)).toBeNull();
    expect(sanitizeBootAppearanceSnapshot(injected)).toBeNull();
  });

  it("does not persist extra renderer-provided CSS keys", () => {
    const input = createLucaNativeBootAppearanceSnapshot({ skinId: "carbon" });
    const snapshot = sanitizeBootAppearanceSnapshot({
      ...input,
      variables: { ...input.variables, "--untrusted-variable": "red" },
    });

    expect(snapshot.variables["--untrusted-variable"]).toBeUndefined();
  });
});
