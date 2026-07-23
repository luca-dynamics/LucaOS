import { useEffect } from "react";
import { lucaLinkManager } from "../services/lucaLink/manager";
import { ToolRegistry, TOOL_CONFIGS, SecurityLevel } from "../services/toolRegistry";

/**
 * A command arriving from another device is the most untrusted execution
 * source in the app: it crosses the network and the receiving device has no
 * UI here to raise a biometric/confirmation gate. `ToolRegistry.execute`
 * performs no security-level check of its own, so delegated commands are
 * capped to LEVEL_0 (no-auth, read-only) tools and nothing else — well below
 * the LEVEL_1 a local script gets. Anything unknown or higher is rejected.
 */
const MAX_DELEGATED_TOOL_LEVEL = SecurityLevel.LEVEL_0;

/** Tools that must never be reachable via delegation regardless of level. */
const DELEGATION_DENYLIST = new Set<string>([
  "execute_script",
  "invokeAnyTool",
]);

export function isDelegatableCommand(command: string): boolean {
  if (!command || DELEGATION_DENYLIST.has(command)) return false;
  const config = TOOL_CONFIGS[command];
  if (!config) return false; // unknown / unvetted → denied
  return config.level <= MAX_DELEGATED_TOOL_LEVEL;
}

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

        // Authorize the delegated command BEFORE any execution path. A remote
        // peer must not be able to reach elevated or unvetted tools (or the
        // script executor) ungated, whichever execute function is in use.
        if (!isDelegatableCommand(command)) {
          const reason = `Delegated command "${command}" is not permitted remotely: it is unknown, above the delegation authorization level (LEVEL_0), or explicitly blocked.`;
          console.warn(`[ONE OS] ${reason}`);
          if (source) {
            await lucaLinkManager.sendResponse(source, cmdId, {
              error: reason,
              deviceId: currentDeviceId || lucaLinkManager.deviceId,
            });
          }
          callbacks?.onCommandComplete?.(
            command,
            args,
            undefined,
            new Error(reason),
          );
          return;
        }

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
