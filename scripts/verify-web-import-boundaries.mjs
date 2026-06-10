#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const reportOnly = process.env.LUCA_WEB_IMPORT_BOUNDARY_FAIL === "1" ? false : true;

const scanGlobs = [
  "src/main.{ts,tsx,js,jsx}",
  "src/App.{ts,tsx,js,jsx}",
  "src/config/api.ts",
  "src/hooks/app/**/*.{ts,tsx,js,jsx}",
  "src/services/**/*.{ts,tsx,js,jsx}",
  "src/components/**/*.{ts,tsx,js,jsx}",
];
const rgArgs = ["--files"];
for (const glob of scanGlobs) rgArgs.push("--glob", glob);

const forbiddenPatterns = [
  { label: "Electron IPC/preload globals", pattern: /\b(?:ipcRenderer|ipcMain|window\.luca|electronAPI)\b/ },
  { label: "platforms/electron", pattern: /platforms\/electron/ },
  { label: "server.js", pattern: /(?:^|["'`/])server\.js(?:["'`]|$)/ },
  { label: "cortex/server", pattern: /cortex\/server/ },
  { label: "cortex/python", pattern: /cortex\/python/ },
  { label: "child_process", pattern: /(?:from\s+["'`](?:node:)?child_process["'`]|import\(["'`](?:node:)?child_process["'`]\))/ },
  { label: "fs", pattern: /(?:from\s+["'`](?:node:)?fs(?:\/promises)?["'`]|import\(["'`](?:node:)?fs(?:\/promises)?["'`]\))/ },
  { label: "path", pattern: /(?:from\s+["'`](?:node:)?path["'`]|import\(["'`](?:node:)?path["'`]\))/ },
  { label: "os", pattern: /(?:from\s+["'`](?:node:)?os["'`]|import\(["'`](?:node:)?os["'`]\))/ },
  { label: "robotjs", pattern: /(?:from\s+["'`]robotjs["'`]|import\(["'`]robotjs["'`]\))/ },
  { label: "local Ollama install/start/delete", pattern: /\b(?:install|start|delete|remove|kill|spawn).*\bOllama\b|\bOllama\b.*\b(?:install|start|delete|remove|kill|spawn)\b/i },
  { label: "direct provider SDK adapter", pattern: /(?:from\s+["'`](?:openai|@anthropic-ai\/sdk|@google\/(?:genai|generative-ai))["'`]|import\(["'`](?:openai|@anthropic-ai\/sdk|@google\/(?:genai|generative-ai))["'`]\))/ },
];

const rg = spawnSync("rg", rgArgs, {
  cwd: repoRoot,
  encoding: "utf8",
});

if (rg.error) {
  console.error(`[web-import-boundaries] Unable to run rg: ${rg.error.message}`);
  process.exit(1);
}

const files = rg.stdout
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean);

const findings = [];
for (const file of files) {
  const absolute = resolve(repoRoot, file);
  const source = readFileSync(absolute, "utf8");
  const lines = source.split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const { label, pattern } of forbiddenPatterns) {
      if (pattern.test(line)) {
        findings.push({ file: relative(repoRoot, absolute), line: index + 1, label, text: line.trim() });
      }
    }
  });
}

if (findings.length > 0) {
  const mode = reportOnly ? "REPORT" : "FAIL";
  console.warn(`[web-import-boundaries] ${mode}: ${findings.length} risky browser-boundary reference(s) found.`);
  for (const finding of findings.slice(0, 80)) {
    console.warn(`  - ${finding.file}:${finding.line} [${finding.label}] ${finding.text}`);
  }
  if (findings.length > 80) {
    console.warn(`  ... ${findings.length - 80} additional finding(s) omitted.`);
  }
  console.warn(
    "[web-import-boundaries] This PR keeps the guard in report mode. Set LUCA_WEB_IMPORT_BOUNDARY_FAIL=1 to make these findings fail the build after the web graph is narrowed.",
  );
  if (!reportOnly) process.exit(1);
} else {
  console.log("[web-import-boundaries] OK: no risky direct browser-boundary references found in scanned paths.");
}
