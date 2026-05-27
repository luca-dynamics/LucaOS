import { ComputerUseGuardConfirmationBridge } from "./ComputerUseGuardConfirmationBridge";
import { ComputerUseConfirmationUiBridge } from "./ComputerUseConfirmationUiBridge";

export const createComputerUseConfirmationUiBridge = (bridge = new ComputerUseGuardConfirmationBridge()) => {
  const uiBridge = new ComputerUseConfirmationUiBridge(bridge);
  return {
    bridge: uiBridge,
    getState: uiBridge.getState.bind(uiBridge),
    subscribe: uiBridge.subscribe.bind(uiBridge),
    listPendingConfirmations: uiBridge.listPendingConfirmations.bind(uiBridge),
    approve: uiBridge.approve.bind(uiBridge),
    reject: uiBridge.reject.bind(uiBridge),
    reset: uiBridge.reset.bind(uiBridge),
  };
};
