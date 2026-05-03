export function createHostSystemSnapshot(osModule) {
  return {
    platform: osModule.platform(),
    arch: osModule.arch(),
    cpus: osModule.cpus().length,
    freeMem: osModule.freemem(),
    totalMem: osModule.totalmem(),
    uptime: osModule.uptime(),
  };
}

export function calculateOverallAuditStatus(results = []) {
  if (results.some((result) => result.status === "fail")) return "critical";
  if (results.some((result) => result.status === "warn")) return "degraded";
  return "healthy";
}
