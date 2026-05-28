import type { LucaTraceMemoryMappingInput } from "./TraceMemoryMapping";
import {
  getTraceMemoryMappingSnapshot,
  mapMissionTapeToLucaMemoryItems,
  mapTraceToLucaMemoryItem,
} from "./TraceMemoryMapping";

export const TraceMemoryAdapter = {
  name: "TraceMemoryAdapter",
  kind: "trace_tape_mapping_adapter",
  mapTrace(input: LucaTraceMemoryMappingInput) {
    return mapTraceToLucaMemoryItem(input);
  },
  mapMissionTape(input: LucaTraceMemoryMappingInput) {
    return mapMissionTapeToLucaMemoryItems(input);
  },
  getSnapshot() {
    return getTraceMemoryMappingSnapshot({ adapter: "TraceMemoryAdapter", kind: "trace_tape_mapping_adapter" });
  },
};
