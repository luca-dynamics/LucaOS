const BrowserEventSource =
  typeof EventSource !== "undefined"
    ? EventSource
    : class LucaUnavailableEventSource {
        constructor() {
          throw new Error(
            "EventSource is unavailable in this browser-safe LucaOS build.",
          );
        }
      };

export { BrowserEventSource as EventSource };
export default BrowserEventSource;
