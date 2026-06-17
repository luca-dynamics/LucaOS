import { WebLifecycleShell } from "./WebLifecycleShell";
import { WebRuntimeProvider } from "./WebRuntimeContext";

export function WebBridgeShell() {
  return <WebRuntimeProvider><WebLifecycleShell /></WebRuntimeProvider>;
}
