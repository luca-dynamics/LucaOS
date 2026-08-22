/**
 * Decides whether a fetch target is LucaOS's own core server.
 *
 * This is the single question that gates whether `X-LUCA-TOKEN` is attached, so
 * it lives here as a pure function rather than as a boolean expression buried in
 * `api.ts`'s fetch monkey-patch — the decision is testable, and the reason each
 * clause exists is written down next to it.
 *
 * The rule it enforces: the token goes to the core's own origin and nowhere else.
 * Ollama (`127.0.0.1:11434`) and the host-native GGUF API server are separate
 * processes on the same loopback interface; neither may ever receive it.
 */
export interface LucaApiOriginContext {
  /** Configured API origin. `""` in Vite dev, where calls go through the proxy. */
  apiBaseUrl: string;
  /**
   * The core's live port. The shell allocates this EPHEMERALLY, so it is not
   * `3002` on a desktop run and must be read at request time, never assumed.
   */
  corePort: string;
  /** LAN host when paired to another desktop, else `null`. */
  linkedHostIp: string | null;
  /** False on public web targets, where loopback must not be trusted at all. */
  allowLoopback: boolean;
}

export const isLucaApiUrl = (
  url: string,
  ctx: LucaApiOriginContext,
): boolean => {
  if (ctx.apiBaseUrl !== "" && url.includes(ctx.apiBaseUrl)) return true;

  // Vite dev serves the renderer and proxies relative /api calls to the core.
  if (url.startsWith("/api")) return true;

  if (!ctx.allowLoopback) return false;

  // Scoped to the core's OWN port. This clause used to test the literal
  // `127.0.0.1:3002`; once the shell moved to ephemeral ports it stopped matching
  // anything, no token was attached, and every gated route answered 401.
  if (
    ctx.corePort &&
    (url.includes(`127.0.0.1:${ctx.corePort}`) ||
      url.includes(`localhost:${ctx.corePort}`))
  ) {
    return true;
  }

  // A paired desktop over LAN. Deliberately unchanged: it matches the host
  // without a port, which also covers Cortex and the mobile relay on that host.
  // Note this means a stored `LUCA_LINKED_HOST_IP` of "127.0.0.1" — a value the
  // rest of this module explicitly tolerates — widens to every loopback port,
  // Ollama included. Narrowing it needs a LAN pairing run to verify, so it is
  // tracked separately rather than guessed at here.
  if (ctx.linkedHostIp && url.includes(ctx.linkedHostIp)) return true;

  return false;
};
