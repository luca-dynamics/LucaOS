/**
 * LucaLink relay boundary.
 *
 * The Socket.IO-backed client remains the runtime implementation, but this is
 * now its only import boundary for the manager. Keeping the concrete adapter
 * behind this module lets the transport implementation move later without a
 * second application-wide migration.
 */
import { lucaLink as relayImplementation } from "./relayClientAdapter";

export type LucaLinkRelayImplementation = typeof relayImplementation;

export const lucaLinkRelayBoundary: LucaLinkRelayImplementation =
  relayImplementation;

export type {
  LucaLinkDevice,
  LucaLinkMessage,
  LucaLinkState,
} from "./relayClientAdapter";
