// The Charter of Luca.
//
// `foundation/LUCA.md` is the canonical operating charter that constitutes Luca —
// the agentic system this OS hosts. It is imported here as raw text so the charter
// is LOAD-BEARING: editing `foundation/LUCA.md` changes how Luca behaves at
// runtime, rather than the document being a description that drifts away from the
// code. See `foundation/LUCA.md` and `foundation/01-constitution/`.
//
// The `?raw` import is resolved by Vite (typed via `vite/client`). This module is
// renderer-side only — it is consumed by the system-prompt assembly in
// `lucaService.rebuildSystemConfig`.
import charterRaw from "../../foundation/LUCA.md?raw";

/**
 * The identity/behaviour body of the Charter, with the trailing
 * "The `LUCA.md` convention" meta-section removed — that section documents the
 * file convention for humans and is not part of how Luca must act. If the marker
 * is absent (the document was restructured), the whole charter is used rather than
 * silently dropping content.
 */
function extractCharterBody(raw: string): string {
  const CONVENTION_MARKER = "## The `LUCA.md` convention";
  const idx = raw.indexOf(CONVENTION_MARKER);
  return (idx >= 0 ? raw.slice(0, idx) : raw).trim();
}

/** The Charter of Luca, ready to inject into Luca's system instruction. */
export const LUCA_CHARTER = extractCharterBody(charterRaw);
