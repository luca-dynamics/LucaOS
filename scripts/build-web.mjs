#!/usr/bin/env node
import { spawn } from "node:child_process";

const npmExecPath = process.env.npm_execpath;
const npmCommand = npmExecPath ? process.execPath : process.platform === "win32" ? "npm.cmd" : "npm";

const buildEnv = {
  ...process.env,
  VITE_LUCA_RELEASE_TARGET: "web",
  VITE_LUCA_RUNTIME_TARGET: "vercel",
};

const nodeOptions = buildEnv.NODE_OPTIONS ?? "";
if (!nodeOptions.includes("--max-old-space-size")) {
  buildEnv.NODE_OPTIONS = `${nodeOptions} --max-old-space-size=6144`.trim();
}

const steps = [
  ["run", "verify:web:env"],
  ["run", "verify:web:imports"],
  ["exec", "--", "tsc", "-p", "tsconfig.web.json", "--noEmit"],
  ["exec", "--", "vite", "build"],
  ["run", "verify:web:dist-imports"],
];

const runStep = (args) =>
  new Promise((resolve, reject) => {
    const child = spawn(npmCommand, npmExecPath ? [npmExecPath, ...args] : args, {
      cwd: process.cwd(),
      env: buildEnv,
      shell: false,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      const command = `npm ${args.join(" ")}`;
      reject(
        new Error(
          signal
            ? `[build:web] ${command} stopped with signal ${signal}`
            : `[build:web] ${command} exited with code ${code}`,
        ),
      );
    });
  });

for (const args of steps) {
  await runStep(args);
}
