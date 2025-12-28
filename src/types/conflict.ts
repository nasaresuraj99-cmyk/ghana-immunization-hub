import { Child } from "./child";

export interface ConflictRecord {
  id: string;
  childId: string;
  localVersion: Child;
  remoteVersion: Child;
  localTimestamp: number;
  remoteTimestamp: number;
  detectedAt: number;
  resolved: boolean;
}

export type ConflictResolution = 'local' | 'remote' | 'merge';

export interface ConflictDiff {
  field: string;
  localValue: string | undefined;
  remoteValue: string | undefined;
}
