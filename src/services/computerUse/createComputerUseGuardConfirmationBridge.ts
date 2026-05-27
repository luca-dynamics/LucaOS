import { ComputerUseGuardConfirmationBridge } from "./ComputerUseGuardConfirmationBridge";
import { ComputerUseGuardConfirmationBridgeOptions } from "./types";

export const createComputerUseGuardConfirmationBridge = (options: ComputerUseGuardConfirmationBridgeOptions = {}) => {
  const bridge = new ComputerUseGuardConfirmationBridge(options);
  return {
    bridge,
    createRequest: bridge.createRequest.bind(bridge),
    approve: bridge.approve.bind(bridge),
    reject: bridge.reject.bind(bridge),
    getSnapshot: bridge.getSnapshot.bind(bridge),
    reset: bridge.reset.bind(bridge),
  };
};
