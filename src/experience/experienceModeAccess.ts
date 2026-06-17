import {
  LUCA_AUDIENCE_TIER,
  LUCA_SURFACE_LAYER,
} from "../config/buildConfig";
import { deriveCreatorAccessFromBuild } from "./experienceMode";

/**
 * Safe build-only Creator eligibility for the first Experience Mode wiring.
 * Trusted creator keys/profiles and repository detection remain deferred.
 */
export const CREATOR_ACCESS_STATE = deriveCreatorAccessFromBuild({
  audienceTier: LUCA_AUDIENCE_TIER,
  surfaceLayer: LUCA_SURFACE_LAYER,
});
