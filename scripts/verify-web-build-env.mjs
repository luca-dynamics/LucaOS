#!/usr/bin/env node

const ERROR_MESSAGE =
  "No provider secret may be present in the Vite/browser build environment. Luca-managed provider keys must live server-side behind api.lucaos.space.";

const BLOCKED_EXACT_NAMES = new Set([
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_API_KEY",
  "API_KEY",
  "VITE_OPENAI_API_KEY",
  "VITE_ANTHROPIC_API_KEY",
  "VITE_GEMINI_API_KEY",
  "VITE_GOOGLE_API_KEY",
  "VITE_API_KEY",
]);

const SERVER_SIDE_PROVIDER_NAMES = [
  "OPENAI",
  "ANTHROPIC",
  "GEMINI",
  "GOOGLE_GENAI",
  "GOOGLE_GENERATIVE_AI",
  "DEEPGRAM",
  "ELEVENLABS",
  "MISTRAL",
  "COHERE",
  "TOGETHER",
  "HUGGINGFACE",
  "HF",
  "PERPLEXITY",
  "GROQ",
];

const SECRET_TOKEN_PATTERN = /(?:^|_)(?:API_?KEY|KEY|TOKEN|SECRET|CREDENTIAL|PRIVATE_?KEY)(?:_|$)/;
const PROVIDER_PATTERN = new RegExp(`(?:^|_)(${SERVER_SIDE_PROVIDER_NAMES.join("|")})(?:_|$)`);

const PUBLIC_VITE_ALLOWLIST = new Set([
  "VITE_LUCA_RELEASE_TARGET",
  "VITE_LUCA_RUNTIME_TARGET",
  "VITE_LUCA_APP_MODE",
  "VITE_LUCA_API_URL",
  "VITE_CLOUD_API_URL",
  "VITE_CLOUD_CORTEX_URL",
  "VITE_ENABLE_DESKTOP_RUNTIME",
  "VITE_ENABLE_LOCAL_MODEL_SCAN",
  "VITE_ENABLE_LOCAL_OLLAMA",
  "VITE_ENABLE_FILESYSTEM_MEMORY",
  "VITE_ENABLE_LUCALINK_NATIVE_CONTROL",
  "VITE_DEV_MODE",
]);

const hasValue = (value) => value !== undefined && value !== null && String(value).trim() !== "";

const isForbiddenName = (name) => {
  if (BLOCKED_EXACT_NAMES.has(name)) return true;

  if (name.startsWith("VITE_")) {
    if (PUBLIC_VITE_ALLOWLIST.has(name)) return false;
    return PROVIDER_PATTERN.test(name) && SECRET_TOKEN_PATTERN.test(name);
  }

  return PROVIDER_PATTERN.test(name) && SECRET_TOKEN_PATTERN.test(name);
};

const blocked = Object.entries(process.env)
  .filter(([name, value]) => hasValue(value) && isForbiddenName(name))
  .map(([name]) => name)
  .sort();

if (blocked.length > 0) {
  console.error("\n[web-build-env] Forbidden provider secret variable(s) detected:");
  for (const name of blocked) console.error(`  - ${name}`);
  console.error(`\n${ERROR_MESSAGE}`);
  console.error(
    "Only public client values such as VITE_LUCA_RELEASE_TARGET, VITE_LUCA_RUNTIME_TARGET, VITE_LUCA_API_URL, and non-secret feature flags may be present in the Vite web build environment. Do not put provider secrets in any VITE_ variable.\n",
  );
  process.exit(1);
}

console.log("[web-build-env] OK: no provider secrets detected in the Vite/browser build environment.");
