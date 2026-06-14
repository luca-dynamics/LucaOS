import { ExtractedLucaLinkDeviceCenter } from "../shared/settings/ExtractedLucaLinkDeviceCenter";
import type { WebLucaLinkStatus } from "./WebRuntimeContext";

export function WebLucaLinkSurface({ status }: { status: WebLucaLinkStatus }) {
  return <ExtractedLucaLinkDeviceCenter status={status} />;
}
