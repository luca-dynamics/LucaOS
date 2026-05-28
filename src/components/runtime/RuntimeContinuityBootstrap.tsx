import React, { useEffect } from "react";
import { runtimeContinuityLoopService } from "../../services/runtime/RuntimeContinuityLoopService";

interface RuntimeContinuityBootstrapProps {
  reason?: string;
  stopOnUnmount?: boolean;
}

export const RuntimeContinuityBootstrap: React.FC<RuntimeContinuityBootstrapProps> = ({
  reason = "app_mount",
  stopOnUnmount = true,
}) => {
  useEffect(() => {
    try {
      runtimeContinuityLoopService.resume(reason);
    } catch (error) {
      console.warn("[RuntimeContinuityBootstrap] Safe resume failed", error);
    }

    return () => {
      if (!stopOnUnmount) return;
      try {
        runtimeContinuityLoopService.stop("app_unmount");
      } catch (error) {
        console.warn("[RuntimeContinuityBootstrap] Safe stop failed", error);
      }
    };
  }, [reason, stopOnUnmount]);

  return null;
};

export default RuntimeContinuityBootstrap;
