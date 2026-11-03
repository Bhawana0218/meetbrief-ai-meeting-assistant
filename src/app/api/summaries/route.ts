import { NextResponse } from "next/server";
import { isTemplateId, templateNames } from "@/lib/summary";
import type { ActionItem, MeetingSummary, TemplateId } from "@/lib/types";

export const runtime = "nodejs";

type SummaryRequest = {
  meeting: {
    title: string;
    transcript: { speaker: string; seconds: number; text: string }[];
    participants: string[];
    sourceSummary: MeetingSummary;
  };
  template: TemplateId;
};

function isSummary(value: unknown): value is MeetingSummary {
  if (!value || typeof value !== "object") return false;
  const summary = value as Record<string, unknown>;
  if (typeof summary.headline !== "string" || !Array.isArray(summary.bullets) || !Array.isArray(summary.decisions) || !Array.isArray(summary.actions)) return false;
  if (!summary.bullets.every((item) => typeof item === "string") || !summary.decisions.every((item) => typeof item === "string")) return false;
  return summary.actions.every((item: unknown) => {
    if (!item || typeof item !== "object") return false;
    const action = item as Record<string, unknown>;
    return typeof action.id === "string" && typeof action.text === "string" &&
      (action.owner === undefined || typeof action.owner === "string") &&
      (action.due === undefined || typeof action.due === "string");
  });
}

function validateRequest(value: unknown): SummaryRequest | null {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  if (!isTemplateId(body.template) || !body.meeting || typeof body.meeting !== "object") return null;
  const meeting = body.meeting as Record<string, unknown>;
  if (typeof meeting.title !== "string" || meeting.title.trim().length === 0 || meeting.title.length > 200) return null;
  if (!Array.isArray(meeting.transcript) || meeting.transcript.length === 0 || meeting.transcript.length > 100) return null;
  if (!meeting.transcript.every((line: unknown) => {
    if (!line || typeof line !== "object") return false;
    const entry = line as Record<string, unknown>;
    return typeof entry.speaker === "string" && entry.speaker.length <= 100 &&
      typeof entry.text === "string" && entry.text.length <= 1500 &&
      typeof entry.seconds === "number" && Number.isFinite(entry.seconds) && entry.seconds >= 0;
  })) return null;
  if (!Array.isArray(meeting.participants) || meeting.participants.length > 30 ||
      !meeting.participants.every((person: unknown) => typeof person === "string" && person.length <= 100)) return null;
  if (!isSummary(meeting.sourceSummary)) return null;
  return {
    meeting: {
      title: meeting.title,
      transcript: meeting.transcript,
      participants: meeting.participants,
      sourceSummary: meeting.sourceSummary,
    },
    template: body.template,
  };
}

function demoFallback(request: SummaryRequest): MeetingSummary {
  const { sourceSummary } = request.meeting;
  const kindIntro = {
    general: "Conversation recap",
    standup: "Progress recap",
    sales: "Customer conversation recap",
    interview: "Interview recap",
    project: "Project review recap",
  }[request.template];
  return {
    headline: `${kindIntro}. ${sourceSummary.headline}`,
    bullets: sourceSummary.bullets,
    decisions: sourceSummary.decisions,
    actions: sourceSummary.actions as ActionItem[],
  };
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const validated = validateRequest(payload);
  if (!validated) {
    return NextResponse.json({ error: "Meeting notes or summary template are invalid." }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ mode: "demo", template: templateNames[validated.template], summary: demoFallback(validated) });
  }

  const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const prompt = {
    template: templateNames[validated.template],
    meeting: validated.meeting,
  };

  try {
    const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify({
        model,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "Summarize only facts explicitly supported by the supplied meeting transcript and source summary. Never infer or invent owners, deadlines, commitments, decisions, or customer intent. Omit unsupported details. Preserve action IDs, owners, and due dates from the source summary exactly; do not create new actions. Return JSON with keys headline (string), bullets (string array), decisions (string array), actions (array of {id,text,owner?,due?}).",
          },
          {
            role: "user",
            content: `Use the ${templateNames[validated.template]} format. Treat the source summary as evidence, not permission to add facts. Input:\n${JSON.stringify(prompt)}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Summary provider returned an error.", { status: response.status, detail: errorText.slice(0, 500) });
      return NextResponse.json({ error: "The configured summary provider returned an error." }, { status: 502 });
    }

    const result: unknown = await response.json();
    const content = (result as { choices?: { message?: { content?: unknown } }[] }).choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      return NextResponse.json({ error: "The summary provider returned an empty response." }, { status: 502 });
    }
    let summary: unknown;
    try {
      summary = JSON.parse(content);
    } catch {
      return NextResponse.json({ error: "The summary provider returned invalid structured data." }, { status: 502 });
    }
    if (!isSummary(summary)) {
      return NextResponse.json({ error: "The summary provider returned an unexpected response shape." }, { status: 502 });
    }
    return NextResponse.json({ mode: "ai", template: templateNames[validated.template], summary });
  } catch (error) {
    console.error("Summary provider request failed.", error);
    return NextResponse.json({ error: "Could not reach the configured summary provider." }, { status: 502 });
  }
}
