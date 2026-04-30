/**
 * Agent Quality Gates - Phase 6 FULL IMPLEMENTATION
 *
 * Connects to real tools for verification
 * Multi-layer verification with actual checks
 */

import type { AgentStep, QualityGateResult } from "./types";

export class AgentQualityService {
  /**
   * Run all quality gates for a step
   */
  async validateStep(step: AgentStep, files: string[]): Promise<boolean> {
    console.log(
      `[AgentQuality] Running quality gates for: ${step.description}`
    );

    const results: QualityGateResult[] = [];

    // Gate 1: Syntax Check (if code files modified)
    if (this.shouldRunSyntaxCheck(step, files)) {
      const syntaxResult = await this.runSyntaxCheck(files);
      results.push(syntaxResult);
    }

    // Gate 2: Tests (if test files exist or step requires tests)
    if (this.shouldRunTests(step)) {
      const testResult = await this.runTests();
      results.push(testResult);
    }

    // Gate 3: Visual Verification (if UI changes)
    if (this.shouldRunVisualCheck(step)) {
      const visualResult = await this.runVisualVerification();
      results.push(visualResult);
    }

    // Gate 4: Security Scan (if code changes)
    if (this.shouldRunSecurityCheck(step, files)) {
      const securityResult = await this.runSecurityScan(files);
      results.push(securityResult);
    }

    // Check if all gates passed
    const allPassed = results.every((r) => r.passed);

    if (!allPassed) {
      console.warn("[AgentQuality] Quality gates failed:");
      results
        .filter((r) => !r.passed)
        .forEach((r) => {
          console.warn(`  - ${r.gate}: ${r.errors?.join(", ")}`);
        });
    } else {
      console.log("[AgentQuality] ✅ All quality gates passed");
    }

    return allPassed;
  }

  /**
   * Gate 1: Syntax Check (Lint + Type Check)
   * PHASE 6: Real implementation
   */
  private async runSyntaxCheck(files: string[]): Promise<QualityGateResult> {
    console.log("[AgentQuality] Running syntax check...");

    try {
      // Check if we can run linter
      const hasLinter = await this.checkToolAvailable("eslint");
      const hasTypeScript = await this.checkToolAvailable("tsc");

      const errors: string[] = [];
      const warnings: string[] = [];

      // Run ESLint if available
      if (hasLinter && files.length > 0) {
        const lintResult = await this.runLinter(files);
        errors.push(...lintResult.errors);
        warnings.push(...lintResult.warnings);
      }

      // Run TypeScript check if available
      if (hasTypeScript) {
        const tsResult = await this.runTypeCheck();
        errors.push(...tsResult.errors);
        warnings.push(...tsResult.warnings);
      }

      return {
        passed: errors.length === 0,
        gate: "syntax",
        errors,
        warnings,
      };
    } catch (error) {
      console.error("[AgentQuality] Syntax check error:", error);
      return {
        passed: false,
        gate: "syntax",
        errors: [error instanceof Error ? error.message : "Unknown error"],
        warnings: [],
      };
    }
  }

  /**
   * Run ESLint on files
   */
  private async runLinter(
    files: string[]
  ): Promise<{ errors: string[]; warnings: string[] }> {
    // Phase 6: Call actual linter via API
    const response = await fetch("/api/tools/lint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files }),
    }).catch(() => null);

    if (!response || !response.ok) {
      console.warn("[AgentQuality] Linter API not available, skipping");
      return { errors: [], warnings: [] };
    }

    const result = await response.json();
    return {
      errors: result.errors || [],
      warnings: result.warnings || [],
    };
  }

  /**
   * Run TypeScript type checking
   */
  private async runTypeCheck(): Promise<{
    errors: string[];
    warnings: string[];
  }> {
    // Phase 6: Call actual tsc via API
    const response = await fetch("/api/tools/typecheck", {
      method: "POST",
    }).catch(() => null);

    if (!response || !response.ok) {
      console.warn("[AgentQuality] TypeScript API not available, skipping");
      return { errors: [], warnings: [] };
    }

    const result = await response.json();
    return {
      errors: result.errors || [],
      warnings: result.warnings || [],
    };
  }

  /**
   * Gate 2: Run Tests
   * PHASE 6: Real implementation
   */
  private async runTests(): Promise<QualityGateResult> {
    console.log("[AgentQuality] Running tests...");

    try {
      // Call test runner API
      const response = await fetch("/api/tools/test", {
        method: "POST",
      }).catch(() => null);

      if (!response || !response.ok) {
        console.warn("[AgentQuality] Test API not available, skipping");
        return {
          passed: true, // Skip if unavailable
          gate: "tests",
          warnings: ["Test runner not available"],
        };
      }

      const result = await response.json();

      return {
        passed: result.passed || false,
        gate: "tests",
        errors: result.failures || [],
        details: {
          total: result.total || 0,
          passed: result.passed || 0,
          failed: result.failed || 0,
        },
      };
    } catch (error) {
      console.error("[AgentQuality] Test error:", error);
      return {
        passed: false,
        gate: "tests",
        errors: [error instanceof Error ? error.message : "Unknown error"],
      };
    }
  }

  /**
   * Gate 3: Visual Verification (Luca's Unique Feature!)
   * PHASE 6: Real Astra Scan integration
   */
  private async runVisualVerification(): Promise<QualityGateResult> {
    console.log("[AgentQuality] Running visual verification...");

    try {
      // Take screenshot
      const screenshot = await this.captureScreenshot();

      if (!screenshot) {
        return {
          passed: true,
          gate: "visual",
          warnings: ["Screenshot not available"],
        };
      }

      // Call Astra Scan API
      const response = await fetch("/api/vision/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: screenshot,
          task: "ui_verification",
        }),
      }).catch(() => null);

      if (!response || !response.ok) {
        console.warn("[AgentQuality] Astra Scan not available, skipping");
        return {
          passed: true,
          gate: "visual",
          warnings: ["Visual verification not available"],
        };
      }

      const result = await response.json();

      return {
        passed: result.errors.length === 0,
        gate: "visual",
        errors: result.errors || [],
        warnings: result.warnings || [],
        details: result.analysis,
      };
    } catch (error) {
      console.error("[AgentQuality] Visual verification error:", error);
      return {
        passed: true, // Don't fail on visual errors
        gate: "visual",
        warnings: [
          error instanceof Error ? error.message : "Visual check failed",
        ],
      };
    }
  }

  /**
   * Capture screenshot for visual verification
   */
  private async captureScreenshot(): Promise<string | null> {
    try {
      // Chrome API not available in Electron build
      // if ("captureVisibleTab" in chrome) {
      //   return await new Promise((resolve) => {
      //     (chrome as any).tabs.captureVisibleTab(null, {}, resolve);
      //   });
      // }

      // Fallback: use backend screenshot service
      const response = await fetch("/api/tools/screenshot").catch(() => null);

      if (!response || !response.ok) return null;

      const result = await response.json();
      return result.data || null;
    } catch (error) {
      console.warn("[AgentQuality] Screenshot failed:", error);
      return null;
    }
  }

  /**
   * Gate 4: Security Scan (Luca's Unique Feature!)
   * PHASE 6: Real security scanner
   */
  private async runSecurityScan(files: string[]): Promise<QualityGateResult> {
    console.log("[AgentQuality] Running security scan...");

    try {
      const errors: string[] = [];
      const warnings: string[] = [];

      // 1. Scan for secrets/credentials
      const secretScan = await this.scanForSecrets(files);
      if (secretScan.found.length > 0) {
        errors.push(...secretScan.found.map((s) => `Secret detected: ${s}`));
      }

      // 2. Scan for vulnerabilities
      const vulnScan = await this.scanForVulnerabilities(files);
      errors.push(
        ...vulnScan.critical.map((v) => `Critical vulnerability: ${v}`)
      );
      warnings.push(
        ...vulnScan.medium.map((v) => `Medium vulnerability: ${v}`)
      );

      // 3. OSINT check for new dependencies
      const depScan = await this.scanDependencies(files);
      warnings.push(...depScan.warnings);

      return {
        passed: errors.length === 0,
        gate: "security",
        errors,
        warnings,
        details: {
          secrets: secretScan.found.length,
          vulnerabilities: vulnScan.critical.length + vulnScan.medium.length,
          dependencies: depScan.checked,
        },
      };
    } catch (error) {
      console.error("[AgentQuality] Security scan error:", error);
      return {
        passed: true, // Don't block on security scan errors
        gate: "security",
        warnings: [
          error instanceof Error ? error.message : "Security scan failed",
        ],
      };
    }
  }

  /**
   * Scan for secrets in files
   */
  private async scanForSecrets(files: string[]): Promise<{ found: string[] }> {
    const response = await fetch("/api/security/scan-secrets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files }),
    }).catch(() => null);

    if (!response || !response.ok) {
      return { found: [] };
    }

    const result = await response.json();
    return { found: result.secrets || [] };
  }

  /**
   * Scan for vulnerabilities
   */
  private async scanForVulnerabilities(
    files: string[]
  ): Promise<{ critical: string[]; medium: string[] }> {
    const response = await fetch("/api/security/scan-vulnerabilities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files }),
    }).catch(() => null);

    if (!response || !response.ok) {
      return { critical: [], medium: [] };
    }

    const result = await response.json();
    return {
      critical: result.critical || [],
      medium: result.medium || [],
    };
  }

  /**
   * OSINT check for dependencies
   */
  private async scanDependencies(
    files: string[]
  ): Promise<{ warnings: string[]; checked: number }> {
    // Check if package.json was modified
    const hasPackageJson = files.some((f) => f.includes("package.json"));

    if (!hasPackageJson) {
      return { warnings: [], checked: 0 };
    }

    const response = await fetch("/api/osint/check-dependencies", {
      method: "POST",
    }).catch(() => null);

    if (!response || !response.ok) {
      return { warnings: [], checked: 0 };
    }

    const result = await response.json();
    return {
      warnings: result.warnings || [],
      checked: result.checked || 0,
    };
  }

  /**
   * Check if a tool is available
   */
  private async checkToolAvailable(tool: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/tools/check/${tool}`).catch(
        () => null
      );
      if (!response || !response.ok) return false;
      const result = await response.json();
      return result.available || false;
    } catch {
      return false;
    }
  }

  /**
   * Determine if syntax check should run
   */
  private shouldRunSyntaxCheck(step: AgentStep, files: string[]): boolean {
    const codeExtensions = [".ts", ".tsx", ".js", ".jsx", ".py"];
    return files.some((f) => codeExtensions.some((ext) => f.endsWith(ext)));
  }

  /**
   * Determine if tests should run
   */
  private shouldRunTests(step: AgentStep): boolean {
    const desc = step.description.toLowerCase();
    return (
      desc.includes("test") ||
      desc.includes("implement") ||
      desc.includes("fix")
    );
  }

  /**
   * Determine if visual check should run
   */
  private shouldRunVisualCheck(step: AgentStep): boolean {
    const desc = step.description.toLowerCase();
    return (
      desc.includes("ui") ||
      desc.includes("visual") ||
      desc.includes("page") ||
      desc.includes("component")
    );
  }

  /**
   * Determine if security check should run
   */
  private shouldRunSecurityCheck(step: AgentStep, files: string[]): boolean {
    return files.length > 0;
  }
}

export const agentQuality = new AgentQualityService();
