"use client";

import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import type { Meeting, MeetingSummary, SavedHighlight, SharedClip } from "@/lib/types";

const STORAGE_KEY = "meetbrief-demo-v1";

type StoredState = {
  completedActions: Record<string, boolean>;
  summaries: Record<string, MeetingSummary>;
  highlights: SavedHighlight[];
  clips: SharedClip[];
  meetings: Meeting[];
};

type Snapshot = StoredState & { ready: boolean; storageError: string | null };
type MeetBriefContextValue = Snapshot & {
  setActionCompleted: (actionId: string, completed: boolean) => void;
  setMeetingSummary: (meetingId: string, summary: MeetingSummary) => void;
  addHighlight: (meetingId: string, seconds: number, note: string) => SavedHighlight;
  addClip: (clip: Omit<SharedClip, "id" | "createdAt">) => SharedClip;
  addMeeting: (meeting: Meeting) => void;
  setClipPublic: (clipId: string, isPublic: boolean) => void;
};

const emptyState: Snapshot = {
  completedActions: {},
  summaries: {},
  highlights: [],
  clips: [],
  meetings: [],
  ready: false,
  storageError: null,
};

const MeetBriefContext = createContext<MeetBriefContextValue | null>(null);
const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedSnapshot = emptyState;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSummary(value: unknown): value is MeetingSummary {
  if (!isRecord(value) || typeof value.headline !== "string" ||
      !Array.isArray(value.bullets) || !value.bullets.every((item) => typeof item === "string") ||
      !Array.isArray(value.decisions) || !value.decisions.every((item) => typeof item === "string") ||
      !Array.isArray(value.actions)) return false;
  return value.actions.every((action) =>
    isRecord(action) && typeof action.id === "string" && typeof action.text === "string" &&
    (action.owner === undefined || typeof action.owner === "string") &&
    (action.due === undefined || typeof action.due === "string"),
  );
}

function isMeeting(value: unknown): value is Meeting {
  return isRecord(value) &&
    typeof value.id === "string" && typeof value.title === "string" &&
    typeof value.date === "string" && typeof value.durationSeconds === "number" &&
    typeof value.platform === "string" && isSummary(value.summary) &&
    Array.isArray(value.participants) && Array.isArray(value.transcript) &&
    Array.isArray(value.highlights);
}

function getSnapshot(): Snapshot {
  if (typeof window === "undefined") return emptyState;
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    if (cachedRaw === "__storage_unavailable__") return cachedSnapshot;
    const message = error instanceof Error ? error.message : "Browser storage is unavailable.";
    console.error("MeetBrief local demo storage could not be read.", error);
    cachedRaw = "__storage_unavailable__";
    cachedSnapshot = { ...emptyState, ready: true, storageError: message };
    return cachedSnapshot;
  }
  if (raw === cachedRaw) return cachedSnapshot;
  cachedRaw = raw;
  if (!raw) {
    cachedSnapshot = { ...emptyState, ready: true };
    return cachedSnapshot;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) throw new Error("Saved demo data has an unexpected shape.");
    const completedActions = isRecord(parsed.completedActions)
      ? Object.fromEntries(Object.entries(parsed.completedActions).filter((entry): entry is [string, boolean] => typeof entry[1] === "boolean"))
      : {};
    const summaries = isRecord(parsed.summaries)
      ? Object.fromEntries(Object.entries(parsed.summaries).filter((entry): entry is [string, MeetingSummary] => isSummary(entry[1])))
      : {};
    const highlights = Array.isArray(parsed.highlights)
      ? parsed.highlights.filter((item): item is SavedHighlight =>
          isRecord(item) && typeof item.id === "string" && typeof item.meetingId === "string" &&
          typeof item.seconds === "number" && typeof item.note === "string" && typeof item.createdAt === "string")
      : [];
    const clips = Array.isArray(parsed.clips)
      ? parsed.clips.filter((item): item is SharedClip =>
          isRecord(item) && typeof item.id === "string" && typeof item.meetingId === "string" &&
          typeof item.startSeconds === "number" && typeof item.endSeconds === "number" &&
          typeof item.title === "string" && typeof item.createdAt === "string" && typeof item.isPublic === "boolean")
      : [];
    const meetings = Array.isArray(parsed.meetings) ? parsed.meetings.filter(isMeeting) : [];
    cachedSnapshot = { completedActions, summaries, highlights, clips, meetings, ready: true, storageError: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Saved demo data could not be loaded.";
    console.error("MeetBrief local demo storage could not be loaded.", error);
    cachedSnapshot = { ...emptyState, ready: true, storageError: message };
  }
  return cachedSnapshot;
}

function getServerSnapshot() {
  return emptyState;
}

function notify() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = () => {
    cachedRaw = undefined;
    notify();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function saveSnapshot(nextState: StoredState) {
  const previousRaw = cachedRaw;
  cachedSnapshot = { ...nextState, ready: true, storageError: null };
  try {
    const serialized = JSON.stringify(nextState);
    window.localStorage.setItem(STORAGE_KEY, serialized);
    cachedRaw = serialized;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Your changes could not be saved.";
    console.error("MeetBrief local demo storage could not be saved.", error);
    cachedSnapshot = { ...cachedSnapshot, storageError: message };
    cachedRaw = previousRaw;
  }
  notify();
}

function updateSnapshot(update: (current: Snapshot) => StoredState) {
  saveSnapshot(update(getSnapshot()));
}

function makeId(prefix: string) {
  const randomPart =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${randomPart}`;
}

const actions = {
  setActionCompleted(actionId: string, completed: boolean) {
    updateSnapshot((current) => ({ ...current, completedActions: { ...current.completedActions, [actionId]: completed } }));
  },
  setMeetingSummary(meetingId: string, summary: MeetingSummary) {
    updateSnapshot((current) => ({ ...current, summaries: { ...current.summaries, [meetingId]: summary } }));
  },
  addHighlight(meetingId: string, seconds: number, note: string) {
    if (!Number.isFinite(seconds) || seconds < 0 || !note.trim()) {
      throw new Error("A highlight needs a valid timestamp and note.");
    }
    const highlight: SavedHighlight = {
      id: makeId("highlight"),
      meetingId,
      seconds,
      note: note.trim(),
      createdAt: new Date().toISOString(),
    };
    updateSnapshot((current) => ({ ...current, highlights: [highlight, ...current.highlights] }));
    return highlight;
  },
  addClip(clip: Omit<SharedClip, "id" | "createdAt">) {
    if (!clip.title.trim() || clip.startSeconds < 0 || clip.endSeconds <= clip.startSeconds) {
      throw new Error("Choose a title and a valid clip range.");
    }
    const savedClip: SharedClip = {
      ...clip,
      title: clip.title.trim(),
      id: makeId("clip"),
      createdAt: new Date().toISOString(),
    };
    updateSnapshot((current) => ({ ...current, clips: [savedClip, ...current.clips] }));
    return savedClip;
  },
  addMeeting(meeting: Meeting) {
    updateSnapshot((current) => ({ ...current, meetings: [meeting, ...current.meetings.filter((item) => item.id !== meeting.id)] }));
  },
  setClipPublic(clipId: string, isPublic: boolean) {
    updateSnapshot((current) => ({
      ...current,
      clips: current.clips.map((clip) => (clip.id === clipId ? { ...clip, isPublic } : clip)),
    }));
  },
};

export function MeetBriefProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const value = useMemo(() => ({ ...snapshot, ...actions }), [snapshot]);
  return <MeetBriefContext.Provider value={value}>{children}</MeetBriefContext.Provider>;
}

export function useMeetBrief() {
  const context = useContext(MeetBriefContext);
  if (!context) throw new Error("useMeetBrief must be used within MeetBriefProvider.");
  return context;
}
