import { apiUrl, getAuthHeaders } from "../../config/api";
import { detectSurface, sessionTranscript } from "./sessionTranscript";

/**
 * The turn lease: which Surface is currently allowed to drive a turn.
 *
 * Tier 1b made the conversation durable — one core-owned session, an append-only
 * entry table, server-assigned contiguous `seq`. That settled *what* is recorded.
 * It did not settle **who may record.** Attach two Surfaces to the same core and
 * both run their own `TurnRunner` against the same session; the store does
 * exactly its job and produces a perfectly legal, contiguous transcript of two
 * braided conversations, indistinguishable from one. `clientId` does not help —
 * it dedupes a *retry*, not a *rival*.
 *
 * This client is the other half of the `session_leases` table in
 * `cortex/server/services/sessionEntryStore.js`. Two properties define it:
 *
 * 1. **It fails open, by construction.** A `409` is the only answer that refuses
 *    a turn. A network error, a timeout, a `503` from a degraded store, any 5xx,
 *    an unresolved session id — all admit the turn. This is Tier 1b's principle
 *    applied to admission: the guarantee is *never pretend a write succeeded*,
 *    not *refuse to think without a disk*. Written as a single positive check
 *    rather than a list of tolerated failures, so a failure mode nobody
 *    anticipated cannot silence Luca.
 * 2. **It never blocks a cold boot.** The session id is read synchronously from
 *    whatever `sessionTranscript` has already resolved. It is deliberately never
 *    resolved here: `getCurrentSessionId()` awaits `waitForAuth()`, which in
 *    browser development is a flat two seconds, and the send path is the last
 *    place to spend that. No session id also means no transcript is being
 *    written, so there is nothing yet to protect.
 *
 * The lease is **turn-scoped**, not session-scoped: held while a turn is in
 * flight, released when it ends. Two idle Surfaces hold nothing and either may
 * speak, which is what cross-surface continuity means — walking from desktop to
 * web continues the conversation. A session-scoped lease would mean "the first
 * window to open owns Luca," which is a different and worse system. What this
 * forbids is only the thing that actually corrupts the record: two *in-flight*
 * turns.
 */

/** A lease held by someone else, as reported on a refusal. Never carries a token. */
export interface LeaseHolder {
  sessionId: string;
  holderId: string;
  surface: string;
  acquiredAt: number;
  renewedAt: number;
  expiresAt: number;
}

/**
 * Whether this Surface may run a turn. A discriminated union rather than a
 * boolean and a side channel: a caller that checks `admitted` cannot forget to
 * read the reason, and a refusal always carries something to say to the user.
 */
export type TurnAdmission =
  | { admitted: true }
  | { admitted: false; message: string; holder: LeaseHolder | null };

export interface SessionLeaseStatus {
  sessionId: string | null;
  holderId: string;
  surface: string;
  /** True while this Surface believes it holds the lease. */
  held: boolean;
  /** Turns currently relying on the lease; the release only fires at zero. */
  activeTurns: number;
  expiresAt: number | null;
  /** A renewal was refused mid-turn — briefly, there were two drivers. */
  lost: boolean;
  /**
   * Turns admitted without an enforceable lease because the core could not be
   * reached. Counted rather than ignored: running unprotected is the correct
   * behaviour, but it should never be an invisible one.
   */
  unenforced: number;
  lastError: string | null;
}

/**
 * Where the status is published, mirroring `__LUCA_TRANSCRIPT_STATUS` and
 * `__LUCA_DB_STATUS`.
 *
 * An explicit intersection rather than `declare global { var … }`: under this
 * repo's `tsconfig` that augmentation does not attach to `typeof globalThis`,
 * `tsc` reports TS7017 at every access, and the property is silently an implicit
 * `any` — the untyped seam Invariant 6 rules out. See the same note in
 * `sessionTranscript.ts`.
 */
type LeaseStatusHost = typeof globalThis & {
  __LUCA_SESSION_LEASE?: SessionLeaseStatus;
};

const statusHost = (): LeaseStatusHost => globalThis as LeaseStatusHost;

/** The last published lease status, readable without holding a reference. */
export function publishedLeaseStatus(): SessionLeaseStatus | undefined {
  return statusHost().__LUCA_SESSION_LEASE;
}

/**
 * How long the core honours a lease without a renewal. Several times the renewal
 * interval on purpose: a live holder stalled by a garbage collection, a slow
 * disk, or a long provider call must not lose its lease to a rival.
 */
export const LEASE_TTL_MS = 45_000;

/**
 * How often a held lease is renewed while a turn runs.
 *
 * A timer rather than a renewal at each tool-round boundary, because the longest
 * wait inside a turn is not between rounds — it is inside the operator's
 * approval gate (`useToolOrchestrator.ts`), which waits indefinitely for a human
 * to click. A turn paused on a permission prompt is still very much alive and
 * must keep its claim.
 */
export const RENEW_INTERVAL_MS = 15_000;

/**
 * Ceiling on how long admission may delay the start of a turn.
 *
 * A *hung* core is the case this exists for: `fetch` against a process that
 * accepted the socket and then stopped answering never rejects on its own. Same
 * idiom and value as the reachability probe in `llm/ProviderFactory.ts`.
 */
export const ACQUIRE_TIMEOUT_MS = 1_500;

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

/** "3s ago" / "2m ago" — enough for a person to tell live from abandoned. */
function ago(timestamp: number, now: number): string {
  const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.round(seconds / 60)}m ago`;
}

/**
 * What the user is told when another Surface is driving.
 *
 * It names the other body and when it was last alive, because "try again later"
 * is not an explanation — and it says the wait is bounded, since the most likely
 * reason for a refusal that will not clear is a window that has already gone.
 */
function describeRefusal(holder: LeaseHolder | null, now: number): string {
  if (!holder) {
    return "Luca is already answering on another surface. This one will be free again in a moment.";
  }
  return (
    `Luca is already answering on another surface (${holder.surface}, last active ` +
    `${ago(holder.renewedAt, now)}). Send this again when that turn finishes — or, ` +
    `if that surface has closed, within the minute.`
  );
}

/** Parse the `holder` a 409 carries, without trusting its shape. */
function toHolder(value: unknown): LeaseHolder | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.holderId !== "string" || typeof raw.surface !== "string") return null;
  return {
    sessionId: typeof raw.sessionId === "string" ? raw.sessionId : "",
    holderId: raw.holderId,
    surface: raw.surface,
    acquiredAt: Number(raw.acquiredAt) || 0,
    renewedAt: Number(raw.renewedAt) || 0,
    expiresAt: Number(raw.expiresAt) || 0,
  };
}

class SessionLease {
  /**
   * This Surface instance, opaque and stable for its lifetime. A reload is a new
   * holder, which is correct: it is a new body, and the old one's claim should
   * lapse rather than be inherited.
   */
  private readonly holderId = `holder_${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  private readonly surface = detectSurface();

  /** The session the current lease is against — not necessarily the current one. */
  private leasedSessionId: string | null = null;
  private token: string | null = null;
  private expiresAt: number | null = null;
  private activeTurns = 0;
  private renewTimer: ReturnType<typeof setInterval> | null = null;
  private renewing: Promise<void> | null = null;
  private lost = false;
  private unenforced = 0;
  private lastError: string | null = null;

  /**
   * Ask permission to run a turn. Never throws, never rejects.
   *
   * Admission is granted unless the core explicitly says another Surface is
   * driving. Everything else — no session id yet, no core, a hung core, a
   * degraded store, an unexpected status — admits the turn and is counted as
   * unenforced.
   */
  async acquireForTurn(): Promise<TurnAdmission> {
    const admit = (): TurnAdmission => {
      this.activeTurns += 1;
      this.publish();
      return { admitted: true };
    };

    try {
      // Read, never resolve: resolving would await `waitForAuth()` and put a
      // two-second boot wait on the send path. See the file header.
      const sessionId = sessionTranscript.status().sessionId;
      if (!sessionId) {
        this.noteUnenforced("no session id resolved yet");
        return admit();
      }

      const response = await fetch(
        apiUrl(`/api/session/${encodeURIComponent(sessionId)}/lease`),
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            holderId: this.holderId,
            surface: this.surface,
            ttlMs: LEASE_TTL_MS,
          }),
          signal: AbortSignal.timeout(ACQUIRE_TIMEOUT_MS),
        },
      );

      // The one refusal. Everything below this line admits the turn.
      if (response.status === 409) {
        const body = (await response.json().catch(() => null)) as {
          holder?: unknown;
        } | null;
        const holder = toHolder(body?.holder);
        this.lastError = `lease held by ${holder?.surface ?? "another surface"}`;
        this.publish();
        return {
          admitted: false,
          message: describeRefusal(holder, Date.now()),
          holder,
        };
      }

      if (!response.ok) {
        this.noteUnenforced(`lease -> HTTP ${response.status}`);
        return admit();
      }

      const body = (await response.json().catch(() => null)) as {
        lease?: { token?: string; expiresAt?: number };
      } | null;
      const token = body?.lease?.token;
      if (typeof token !== "string") {
        this.noteUnenforced("lease response carried no token");
        return admit();
      }

      this.leasedSessionId = sessionId;
      this.token = token;
      this.expiresAt = Number(body?.lease?.expiresAt) || null;
      this.lost = false;
      this.lastError = null;
      this.startRenewing();
      return admit();
    } catch (error) {
      // Includes the abort from ACQUIRE_TIMEOUT_MS and a core that is simply not
      // there. Both mean the same thing: nothing can tell us we are in conflict,
      // so we proceed and say we did.
      this.noteUnenforced(describeError(error));
      return admit();
    }
  }

  /**
   * Finish with the lease. Safe to call whether or not one was ever acquired.
   *
   * Refcounted, so two turns overlapping inside one window cannot have the inner
   * one's completion drop the outer one's claim. The renewal timer is stopped and
   * any renewal already in flight is awaited *before* the release, or that
   * in-flight request could land after the delete and resurrect the lease for a
   * full TTL after the turn ended — blocking the other Surface for no reason.
   */
  async releaseAfterTurn(): Promise<void> {
    try {
      this.activeTurns = Math.max(0, this.activeTurns - 1);
      if (this.activeTurns > 0) {
        this.publish();
        return;
      }

      this.stopRenewing();
      if (this.renewing) await this.renewing.catch(() => undefined);

      const sessionId = this.leasedSessionId;
      const token = this.token;
      this.leasedSessionId = null;
      this.token = null;
      this.expiresAt = null;
      this.publish();
      if (!sessionId || !token) return;

      // Best effort. A release that does not land costs one TTL of waiting for
      // the next Surface, never correctness — and the token check on the server
      // means a lease we already lost cannot be deleted out from under its new
      // holder.
      await fetch(apiUrl(`/api/session/${encodeURIComponent(sessionId)}/lease`), {
        method: "DELETE",
        headers: getAuthHeaders(),
        body: JSON.stringify({ holderId: this.holderId, token }),
        signal: AbortSignal.timeout(ACQUIRE_TIMEOUT_MS),
      });
    } catch (error) {
      this.lastError = describeError(error);
      this.publish();
    }
  }

  status(): SessionLeaseStatus {
    return {
      sessionId: this.leasedSessionId,
      holderId: this.holderId,
      surface: this.surface,
      held: !!this.token,
      activeTurns: this.activeTurns,
      expiresAt: this.expiresAt,
      lost: this.lost,
      unenforced: this.unenforced,
      lastError: this.lastError,
    };
  }

  /** Stop the renewal timer. For tests and teardown. */
  stop(): void {
    this.stopRenewing();
  }

  private startRenewing(): void {
    if (this.renewTimer) return;
    this.renewTimer = setInterval(() => {
      // Kept on the instance rather than awaited here: `releaseAfterTurn` needs
      // to be able to wait for a renewal that is already in flight.
      this.renewing = this.renew().finally(() => {
        this.renewing = null;
      });
    }, RENEW_INTERVAL_MS);
  }

  private stopRenewing(): void {
    if (this.renewTimer) {
      clearInterval(this.renewTimer);
      this.renewTimer = null;
    }
  }

  /**
   * Extend the claim. The same route as acquire, so a renewal lost to a blip is
   * retried by the next tick rather than being refused by our own earlier lease.
   *
   * A 409 here means our lease lapsed and another Surface took it while a turn of
   * ours is still running. That is logged loudly and recorded as `lost`, and the
   * turn is **not** killed: aborting an in-flight turn would discard real work
   * without un-braiding anything, since the other Surface is writing either way.
   * A lease governs whether a turn may *start*. Ending one already in flight
   * needs the core to own the turn — RFC-0006, stages 2 onward.
   */
  private async renew(): Promise<void> {
    const sessionId = this.leasedSessionId;
    if (!sessionId || !this.token) return;

    try {
      const response = await fetch(
        apiUrl(`/api/session/${encodeURIComponent(sessionId)}/lease`),
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            holderId: this.holderId,
            surface: this.surface,
            ttlMs: LEASE_TTL_MS,
          }),
          signal: AbortSignal.timeout(ACQUIRE_TIMEOUT_MS),
        },
      );

      if (response.status === 409) {
        this.lost = true;
        this.lastError = "renewal refused: another surface took the lease";
        this.publish();
        console.error(
          "[LEASE] This surface lost the turn lease mid-turn — another surface is now driving " +
            "the session. The current turn will finish, but its entries may interleave with theirs.",
        );
        return;
      }

      if (!response.ok) {
        this.lastError = `renew -> HTTP ${response.status}`;
        this.publish();
        return;
      }

      const body = (await response.json().catch(() => null)) as {
        lease?: { expiresAt?: number };
      } | null;
      this.expiresAt = Number(body?.lease?.expiresAt) || this.expiresAt;
      this.lastError = null;
      this.publish();
    } catch (error) {
      // A failed renewal is not yet a lost lease: the TTL leaves room for two
      // more attempts before the core stops honouring the claim.
      this.lastError = describeError(error);
      this.publish();
    }
  }

  /** A turn ran without an enforceable lease. Correct, but never silent. */
  private noteUnenforced(reason: string): void {
    this.unenforced += 1;
    this.lastError = reason;
    this.publish();
  }

  private publish(): void {
    statusHost().__LUCA_SESSION_LEASE = this.status();
  }
}

export { SessionLease };
export const sessionLease = new SessionLease();
