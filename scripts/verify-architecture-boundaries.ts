import * as fs from "fs";
import * as path from "path";

const FORBIDDEN_TERMS = ["Orb", "Shader", "Canvas", "ThreeJS", "WebGPU", "Face", "Avatar"];
const PRESENCE_ENGINE_DIR = path.resolve(process.cwd(), "packages/presence-engine/src");

export function verifyArchitectureBoundaries(): boolean {
  console.log("🔍 Running Automated CI Architecture Boundary Checker...");
  let violations = 0;

  const expressionStatePath = path.join(PRESENCE_ENGINE_DIR, "ExpressionState.ts");
  if (!fs.existsSync(expressionStatePath)) {
    console.error(`❌ Missing file: ${expressionStatePath}`);
    return false;
  }

  const content = fs.readFileSync(expressionStatePath, "utf-8");
  for (const term of FORBIDDEN_TERMS) {
    // Check if ExpressionState imports or references renderer terms
    const regex = new RegExp(`\\b${term}\\b`, "g");
    if (regex.test(content)) {
      console.error(`❌ ARCHITECTURE VIOLATION: ExpressionState.ts contains forbidden renderer term '${term}'`);
      violations++;
    }
  }

  if (violations === 0) {
    console.log("✅ CI Architecture Boundary Check Passed: ExpressionState is 100% Renderer-Agnostic!");
    return true;
  } else {
    console.error(`❌ Boundary Check Failed with ${violations} violations.`);
    return false;
  }
}

const success = verifyArchitectureBoundaries();
if (!success) process.exit(1);
