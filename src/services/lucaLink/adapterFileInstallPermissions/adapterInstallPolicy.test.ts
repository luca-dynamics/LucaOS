import { describe, expect, it } from "vitest";
import { evaluateLucaLinkAdapterInstallPolicy } from "./adapterInstallPolicy";
import { LUCA_LINK_ADAPTER_FILE_INSTALL_PERMISSION_FIXTURES } from "./adapterFileInstallFixtures";
import type { LucaLinkAdapterInstallPermissionRequest } from "./adapterFileInstallTypes";
const get = (id: string) => LUCA_LINK_ADAPTER_FILE_INSTALL_PERMISSION_FIXTURES.find((item) => item.requestId === id) as LucaLinkAdapterInstallPermissionRequest;
const evaluate = (id: string) => evaluateLucaLinkAdapterInstallPolicy(get(id), { now: "2029-12-31T00:00:00.000Z" });
describe("adapter install policy", () => {
  it("allows signed manifest metadata to require review without installation", () => { const result = evaluate("signed-adapter-manifest"); expect(result.status).toBe("approval_required"); expect(result.installEnabled).toBe(false); });
  it("rejects unsupported and privileged install shapes", () => { expect(evaluate("remote-url-install").status).toBe("unsupported"); expect(evaluate("shell-required-install").status).toBe("blocked"); expect(evaluate("admin-system-install").status).toBe("blocked"); expect(evaluate("unsigned-unknown-install").status).toBe("blocked"); });
  it.each(["executable_binary", "script_bundle"] as const)("blocks %s packages", (packageKind) => { expect(evaluateLucaLinkAdapterInstallPolicy({ ...get("signed-adapter-manifest"), packageKind }, { now: "2029-12-31" }).status).toBe("blocked"); });
});
