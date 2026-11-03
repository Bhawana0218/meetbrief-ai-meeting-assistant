import { getMeetingKindTemplate } from "@/lib/meetings";
import type { Meeting, MeetingSummary, TemplateId } from "@/lib/types";

export const templateNames: Record<TemplateId, string> = {
  general: "General meeting",
  standup: "Stand-up",
  sales: "Sales call",
  interview: "Interview",
  project: "Project review",
};

const templateIntros: Record<TemplateId, string> = {
  general: "A concise recap of the conversation, decisions, and agreed follow-ups.",
  standup: "A concise progress and follow-up recap, limited to points present in the notes.",
  sales: "A concise customer-conversation recap, limited to needs and next steps actually discussed.",
  interview: "A concise interview recap based only on what the participants discussed.",
  project: "A concise project review recap, including decisions and explicitly named dependencies.",
};

export function buildDemoSummary(meeting: Meeting, template: TemplateId): MeetingSummary {
  const intro = templateIntros[template] ?? templateIntros[getMeetingKindTemplate(meeting.kind) as TemplateId];
  return {
    headline: `${intro} ${meeting.summary.headline}`,
    bullets: meeting.summary.bullets,
    decisions: meeting.summary.decisions,
    actions: meeting.summary.actions,
  };
}

export function isTemplateId(value: unknown): value is TemplateId {
  return typeof value === "string" && Object.hasOwn(templateNames, value);
}
