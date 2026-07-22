/**
 * The one mission tape every surface reads and writes.
 *
 * MissionTapeRecorderService stores tapes in a per-instance in-memory Map, so
 * each `new MissionTapeRecorderService()` is a private world. Producers
 * (computer-use runs, checkpoints, gated completion) were each constructing
 * their own, while the Mission Center panel read MissionControlService's — so
 * a mission could be fully recorded somewhere nothing could display it.
 *
 * Callers may still inject a recorder; that is how tests stay isolated. This is
 * only the default when nobody supplies one.
 */

import { MissionTapeRecorderService } from "./MissionTapeRecorder";

export const sharedMissionTapeRecorder = new MissionTapeRecorderService();
