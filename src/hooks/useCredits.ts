import { useState, useEffect } from "react";
import { creditService, ProvisioningMode } from "../services/creditService";
import { eventBus } from "../services/eventBus";

export function useCredits() {
  const [balance, setBalance] = useState(creditService.getBalance());
  const [spent, setSpent] = useState(0);
  const [status, setStatus] = useState(creditService.getStatus());
  const [mode, setMode] = useState<ProvisioningMode>(creditService.getMode());

  useEffect(() => {
    const handleUpdate = (data: any) => {
      setBalance(data.balance);
      setSpent(data.spent);
      setStatus(data.status);
      setMode(data.mode);
    };

    eventBus.on("credit-update", handleUpdate);
    
    // Initial sync
    setBalance(creditService.getBalance());
    setMode(creditService.getMode());
    setStatus(creditService.getStatus());

    return () => {
      eventBus.off("credit-update", handleUpdate);
    };
  }, []);

  return {
    balance,
    spent,
    status,
    mode,
    isPrime: mode === "PRIME",
    isBYOK: mode === "BYOK",
    isLocal: mode === "LOCAL"
  };
}
