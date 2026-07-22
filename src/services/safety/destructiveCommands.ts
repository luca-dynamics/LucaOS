/**
 * Detection of unambiguously destructive shell commands.
 *
 * The constitutional high-risk check used to test whether a command string
 * contained the literal text "RUN_SHELL" — the name of the tool, not anything
 * a real payload would ever say. `rm -rf /` matched nothing.
 *
 * This is a blocklist, so it is necessarily incomplete; it is a backstop, not
 * a sandbox. It is deliberately tuned to avoid false positives: blocking a
 * legitimate `rm -rf ./dist` would train the operator to wave the gate through,
 * which is worse than not having it. Only targets that are catastrophic and
 * essentially never intentional are matched.
 */

export interface DestructiveCommandMatch {
  matched: boolean;
  /** Short identifier of the rule that matched. */
  rule?: string;
  /** Operator-facing explanation. */
  reason?: string;
}

const NO_MATCH: DestructiveCommandMatch = { matched: false };

/** Targets for which a recursive force-delete is never a routine operation. */
const CATASTROPHIC_DELETE_TARGETS = new Set([
  "/",
  "/*",
  "~",
  "~/",
  "~/*",
  "*",
  ".",
  "./*",
  "$home",
  "${home}",
  "%userprofile%",
  "c:",
  "c:\\",
  "c:\\*",
  "/usr",
  "/etc",
  "/var",
  "/boot",
  "/system",
]);

function normalize(command: string): string {
  return (command || "").trim().replace(/\s+/g, " ");
}

/**
 * `rm -rf ./build` is routine; `rm -rf /` is not. Distinguish by target rather
 * than by the flags alone.
 */
function detectCatastrophicDelete(
  normalized: string,
): DestructiveCommandMatch {
  const lower = normalized.toLowerCase();
  const tokens = lower.split(" ");

  for (let i = 0; i < tokens.length; i++) {
    const isRemove =
      tokens[i] === "rm" ||
      tokens[i] === "rmdir" ||
      tokens[i] === "del" ||
      tokens[i] === "rd";
    if (!isRemove) continue;

    const rest = tokens.slice(i + 1);
    // Windows switches look like /s or /q. A bare "/" is the root path, not a
    // switch — conflating the two made the root target invisible.
    const isWindowsSwitch = (t: string) => /^\/[a-z]{1,2}$/.test(t);
    const flags = rest.filter((t) => t.startsWith("-") || isWindowsSwitch(t));
    const flagBlob = flags.join("");

    // POSIX: needs both recursive and force to be the catastrophic shape.
    // Windows del/rd use /s /q for the same effect.
    const isRecursive = /r/.test(flagBlob) || flagBlob.includes("/s");
    const isForced = /f/.test(flagBlob) || flagBlob.includes("/q");
    if (!isRecursive || !isForced) continue;

    const targets = rest.filter(
      (t) => !t.startsWith("-") && !isWindowsSwitch(t),
    );
    if (targets.some((t) => CATASTROPHIC_DELETE_TARGETS.has(t))) {
      return {
        matched: true,
        rule: "catastrophic_delete",
        reason:
          "Recursive force-delete targeting a root, home or wildcard path.",
      };
    }
  }

  return NO_MATCH;
}

interface PatternRule {
  rule: string;
  reason: string;
  test: RegExp;
}

const PATTERN_RULES: PatternRule[] = [
  {
    rule: "filesystem_format",
    reason: "Formats a filesystem or volume.",
    test: /\b(mkfs(\.\w+)?|mke2fs)\b|\bformat\s+[a-z]:/i,
  },
  {
    rule: "raw_disk_write",
    reason: "Writes raw data directly to a block device.",
    test: /\bdd\b[^|;]*\bof=\/dev\/(disk|sd|nvme|hd)/i,
  },
  {
    rule: "remote_code_execution",
    reason: "Pipes downloaded content straight into a shell interpreter.",
    test: /\b(curl|wget)\b[^|]*\|\s*(sudo\s+)?(ba|z|k)?sh\b|\b(iwr|invoke-webrequest)\b[^|]*\|\s*iex\b/i,
  },
  {
    rule: "fork_bomb",
    reason: "Fork bomb — exhausts process table.",
    test: /:\(\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:/,
  },
  {
    rule: "permission_destruction",
    reason: "Recursively strips permissions from a system root.",
    test: /\bchmod\s+(-[a-z]*\s+)*-?r[a-z]*\s+0?777\s+\/(\s|$)|\bchmod\s+0?777\s+-r\s+\/(\s|$)/i,
  },
  {
    rule: "history_or_disk_wipe",
    reason: "Overwrites a disk or wipes system state irreversibly.",
    test: /\bshred\b[^|;]*\/dev\/|\bdiskpart\b[^|;]*\bclean\b/i,
  },
];

export function detectDestructiveCommand(
  command: string,
): DestructiveCommandMatch {
  const normalized = normalize(command);
  if (!normalized) return NO_MATCH;

  const deletion = detectCatastrophicDelete(normalized);
  if (deletion.matched) return deletion;

  for (const rule of PATTERN_RULES) {
    if (rule.test.test(normalized)) {
      return { matched: true, rule: rule.rule, reason: rule.reason };
    }
  }

  return NO_MATCH;
}

/**
 * Pull the command-ish text out of an arbitrary tool parameter bag. Different
 * tools name this field differently, and the old check only ever looked at
 * `params.command`.
 */
export function extractCommandText(params: any): string {
  if (!params || typeof params !== "object") return "";
  const candidates = [
    params.command,
    params.cmd,
    params.script,
    params.shellCommand,
    params.commandLine,
  ].filter((v) => typeof v === "string");

  const args = Array.isArray(params.args)
    ? params.args.filter((a: unknown) => typeof a === "string").join(" ")
    : "";

  return [...candidates, args].filter(Boolean).join(" ").trim();
}
