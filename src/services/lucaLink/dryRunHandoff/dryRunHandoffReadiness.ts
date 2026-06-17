import type { LucaLinkDryRunHandoffReadiness, LucaLinkDryRunHandoffSimulation } from "./dryRunHandoffTypes";

export function summarizeLucaLinkDryRunHandoffReadiness(
  simulations: readonly LucaLinkDryRunHandoffSimulation[],
): LucaLinkDryRunHandoffReadiness {
  const count = (status: LucaLinkDryRunHandoffSimulation["status"]) => simulations.filter((item) => item.status === status).length;
  return {
    totalSimulations: simulations.length,
    readyForReview: count("ready_for_review"),
    approvalRequired: count("approval_required"),
    blocked: count("blocked"),
    disabled: count("disabled"),
    unsupported: count("unsupported"),
    dryRunOnly: true,
    handoffEnabled: false,
    transportSendEnabled: false,
    adapterExecutionEnabled: false,
    displayOpenEnabled: false,
    sensorCollectionEnabled: false,
    fileWriteEnabled: false,
    installEnabled: false,
    sideEffectsPerformed: false,
    warnings: [...new Set(simulations.flatMap((item) => item.warnings))],
    blockers: [...new Set(simulations.flatMap((item) => item.blockers))],
  };
}
