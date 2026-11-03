export type MeetingKind =
  | "Customer call"
  | "Internal sync"
  | "Stand-up"
  | "Interview"
  | "Project review";

export type TemplateId = "general" | "standup" | "sales" | "interview" | "project";

export type Participant = {
  name: string;
  role: string;
  initials: string;
  color: string;
};

export type TranscriptEntry = {
  id: string;
  seconds: number;
  speaker: string;
  text: string;
};

export type ActionItem = {
  id: string;
  text: string;
  owner?: string;
  due?: string;
};

export type MeetingSummary = {
  headline: string;
  bullets: string[];
  decisions: string[];
  actions: ActionItem[];
};

export type Meeting = {
  id: string;
  title: string;
  kind: MeetingKind;
  date: string;
  durationSeconds: number;
  platform: string;
  participants: Participant[];
  summary: MeetingSummary;
  transcript: TranscriptEntry[];
  highlights: { seconds: number; label: string; note: string }[];
};

export type SavedHighlight = {
  id: string;
  meetingId: string;
  seconds: number;
  note: string;
  createdAt: string;
};

export type SharedClip = {
  id: string;
  meetingId: string;
  startSeconds: number;
  endSeconds: number;
  title: string;
  createdAt: string;
  isPublic: boolean;
};
