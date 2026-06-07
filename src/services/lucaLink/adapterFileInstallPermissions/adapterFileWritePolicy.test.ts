import { describe, expect, it } from "vitest";
import { evaluateLucaLinkAdapterFileWritePolicy } from "./adapterFileWritePolicy";
import { LUCA_LINK_ADAPTER_FILE_INSTALL_PERMISSION_FIXTURES } from "./adapterFileInstallFixtures";
import type { LucaLinkAdapterFileWritePermissionRequest } from "./adapterFileInstallTypes";
const get = (id: string) => LUCA_LINK_ADAPTER_FILE_INSTALL_PERMISSION_FIXTURES.find((item) => item.requestId === id) as LucaLinkAdapterFileWritePermissionRequest;
const evaluate = (id: string) => evaluateLucaLinkAdapterFileWritePolicy(get(id), { now: "2029-12-31T00:00:00.000Z" });
describe("adapter file-write policy", () => {
  it("keeps config and sandbox requests review-only", () => {
    expect(evaluate("adapter-config-write").status).toBe("approval_required");
    expect(evaluate("sandbox-temp-write").status).toBe("ready_for_review");
    expect(evaluate("sandbox-temp-write").writeEnabled).toBe(false);
  });
  it("blocks system, executable, unsafe overwrite, and sensitive requests", () => {
    expect(evaluate("system-path-write").status).toBe("blocked");
    expect(evaluate("executable-script-write").status).toBe("blocked");
    expect(evaluate("user-document-overwrite").blockers.join(" ")).toMatch(/backup|Overwrite/);
    expect(evaluateLucaLinkAdapterFileWritePolicy({ ...get("adapter-config-write"), privacyLevel: "sensitive" }, { now: "2029-12-31" }).status).toBe("blocked");
  });
  it("blocks medium risk requests missing provenance evidence", () => {
    const result = evaluateLucaLinkAdapterFileWritePolicy({ ...get("adapter-config-write"), riskLevel: "medium", provenance: "", hash: undefined, signature: undefined }, { now: "2029-12-31" });
    expect(result.status).toBe("blocked");
    expect(result.blockers.join(" ")).toContain("provenance");
  });
});
