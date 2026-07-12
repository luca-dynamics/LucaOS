import React from "react";
import type { SandboxFleetArtifactView, SandboxFleetBackendView, SandboxFleetOperatorView, SandboxFleetSessionView } from "../../types/sandboxFleet";

export interface SandboxFleetPanelProps {
  view: SandboxFleetOperatorView;
  busyAction?: string;
  onSwitchSession?: (sessionId: string) => void;
  onSnapshotSession?: (sessionId: string) => void;
  onCleanupExpired?: () => void;
  onEmergencyDestroy?: (sessionId: string) => void;
  onApproveArtifact?: (artifactId: string) => void;
  onRejectArtifact?: (artifactId: string) => void;
}

const tone = (healthy: boolean) => healthy ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100" : "border-amber-400/20 bg-amber-400/10 text-amber-100";

const BackendCard = ({ backend }: { backend: SandboxFleetBackendView }) => <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
  <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-white">{backend.kind}</p><p className="mt-1 text-xs text-white/50">{backend.hostPlatform} · {backend.locality} · {backend.isolationTier}</p></div><span className={`rounded-full border px-2 py-1 text-[11px] ${tone(!backend.blockedReason)}`}>{backend.blockedReason ? "Blocked" : `${backend.remainingSlots} free`}</span></div>
  <p className="mt-3 text-xs text-white/65">{backend.activeSessions}/{backend.capacity} sessions · {backend.guestOs.join(", ")}</p>
  {backend.blockedReason && <p className="mt-2 text-xs text-amber-100/80">{backend.blockedReason}</p>}
</article>;

const SessionCard = ({ session, busyAction, onSwitchSession, onSnapshotSession, onEmergencyDestroy }: { session: SandboxFleetSessionView; busyAction?: string; onSwitchSession?: (id: string) => void; onSnapshotSession?: (id: string) => void; onEmergencyDestroy?: (id: string) => void }) => <article className={`rounded-2xl border p-4 ${session.active ? "border-cyan-300/30 bg-cyan-300/[0.08]" : "border-white/10 bg-white/[0.035]"}`}>
  <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold text-white">{session.guestOs} sandbox</p><p className="mt-1 text-xs text-white/50">{session.imageId} · {session.persistence}</p></div><span className={`rounded-full border px-2 py-1 text-[11px] ${tone(!session.expired)}`}>{session.active ? "Active" : session.status}</span></div>
  {session.expiresAt && <p className="mt-3 text-xs text-white/60">Expires {new Date(session.expiresAt).toLocaleString()}</p>}
  <div className="mt-4 flex flex-wrap gap-2">
    {!session.active && session.switchable && onSwitchSession && <button disabled={Boolean(busyAction)} onClick={() => onSwitchSession(session.sessionId)} className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white disabled:opacity-40">Switch here</button>}
    {session.status !== "destroyed" && onSnapshotSession && <button disabled={Boolean(busyAction) || session.expired} onClick={() => onSnapshotSession(session.sessionId)} className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white disabled:opacity-40">Snapshot</button>}
    {session.emergencyDestroyAllowed && onEmergencyDestroy && <button disabled={Boolean(busyAction)} onClick={() => onEmergencyDestroy(session.sessionId)} className="rounded-lg border border-red-300/25 px-3 py-1.5 text-xs text-red-100 disabled:opacity-40">Destroy</button>}
  </div>
</article>;

const ArtifactRow = ({ artifact, busyAction, onApproveArtifact, onRejectArtifact }: { artifact: SandboxFleetArtifactView; busyAction?: string; onApproveArtifact?: (id: string) => void; onRejectArtifact?: (id: string) => void }) => <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
  <div><p className="text-sm text-white">{artifact.name}</p><p className="mt-1 text-xs text-white/50">{artifact.kind} · scan {artifact.scanStatus} · {artifact.importCount} imports</p>{artifact.blockedReason && <p className="mt-1 text-xs text-amber-100/80">{artifact.blockedReason}</p>}</div>
  {artifact.approvalStatus === "pending" && <div className="flex gap-2">{onRejectArtifact && <button disabled={Boolean(busyAction)} onClick={() => onRejectArtifact(artifact.artifactId)} className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white disabled:opacity-40">Reject</button>}{onApproveArtifact && <button disabled={Boolean(busyAction) || artifact.scanStatus !== "passed"} onClick={() => onApproveArtifact(artifact.artifactId)} className="rounded-lg border border-cyan-300/30 bg-cyan-300/10 px-3 py-1.5 text-xs text-cyan-50 disabled:opacity-40">Approve</button>}</div>}
</div>;

export const SandboxFleetPanel: React.FC<SandboxFleetPanelProps> = ({ view, busyAction, onSwitchSession, onSnapshotSession, onCleanupExpired, onEmergencyDestroy, onApproveArtifact, onRejectArtifact }) => <section aria-label="Sandbox fleet" className="space-y-5 rounded-3xl border border-white/10 bg-black/20 p-5">
  <header className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-100/60">Isolated compute</p><h2 className="mt-1 text-lg font-semibold text-white">Sandbox fleet</h2><p className="mt-1 text-sm text-white/55">Switch environments without granting direct host execution.</p></div><span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs text-emerald-50">Host fallback off</span></header>
  <div><h3 className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-white/45">Backends</h3><div className="grid gap-3 md:grid-cols-2">{view.backends.map((backend) => <BackendCard key={backend.backendId} backend={backend} />)}</div></div>
  <div><div className="mb-2 flex items-center justify-between gap-3"><h3 className="text-xs font-medium uppercase tracking-[0.14em] text-white/45">Sessions</h3>{view.cleanupCount > 0 && onCleanupExpired && <button disabled={Boolean(busyAction)} onClick={onCleanupExpired} className="rounded-lg border border-amber-300/25 px-3 py-1.5 text-xs text-amber-100 disabled:opacity-40">Clean up {view.cleanupCount} expired</button>}</div><div className="grid gap-3 md:grid-cols-2">{view.sessions.map((session) => <SessionCard key={session.sessionId} session={session} busyAction={busyAction} onSwitchSession={onSwitchSession} onSnapshotSession={onSnapshotSession} onEmergencyDestroy={onEmergencyDestroy} />)}</div>{view.sessions.length === 0 && <p className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-white/45">No sandbox sessions for this mission.</p>}</div>
  {view.artifacts.length > 0 && <div><h3 className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-white/45">Artifacts</h3><div className="space-y-2">{view.artifacts.map((artifact) => <ArtifactRow key={artifact.artifactId} artifact={artifact} busyAction={busyAction} onApproveArtifact={onApproveArtifact} onRejectArtifact={onRejectArtifact} />)}</div></div>}
</section>;

export default SandboxFleetPanel;
