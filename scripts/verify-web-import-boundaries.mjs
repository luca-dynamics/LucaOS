#!/usr/bin/env node

import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const reportOnly = process.env.LUCA_WEB_IMPORT_BOUNDARY_FAIL === "1" ? false : true;

const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

const scanGlobs = [
  "src/main.{ts,tsx,js,jsx,mjs,cjs}",
  "src/App.{ts,tsx,js,jsx,mjs,cjs}",
  "src/config/api.ts",
  "src/hooks/app/**/*.{ts,tsx,js,jsx,mjs,cjs}",
  "src/services/**/*.{ts,tsx,js,jsx,mjs,cjs}",
  "src/components/**/*.{ts,tsx,js,jsx,mjs,cjs}",
];

const scanTargets = [
  { type: "file-stem", path: "src/main" },
  { type: "file-stem", path: "src/App" },
  { type: "file", path: "src/config/api.ts" },
  { type: "directory", path: "src/hooks/app" },
  { type: "directory", path: "src/services" },
  { type: "directory", path: "src/components" },
];

const ignoredDirectories = new Set([
  "node_modules",
  "dist",
  "build",
  ".git",
  ".vercel",
  "coverage",
  "ios",
  "android",
]);

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

function isSourceFile(filePath) {
  return sourceExtensions.has(extname(filePath));
}

function toRepoRelativePath(absolutePath) {
  return relative(repoRoot, absolutePath).split("\\").join("/");
}

function collectSourceFilesFromDirectory(directoryPath, files) {
  let entries;
  try {
    entries = readdirSync(directoryPath, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (ignoredDirectories.has(entry.name)) continue;
      collectSourceFilesFromDirectory(join(directoryPath, entry.name), files);
      continue;
    }

    if (entry.isFile() && isSourceFile(entry.name)) {
      files.push(toRepoRelativePath(join(directoryPath, entry.name)));
    }
  }
}

function collectSourceFilesWithNode() {
  const files = [];

  for (const target of scanTargets) {
    const absoluteTarget = resolve(repoRoot, target.path);
    if (target.type === "directory") {
      collectSourceFilesFromDirectory(absoluteTarget, files);
      continue;
    }

    if (target.type === "file") {
      try {
        if (statSync(absoluteTarget).isFile()) files.push(target.path);
      } catch (error) {
        if (error?.code !== "ENOENT") throw error;
      }
      continue;
    }

    for (const extension of sourceExtensions) {
      const candidate = `${absoluteTarget}${extension}`;
      try {
        if (statSync(candidate).isFile()) files.push(toRepoRelativePath(candidate));
      } catch (error) {
        if (error?.code !== "ENOENT") throw error;
      }
    }
  }

  return [...new Set(files)].sort();
}

function collectSourceFiles() {
  const rg = spawnSync("rg", rgArgs, {
    cwd: repoRoot,
    encoding: "utf8",
  });

  if (rg.error) {
    if (rg.error.code === "ENOENT") {
      console.warn("[web-import-boundaries] rg not found; falling back to the Node.js source scanner.");
      return collectSourceFilesWithNode();
    }

    throw new Error(`Unable to run rg: ${rg.error.message}`);
  }

  if (rg.status !== 0) {
    throw new Error(`rg exited with status ${rg.status}: ${rg.stderr.trim() || "no stderr output"}`);
  }

  return rg.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

let files;
try {
  files = collectSourceFiles();
} catch (error) {
  console.error(`[web-import-boundaries] ${error.message}`);
  process.exit(1);
}

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
