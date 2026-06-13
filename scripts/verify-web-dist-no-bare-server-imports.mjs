import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assetsDir = path.join(repoRoot, "dist", "assets");
const serverOnlyPackages = [
  "@modelcontextprotocol/sdk",
  "better-sqlite3",
  "ccxt",
  "electron",
  "express",
  "playwright",
  "robotjs",
  "whatsapp-web.js",
];

const escapeRegExp = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const bareImportPattern = (packageName) => {
  const specifier = `${escapeRegExp(packageName)}(?:\\/[^"'\\s)]+)?`;
  return new RegExp(
    `(?:\\bfrom\\s*["']${specifier}["']|\\bimport\\s*\\(\\s*["']${specifier}["']\\s*\\)|\\bimport\\s*["']${specifier}["']|\\brequire\\s*\\(\\s*["']${specifier}["']\\s*\\))`,
    "g",
  );
};

let assetFiles;
try {
  assetFiles = (await readdir(assetsDir, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && /\.(?:js|mjs|cjs)$/.test(entry.name))
    .map((entry) => entry.name);
} catch (error) {
  console.error(
    `[web-dist-imports] FAIL: unable to read ${path.relative(repoRoot, assetsDir)}: ${error.message}`,
  );
  process.exit(1);
}

const unresolvedImports = [];
for (const fileName of assetFiles) {
  const source = await readFile(path.join(assetsDir, fileName), "utf8");
  for (const packageName of serverOnlyPackages) {
    if (bareImportPattern(packageName).test(source)) {
      unresolvedImports.push({
        file: path.posix.join("dist/assets", fileName),
        packageName,
      });
    }
  }
}

if (unresolvedImports.length > 0) {
  console.error(
    `[web-dist-imports] FAIL: found ${unresolvedImports.length} unresolved server-only bare import(s):`,
  );
  for (const unresolvedImport of unresolvedImports) {
    console.error(
      `  - ${unresolvedImport.file}: ${unresolvedImport.packageName}`,
    );
  }
  process.exit(1);
}

console.log(
  `[web-dist-imports] PASS: checked ${assetFiles.length} built JavaScript asset(s).`,
);
