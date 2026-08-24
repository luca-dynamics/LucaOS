/**
 * The provider-identity table, and the four things that must stay true about it.
 *
 * This table replaced five disagreeing vocabularies (see `providerIds.js`), so the
 * tests worth having are not "does the object have the keys I just typed" but
 * "does every other list in the repo still agree with it". Four of them do the
 * agreeing:
 *
 *  - `openaiEndpoints.js` — its endpoint keys must be canonical provider ids.
 *  - `llmGateway.js` — every canonical id must be reachable by some adapter.
 *  - `settingsService.ts` — every settings path must name a real Settings field.
 *  - `cortex.py` — Python's own credential lookups must use names the table knows.
 *
 * The last three are read off disk through `process.getBuiltinModule('node:fs')`.
 * `vite.config.ts` aliases `fs`/`node:fs` to a browser polyfill whose
 * `readFileSync` returns `''`, so a plain import would make every assertion below
 * pass while proving nothing — each `describe` therefore opens with a vacuity
 * check that fails loudly if the read came back empty.
 */

const { readFileSync } = process.getBuiltinModule("node:fs");

import { describe, expect, it } from "vitest";

import {
  CANONICAL_PROVIDER_IDS,
  KEYLESS_PROVIDER_IDS,
  OPENAI_COMPATIBLE_BUCKET_ID,
  PROVIDER_CREDENTIALS,
  getProviderEnvNames,
  getProviderVaultKey,
  isKeylessProvider,
  type ProviderCredentialId,
} from "./providerIds.js";
import {
  OPENAI_COMPATIBLE_ALIASES,
  OPENAI_COMPATIBLE_ENDPOINTS,
  OPENAI_COMPATIBLE_LOCAL_ENDPOINTS,
} from "./openaiEndpoints.js";

const toPath = (relative: string) =>
  new URL(relative, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

const read = (relative: string) =>
  readFileSync(toPath(relative), "utf8") as string;

const CREDENTIAL_IDS = Object.keys(PROVIDER_CREDENTIALS) as ProviderCredentialId[];
const MODEL_IDS = CREDENTIAL_IDS.filter(
  (id) => PROVIDER_CREDENTIALS[id].kind === "model",
);

// --- the table itself --------------------------------------------------------

describe("the credential table", () => {
  it("covers every provider Luca stores a secret for", () => {
    expect(CREDENTIAL_IDS).toEqual([
      "gemini",
      "openai",
      "anthropic",
      "xai",
      "deepseek",
      "groq",
      "mistral",
      "openrouter",
      "deepgram",
      "google",
    ]);
  });

  it("gives every provider a settings path and at least one env name", () => {
    for (const id of CREDENTIAL_IDS) {
      const entry = PROVIDER_CREDENTIALS[id];
      expect(entry.settings.section, id).toMatch(/^\w+$/);
      expect(entry.settings.key, id).toMatch(/^\w+$/);
      expect(entry.env.length, id).toBeGreaterThan(0);
    }
  });

  it("spells every env name as an environment variable, not a settings key", () => {
    // A lowercase entry here means someone pasted a settings field into the env
    // column; the resolver would then look up a variable that can never be set.
    for (const id of CREDENTIAL_IDS) {
      for (const name of [
        ...PROVIDER_CREDENTIALS[id].env,
        ...PROVIDER_CREDENTIALS[id].rendererEnv,
      ]) {
        expect(name, `${id} → ${name}`).toMatch(/^[A-Z][A-Z0-9_]*$/);
      }
    }
  });

  it("assigns each env name to one provider, so no two can claim a key", () => {
    // GOOGLE_API_KEY is the one deliberate exception: it is gemini's last resort
    // and the Google *voice* key's only name. That collision predates this table
    // — the core has read GOOGLE_API_KEY as a Gemini key since before Stage 2 —
    // and narrowing it would silently stop resolving a key someone has set.
    const owners = new Map<string, string[]>();
    for (const id of CREDENTIAL_IDS) {
      for (const name of PROVIDER_CREDENTIALS[id].env) {
        owners.set(name, [...(owners.get(name) ?? []), id]);
      }
    }
    const shared = [...owners.entries()].filter(([, ids]) => ids.length > 1);
    expect(shared).toEqual([["GOOGLE_API_KEY", ["gemini", "google"]]]);
  });
});

describe("the canonical routing vocabulary", () => {
  it("is the model providers plus the keyless ones, and nothing else", () => {
    expect([...CANONICAL_PROVIDER_IDS]).toEqual([
      ...MODEL_IDS,
      ...KEYLESS_PROVIDER_IDS,
    ]);
    expect([...KEYLESS_PROVIDER_IDS]).toEqual(["cortex", "ollama"]);
  });

  it("excludes the openai-compat bucket, which owns no credential", () => {
    // `detectProvider` returns 'openai-compat' as a *routing* answer; it resolves
    // to a canonical id via the alias in the model id. Treating it as a provider
    // is what let a Groq call reach for an OpenAI key.
    expect(OPENAI_COMPATIBLE_BUCKET_ID).toBe("openai-compat");
    expect(CANONICAL_PROVIDER_IDS).not.toContain(OPENAI_COMPATIBLE_BUCKET_ID);
    expect(getProviderVaultKey(OPENAI_COMPATIBLE_BUCKET_ID)).toBeNull();
  });

  it("excludes the voice providers, which are not model providers", () => {
    for (const id of ["deepgram", "google"]) {
      expect(CANONICAL_PROVIDER_IDS, id).not.toContain(id);
      // ...but they are still credential providers, so the table knows them.
      expect(getProviderVaultKey(id)).not.toBeNull();
    }
  });

  it("reports the keyless providers, and only those, as keyless", () => {
    expect(isKeylessProvider("cortex")).toBe(true);
    expect(isKeylessProvider("ollama")).toBe(true);
    for (const id of MODEL_IDS) expect(isKeylessProvider(id), id).toBe(false);
  });
});

// --- vault keys --------------------------------------------------------------

describe("the Secure Vault key a provider looks under", () => {
  it("is the settings path, verbatim", () => {
    expect(getProviderVaultKey("gemini")).toBe("setting:brain:geminiApiKey");
    expect(getProviderVaultKey("deepgram")).toBe(
      "setting:voice:deepgramApiKey",
    );
  });

  it("keeps OpenRouter's capital R", () => {
    // The reason the table exists. `setting:brain:${provider}ApiKey` derives
    // 'openrouterApiKey' and misses a key the user really did save under
    // `brain.openRouterApiKey`, which is why credentialResolver needed a
    // hand-written override until this table replaced it.
    expect(getProviderVaultKey("openrouter")).toBe(
      "setting:brain:openRouterApiKey",
    );
  });

  it("is null for an id the table does not know, rather than a guess", () => {
    for (const id of ["", "cortex", "ollama", "together", "openai-compat"]) {
      expect(getProviderVaultKey(id), id).toBeNull();
    }
  });
});

// --- env names ---------------------------------------------------------------

describe("the environment names a provider answers to", () => {
  it("matches what a .env file has always spelled, for the core", () => {
    // Golden, not derived: these strings are the contract with a user's existing
    // .env. The first six are exactly what credentialResolver's ENV_KEYS held
    // before the table replaced it, so this also pins "no behaviour change".
    expect(getProviderEnvNames("gemini")).toEqual([
      "GEMINI_API_KEY",
      "GOOGLE_API_KEY",
    ]);
    expect(getProviderEnvNames("openai")).toEqual(["OPENAI_API_KEY"]);
    expect(getProviderEnvNames("anthropic")).toEqual(["ANTHROPIC_API_KEY"]);
    expect(getProviderEnvNames("xai")).toEqual([
      "XAI_API_KEY",
      "GROK_API_KEY",
    ]);
    expect(getProviderEnvNames("deepseek")).toEqual(["DEEPSEEK_API_KEY"]);
    expect(getProviderEnvNames("openrouter")).toEqual(["OPENROUTER_API_KEY"]);
  });

  it("gives the core the Groq and Mistral names it never had", () => {
    // The invisibility half of the credential crossing: the renderer read
    // GROQ_API_KEY and the core did not, so `getApiKey('groq')` returned null
    // even with the key set, and the gateway then reached for the OpenAI key.
    expect(getProviderEnvNames("groq")).toEqual(["GROQ_API_KEY"]);
    expect(getProviderEnvNames("mistral")).toEqual(["MISTRAL_API_KEY"]);
  });

  it("prepends the bundle-only spellings for the renderer", () => {
    expect(getProviderEnvNames("gemini", { surface: "renderer" })).toEqual([
      "VITE_API_KEY",
      "VITE_GEMINI_API_KEY",
      "API_KEY",
      "GEMINI_API_KEY",
      "GOOGLE_API_KEY",
    ]);
    expect(getProviderEnvNames("groq", { surface: "renderer" })).toEqual([
      "VITE_GROQ_API_KEY",
      "GROQ_API_KEY",
    ]);
  });

  it("checks every VITE_ name before any bare one", () => {
    // Vite replaces `import.meta.env.VITE_X` at build time; a bare name only
    // reaches the browser if something else injected it. Bare-name-first would
    // mean a stale injected value shadowing the built-in one.
    for (const id of CREDENTIAL_IDS) {
      const names = getProviderEnvNames(id, { surface: "renderer" });
      const lastVite = names.reduce(
        (last, name, i) => (name.startsWith("VITE_") ? i : last),
        -1,
      );
      const firstBare = names.findIndex((name) => !name.startsWith("VITE_"));
      expect(lastVite, id).toBeLessThan(firstBare);
    }
  });

  it("is empty for an unknown id, and never falls back to another provider", () => {
    expect(getProviderEnvNames("together")).toEqual([]);
    expect(getProviderEnvNames("openai-compat")).toEqual([]);
    expect(getProviderEnvNames("", { surface: "renderer" })).toEqual([]);
  });

  it("hands back a copy, so a caller cannot mutate the table", () => {
    const names = getProviderEnvNames("openai");
    names.push("SOMETHING_ELSE");
    expect(getProviderEnvNames("openai")).toEqual(["OPENAI_API_KEY"]);
  });
});

// --- agreement with the endpoint table ---------------------------------------

describe("openaiEndpoints agrees with the canonical vocabulary", () => {
  it("names only canonical model providers", () => {
    expect(Object.keys(OPENAI_COMPATIBLE_ENDPOINTS).length).toBeGreaterThan(0);
    for (const id of Object.keys(OPENAI_COMPATIBLE_ENDPOINTS)) {
      expect(MODEL_IDS, `endpoint for '${id}'`).toContain(id);
    }
  });

  it("names only keyless providers in its local table", () => {
    expect(Object.keys(OPENAI_COMPATIBLE_LOCAL_ENDPOINTS)).toEqual([
      ...KEYLESS_PROVIDER_IDS,
    ]);
  });

  it("aliases only providers whose credential the table can resolve", () => {
    // An alias that resolved to an id with no row would send the gateway looking
    // for a key that cannot exist — which is the shape of the bug this change
    // closes, one level up.
    for (const alias of OPENAI_COMPATIBLE_ALIASES) {
      expect(MODEL_IDS, `alias '${alias}'`).toContain(alias);
      expect(getProviderVaultKey(alias), alias).not.toBeNull();
      expect(getProviderEnvNames(alias).length, alias).toBeGreaterThan(0);
    }
  });
});

// --- agreement with the gateway ----------------------------------------------

describe("every canonical provider is reachable by an adapter", () => {
  const gateway = read("../../../cortex/server/services/llm/llmGateway.js");

  /** The gateway's own OpenAI-compatible list, read rather than copied. */
  const openAICompatible =
    (
      gateway.match(
        /OPENAI_COMPATIBLE_PROVIDERS = Object\.freeze\(\[([\s\S]*?)\]\)/,
      )?.[1] ?? ""
    )
      .match(/'([^']+)'/g)
      ?.map((quoted) => quoted.slice(1, -1)) ?? [];

  it("read the gateway (a vacuous pass here would hide everything below)", () => {
    expect(gateway.length).toBeGreaterThan(0);
    expect(openAICompatible).toContain("openai");
    expect(openAICompatible).toContain(OPENAI_COMPATIBLE_BUCKET_ID);
  });

  it("routes each id through its own adapter, the shared wire, or the bucket", () => {
    /** Vendors with a dedicated adapter rather than the OpenAI wire. */
    const ownAdapter = ["gemini", "anthropic"];

    const unreachable = CANONICAL_PROVIDER_IDS.filter(
      (id) =>
        !ownAdapter.includes(id) &&
        !openAICompatible.includes(id) &&
        // groq and mistral have no case of their own: they arrive as
        // 'openai-compat' and are resolved by the alias in the model id.
        !OPENAI_COMPATIBLE_ALIASES.includes(id),
    );

    expect(unreachable).toEqual([]);
  });

  it("lists nothing in the gateway that the table does not know", () => {
    // Widened deliberately: these ids came out of a regex over the gateway's
    // source, so they are strings until this assertion proves otherwise.
    const canonical: readonly string[] = CANONICAL_PROVIDER_IDS;
    const unknown = openAICompatible.filter(
      (id) => id !== OPENAI_COMPATIBLE_BUCKET_ID && !canonical.includes(id),
    );
    expect(unknown).toEqual([]);
  });

  it("sends nothing to the openai-compat bucket that has no alias", () => {
    // `detectProvider` decides what lands in the bucket; `OPENAI_COMPATIBLE_ALIASES`
    // decides what can be resolved out of it. They are two lists in two files, and
    // this is the only thing that makes them agree — add a vendor to the first
    // without the second and the gateway can only refuse the call.
    const bucketLine = gateway
      .split("\n")
      .find((line) => line.includes(`return '${OPENAI_COMPATIBLE_BUCKET_ID}'`));

    expect(bucketLine, "detectProvider's openai-compat branch").toBeDefined();

    const substrings = [
      ...(bucketLine ?? "").matchAll(/includes\('([^']+)'\)/g),
    ].map((match) => match[1]);

    expect(substrings.length).toBeGreaterThan(0);
    for (const substring of substrings) {
      expect(OPENAI_COMPATIBLE_ALIASES, `m.includes('${substring}')`).toContain(
        substring,
      );
    }
  });
});

// --- agreement with Settings -------------------------------------------------

describe("every settings path names a real Settings field", () => {
  const settings = read("../../services/settingsService.ts");

  /**
   * Every `somethingApiKey` field declared in `LucaSettings`. Keys are unique
   * across `brain` and `voice`, so matching on the name alone is enough to tell
   * "this field exists" from "this field is imaginary".
   */
  const declaredFields = new Set(
    [...settings.matchAll(/^\s{4}(\w+ApiKey)\??:/gm)].map((m) => m[1]),
  );

  it("read settingsService (a vacuous pass here would hide the next case)", () => {
    expect(declaredFields.has("geminiApiKey")).toBe(true);
    expect(declaredFields.has("openRouterApiKey")).toBe(true);
    expect(declaredFields.size).toBeGreaterThan(6);
  });

  it("has exactly one forward-declared gap, and it is Mistral", () => {
    // A row whose field does not exist yet resolves from the environment only.
    // Asserting the *set* rather than skipping it means adding a provider without
    // a Settings field fails here instead of quietly never resolving a key.
    const missing = CREDENTIAL_IDS.filter(
      (id) => !declaredFields.has(PROVIDER_CREDENTIALS[id].settings.key),
    );
    expect(missing).toEqual(["mistral"]);
  });
});

// --- agreement with Python ---------------------------------------------------

describe("Python's own credential lookups use names the table knows", () => {
  const python = read("../../../cortex/python/cortex.py");

  const envNames = [
    ...python.matchAll(/os\.environ\.get\(\s*["']([A-Z][A-Z0-9_]*)["']/g),
  ].map((m) => m[1]);

  it("read cortex.py (a vacuous pass here would hide the next case)", () => {
    expect(python.length).toBeGreaterThan(0);
    expect(envNames).toContain("ANTHROPIC_API_KEY");
  });

  it("names no provider API key the table has never heard of", () => {
    // `cortex.py` is a second provider layer in another language, with its own
    // snake_case settings keys and a hardcoded x.ai endpoint. Migrating it onto
    // this table is its own change; this guard is the floor in the meantime — it
    // cannot drift *further* without turning red.
    //
    // PYANNOTE_API_KEY is the one name that is legitimately absent: the speaker
    // identity layer (`cortex.py`'s SpeakerManager) talks to Pyannote's cloud,
    // which serves no models and has no Settings field or vault key — it is read
    // from the environment and nowhere else. Asserting the exact set rather than
    // filtering it out means a *second* such key still fails here.
    const known = new Set(
      CREDENTIAL_IDS.flatMap((id) => [
        ...PROVIDER_CREDENTIALS[id].env,
        ...PROVIDER_CREDENTIALS[id].rendererEnv,
      ]),
    );
    const strangers = [...new Set(envNames)]
      .filter((name) => name.endsWith("_API_KEY"))
      .filter((name) => !known.has(name));

    expect(strangers).toEqual(["PYANNOTE_API_KEY"]);
  });
});
