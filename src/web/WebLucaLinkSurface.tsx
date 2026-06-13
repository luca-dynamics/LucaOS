import { LucaDeviceCenter } from "../shared/settings/LucaDeviceCenter";
import type { WebLucaLinkStatus } from "./WebRuntimeContext";

export function WebLucaLinkSurface({ status }: { status: WebLucaLinkStatus }) {
  return <LucaDeviceCenter status={status} />;
}
