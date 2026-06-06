import type { ValidationResult } from "../identity/identityTypes";
import type { PrivacyZone } from "../privacy/privacyZones";

export type MemoryKind =
  | "identity" | "preference" | "project" | "decision" | "learning"
  | "person" | "company" | "device" | "runtime_event";

export interface MemoryItem {
  id: string;
  kind: MemoryKind;
  title: string;
  content: string;
  source: string;
  confidence: number;
  privacyZone: PrivacyZone;
  tags: string[];
  relatedProjectId?: string;
  createdAt: string;
  updatedAt: string;
}

export type MemoryItemInput = Omit<MemoryItem, "createdAt" | "updatedAt"> &
  Partial<Pick<MemoryItem, "createdAt" | "updatedAt">>;
export type MemoryValidationResult = ValidationResult;

export interface MemoryStore {
  put(item: MemoryItem): MemoryItem;
  get(id: string): MemoryItem | undefined;
  list(): MemoryItem[];
  remove(id: string): boolean;
}
