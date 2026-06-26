import { useEffect, useState } from "react";
import {
  checkConfiguredLocalEndpoint,
  type LucaLocalEndpointStatus,
} from "../services/llm/lucaLocalEndpointService";

/**
 * useLucaLocalEndpointStatus — React hook that probes the configured
 * OpenAI-compatible local endpoint (LocalAI / local Ollama shim / remote) and
 * exposes a loading/status result for the local-intelligence onboarding moment
 * to consume (the live tail data wiring over L3's lucaLocalEndpointService).
 *
 * It only reads (probes) the endpoint; it starts/installs/persists nothing and
 * changes no provider routing. The probe function is injectable so it can be
 * tested without the settings/native chain, and disabled hosts (web/Capacitor
 * with no endpoint) can skip the probe entirely.
 */

const NOT_CONFIGURED: LucaLocalEndpointStatus = {
  configured: false,
  servedCuratedModels: [],
};

export interface UseLucaLocalEndpointStatusOptions {
  /** When false, the hook skips probing and reports a not-configured status. */
  enabled?: boolean;
  /** Override the probe (defaults to L3's checkConfiguredLocalEndpoint). */
  check?: () => Promise<LucaLocalEndpointStatus>;
}

export interface UseLucaLocalEndpointStatusResult {
  loading: boolean;
  status: LucaLocalEndpointStatus;
  refresh: () => void;
}

export function useLucaLocalEndpointStatus(
  options: UseLucaLocalEndpointStatusOptions = {},
): UseLucaLocalEndpointStatusResult {
  const enabled = options.enabled ?? true;
  const check = options.check ?? checkConfiguredLocalEndpoint;

  const [loading, setLoading] = useState<boolean>(enabled);
  const [status, setStatus] = useState<LucaLocalEndpointStatus>(NOT_CONFIGURED);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setStatus(NOT_CONFIGURED);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    check()
      .then((result) => {
        if (!cancelled) {
          setStatus(result);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus(NOT_CONFIGURED);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, check, tick]);

  return { loading, status, refresh: () => setTick((value) => value + 1) };
}
