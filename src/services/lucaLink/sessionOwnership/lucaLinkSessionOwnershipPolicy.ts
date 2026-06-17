import type {
  LucaLinkSessionHostRole,
  LucaLinkSessionLane,
} from "./lucaLinkSessionOwnershipTypes";

const LANE_ROLE_POLICY: Record<
  LucaLinkSessionLane,
  readonly LucaLinkSessionHostRole[]
> = {
  conversation_owner: ["primary_host", "active_companion"],
  voice_owner: ["primary_host", "active_companion", "voice_relay"],
  display_owner: ["primary_host", "active_companion", "display_surface"],
  approval_owner: ["primary_host"],
  memory_context_owner: ["primary_host", "active_companion"],
  tool_execution_owner: [],
  handoff_owner: ["primary_host"],
};

const READ_ONLY_LANES = new Set<LucaLinkSessionLane>([
  "conversation_owner",
  "voice_owner",
  "display_owner",
]);

const ROLE_PRIORITY: readonly LucaLinkSessionHostRole[] = [
  "primary_host",
  "active_companion",
  "voice_relay",
  "display_surface",
  "execution_candidate",
  "handoff_target",
  "read_only_observer",
  "revoked",
  "blocked",
];

export function isLucaLinkRoleAllowedForLane(
  role: LucaLinkSessionHostRole,
  lane: LucaLinkSessionLane,
): boolean {
  return LANE_ROLE_POLICY[lane].includes(role);
}

export function isLucaLinkReadOnlyLane(
  lane: LucaLinkSessionLane,
): boolean {
  return READ_ONLY_LANES.has(lane);
}

export function getLucaLinkSessionHostRolePriority(
  role: LucaLinkSessionHostRole,
): number {
  return ROLE_PRIORITY.indexOf(role);
}
