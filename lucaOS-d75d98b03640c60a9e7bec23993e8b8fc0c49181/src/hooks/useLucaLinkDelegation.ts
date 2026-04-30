import { useEffect } from "react";
import { lucaLinkManager } from "../services/lucaLink/manager";
import { ToolRegistry } from "../services/toolRegistry";

/**
 * useLucaLinkDelegation
 *
 * Shared hook that enables a device to:
 * 1. Listen for delegated commands from other devices
 * 2. Execute them using the local ToolRegistry
 * 3. Report the result back to the originator
 *
 * This enables the "One OS" vision where multiple devices act as one.
 */
export function useLucaLinkDelegation(
  currentDeviceId: string | null,
  executeToolFn?: (name: string, args: any) => Promise<string>,
  context?: any,
  callbacks?: {
    onCommandReceived?: (command: string, args: any) => void;
    onCommandComplete?: (
      command: string,
      args: any,
      result?: any,
      error?: any
    ) => void;
  }
) {
  useEffect(() => {
    if (!lucaLinkManager) return;

    const handleCommand = async (event: any) => {
      const { message } = event.data;

      // Only process command messages
      if (message.type === "command" && message.payload) {
        const { command, args } = message.payload;
        const cmdId = message.commandId;
        const source = message.source;

        callbacks?.onCommandReceived?.(command, args);

        console.log(
          `[ONE OS] Received delegated command from ${
            source || "unknown"
          }: ${command}`
        );

        try {
          let result: any;

          // Use provided execute function or fall back to ToolRegistry
          if (executeToolFn) {
            result = await executeToolFn(command, args);
          } else {
            result = await ToolRegistry.execute(command, args, context || {});
          }

          // Send result back to origin (Encrypted)
          if (source) {
            await lucaLinkManager.sendResponse(source, cmdId, {
              result: result,
              deviceId: currentDeviceId || lucaLinkManager.deviceId,
            });
          }

          console.log(
            `[ONE OS] Command "${command}" executed and result sent back.`
          );

          callbacks?.onCommandComplete?.(command, args, result);
        } catch (error: any) {
          console.error(
            `[ONE OS] Delegated command "${command}" failed:`,
            error
          );

          if (source) {
            await lucaLinkManager.sendResponse(source, cmdId, {
              error: error.message || "Execution failed",
              deviceId: currentDeviceId || lucaLinkManager.deviceId,
            });
          }

          callbacks?.onCommandComplete?.(command, args, undefined, error);
        }
      }
    };

    // Listen for incoming commands
    lucaLinkManager.on("command:received", handleCommand);

    return () => {
      lucaLinkManager.off("command:received", handleCommand);
    };
  }, [currentDeviceId, executeToolFn, context]);
}
