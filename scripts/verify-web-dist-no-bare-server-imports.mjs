#!/usr/bin/env node

import { readdirSync, readFileSync } from "node:fs";
import { extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const distRoot = resolve(repoRoot, "dist");
const scriptExtensions = new Set([".js", ".mjs"]);
const serverOnlySpecifiers = [
  "eventsource",
  "@modelcontextprotocol/sdk",
  "whatsapp-web.js",
  "robotjs",
  "playwright",
  "better-sqlite3",
  "electron",
  "express",
  "ccxt",
];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const bareImportPatterns = serverOnlySpecifiers.map((specifier) => {
  const escaped = escapeRegExp(specifier);
  return {
    specifier,
    pattern: new RegExp(
      String.raw`(?:\bfrom\s*|(?:^|[;\n])\s*import\s*|\bimport\s*\()\s*["']${escaped}["']`,
      "m",
    ),
  };
});

function collectScripts(directory, files = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = join(directory, entry.name);
    if (entry.isDirectory()) {
      collectScripts(absolutePath, files);
    } else if (entry.isFile() && scriptExtensions.has(extname(entry.name))) {
      files.push(absolutePath);
    }
  }
  return files;
}

let scripts;
try {
  scripts = collectScripts(distRoot);
} catch (error) {
  if (error?.code === "ENOENT") {
    console.error(
      "[web-dist-imports] dist does not exist. Run the web build before this verification.",
    );
    process.exit(1);
  }
  throw error;
}

const findings = [];
for (const script of scripts) {
  const source = readFileSync(script, "utf8");
  for (const { specifier, pattern } of bareImportPatterns) {
    if (pattern.test(source)) {
      findings.push({
        file: relative(repoRoot, script).split("\\").join("/"),
        specifier,
      });
    }
  }
}

if (findings.length > 0) {
  console.error(
    `[web-dist-imports] FAIL: found ${findings.length} unresolved server-only bare import(s):`,
  );
  for (const finding of findings) {
    console.error(`  - ${finding.file}: ${finding.specifier}`);
  }
  process.exit(1);
}

console.log(
  `[web-dist-imports] OK: scanned ${scripts.length} dist script(s); no unresolved server-only bare imports found.`,
);
