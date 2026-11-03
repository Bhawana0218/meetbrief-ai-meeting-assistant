import type { Meeting, MeetingKind, Participant, TranscriptEntry } from "@/lib/types";

const people = {
  maya: { name: "Maya Chen", role: "Product", initials: "MC", color: "lavender" },
  jordan: { name: "Jordan Lee", role: "Design", initials: "JL", color: "peach" },
  alex: { name: "Alex Morgan", role: "Engineering", initials: "AM", color: "mint" },
  sam: { name: "Sam Rivera", role: "Customer success", initials: "SR", color: "sky" },
  priya: { name: "Priya Nair", role: "Sales", initials: "PN", color: "rose" },
  noah: { name: "Noah Williams", role: "Operations", initials: "NW", color: "gold" },
  ellis: { name: "Ellis Brooks", role: "Candidate", initials: "EB", color: "slate" },
  taylor: { name: "Taylor Kim", role: "Marketing", initials: "TK", color: "lilac" },
} satisfies Record<string, Participant>;

const transcript = (...rows: [number, string, string][]): TranscriptEntry[] =>
  rows.map(([seconds, speaker, text], index) => ({
    id: `line-${index + 1}`,
    seconds,
    speaker,
    text,
  }));

export const seedMeetings: Meeting[] = [
  {
    id: "northstar-onboarding",
    title: "Northstar onboarding & launch plan",
    kind: "Customer call",
    date: "2026-11-03T09:30:00",
    durationSeconds: 2840,
    platform: "Google Meet",
    participants: [people.maya, people.sam, { ...people.noah, name: "Morgan Patel", initials: "MP", role: "Northstar · Customer" }],
    summary: {
      headline: "Northstar is ready to pilot with one team; a clear owner for SSO and an earlier import test are the remaining launch dependencies.",
      bullets: [
        "The 12-person research team will be the first pilot group, with a target start the week of November 16.",
        "Northstar can export project history as CSV today; the API integration is not required for the pilot.",
        "The customer wants a short weekly check-in during the first month and a written success recap.",
      ],
      decisions: [
        "Start the pilot with the research team rather than rolling out to all 80 employees.",
        "Use CSV import for the first workspace; revisit API sync after the pilot.",
      ],
      actions: [
        { id: "northstar-sso", text: "Send Northstar the SSO setup guide", owner: "Sam Rivera", due: "Nov 5" },
        { id: "northstar-csv", text: "Share a sample CSV and validate field mapping", owner: "Maya Chen", due: "Nov 6" },
        { id: "northstar-kickoff", text: "Confirm the 12 pilot participants and kickoff time", owner: "Morgan Patel", due: "Nov 10" },
      ],
    },
    transcript: transcript(
      [0, "Maya Chen", "Thanks for making time. I thought we could leave with a small, testable launch plan rather than a big-bang rollout."],
      [58, "Morgan Patel", "That sounds right. Our research group is eager to try it, but the wider team is still sorting out access requirements."],
      [124, "Sam Rivera", "How many people would you want in that first group?"],
      [168, "Morgan Patel", "About twelve researchers. They already share the same workspace and can give us feedback quickly."],
      [245, "Maya Chen", "Great. We can start the pilot with those twelve, then review the feedback before discussing a broader rollout."],
      [328, "Sam Rivera", "For the initial import, you mentioned project history. What format do you have available today?"],
      [390, "Morgan Patel", "We can export a CSV with project name, owner, and status. An API would take longer and needs our platform team."],
      [468, "Maya Chen", "CSV is enough for the pilot. Let's validate a sample first, so we're not making the API a launch dependency."],
      [550, "Morgan Patel", "Agreed. I can get a sample export from our admin after this call."],
      [624, "Sam Rivera", "There is also the single sign-on question. Is that a hard requirement for the research group?"],
      [704, "Morgan Patel", "It is required before we invite the whole company. For the pilot, we can use our approved test accounts while security reviews the setup."],
      [788, "Maya Chen", "We'll document that boundary and send the SSO guide today. We'll keep the pilot limited to the approved group."],
      [872, "Sam Rivera", "What would make the first month feel successful from your perspective?"],
      [936, "Morgan Patel", "If the team can find decisions after a call without asking me, that's already a win. Less manual note chasing, too."],
      [1024, "Maya Chen", "Let's check that with a short weekly touchpoint, and share a recap at the end of the pilot."],
      [1120, "Morgan Patel", "That works. We can begin the week of November 16 if the import looks clean."],
      [1215, "Sam Rivera", "I have the week of the 16th noted. Can you confirm the pilot roster and a kickoff slot by the 10th?"],
      [1288, "Morgan Patel", "Yes, I'll confirm the twelve names and find a time that works for the group."],
      [1360, "Maya Chen", "I'll own the CSV field mapping after Sam sends over the sample. We can keep the API question for a follow-up."],
      [1462, "Sam Rivera", "I'll send the SSO guide and a calendar option. Anything we missed?"],
      [1538, "Morgan Patel", "No, the scope feels manageable. I'll send the export and roster, and we'll take it from there."],
      [1602, "Maya Chen", "Perfect. We'll keep the pilot focused on those twelve people and report back after the first month."],
      [1690, "Sam Rivera", "Thanks both. I'll send a written recap with the dates and owners right after this."],
    ),
    highlights: [
      { seconds: 168, label: "Pilot scope", note: "Twelve researchers are the proposed first cohort." },
      { seconds: 936, label: "Success signal", note: "The team wants decisions to be easy to find after calls." },
    ],
  },
  {
    id: "product-weekly",
    title: "Product weekly — activation & onboarding",
    kind: "Internal sync",
    date: "2026-11-02T14:00:00",
    durationSeconds: 1920,
    platform: "Google Meet",
    participants: [people.maya, people.jordan, people.alex, people.taylor],
    summary: {
      headline: "The team will simplify the first-run checklist and validate the invite step before taking on a larger onboarding redesign.",
      bullets: [
        "New accounts reach the workspace but often pause before inviting a teammate.",
        "The empty state should explain the next action without adding another setup wizard.",
        "The team wants a small prototype review before implementation scope is finalized.",
      ],
      decisions: ["Prototype an invite-first empty state for the next design review.", "Keep the first-run checklist to three steps."],
      actions: [
        { id: "weekly-prototype", text: "Share two invite-state concepts for review", owner: "Jordan Lee", due: "Nov 5" },
        { id: "weekly-funnel", text: "Break down onboarding drop-off by account size", owner: "Maya Chen", due: "Nov 6" },
        { id: "weekly-events", text: "Check invite event coverage in analytics", owner: "Alex Morgan", due: "Nov 9" },
      ],
    },
    transcript: transcript(
      [0, "Maya Chen", "The clearest signal from last week's onboarding review is that people get into the workspace, then hesitate at the invite step."],
      [72, "Alex Morgan", "The event data agrees, though we don't yet have a clean split by team size."],
      [140, "Jordan Lee", "I watched five recordings. The checklist is visible, but it doesn't say why inviting someone matters."],
      [230, "Taylor Kim", "Could we add a short example of what a shared workspace unlocks?"],
      [310, "Jordan Lee", "Yes. I'd like to show that in the empty state instead of adding another modal to the setup flow."],
      [405, "Maya Chen", "Let's try a smaller change first: three checklist steps and an invite-first state with a clear benefit."],
      [496, "Alex Morgan", "I'll check whether the invite event is reliable enough to measure the change."],
      [580, "Taylor Kim", "I'll draft the one-sentence value line once we pick the direction."],
      [662, "Jordan Lee", "I'll bring two variations to the review. One focused on collaboration and one focused on keeping work in one place."],
      [750, "Maya Chen", "Good. We can compare them with the current flow before we decide whether the larger redesign is necessary."],
      [842, "Alex Morgan", "I'll also add the account-size breakdown so we're not optimizing for the wrong cohort."],
      [920, "Maya Chen", "Then that's our scope: three steps, two concepts, and event validation before implementation."],
    ),
    highlights: [{ seconds: 405, label: "Scope agreed", note: "Three checklist steps and an invite-first state." }],
  },
  {
    id: "standup-nov2",
    title: "Design & engineering stand-up",
    kind: "Stand-up",
    date: "2026-11-02T10:15:00",
    durationSeconds: 780,
    platform: "Google Meet",
    participants: [people.jordan, people.alex, people.maya],
    summary: {
      headline: "The transcript search branch is ready for review; speaker filter edge cases are the only blocker called out.",
      bullets: ["Design finished the player controls and handed off updated states.", "Engineering has a working search branch behind a feature flag.", "No new dependency was raised during the check-in."],
      decisions: ["Keep speaker filtering optional in the first transcript-search release."],
      actions: [
        { id: "standup-review", text: "Review the transcript search branch", owner: "Maya Chen", due: "Nov 3" },
        { id: "standup-states", text: "Add empty and no-match transcript states", owner: "Jordan Lee", due: "Nov 4" },
      ],
    },
    transcript: transcript(
      [0, "Jordan Lee", "I finished the player control states and sent the latest handoff this morning."],
      [96, "Alex Morgan", "Search is working behind a flag. The only rough edge is when a speaker has no matching lines."],
      [188, "Maya Chen", "Let's make speaker filtering optional for the first pass, but keep the empty state clear."],
      [290, "Alex Morgan", "That unblocks the branch. I can send it for review after I add a no-match state."],
      [388, "Jordan Lee", "I'll check the search and empty-state copy against the handoff."],
      [488, "Maya Chen", "I can review this afternoon. Anything else blocking either of you?"],
      [576, "Alex Morgan", "Nothing else from engineering."],
      [656, "Jordan Lee", "I'm clear too."],
    ),
    highlights: [],
  },
  {
    id: "harbor-sales",
    title: "Harbor Health — workflow discovery",
    kind: "Customer call",
    date: "2026-10-30T15:00:00",
    durationSeconds: 2580,
    platform: "Zoom",
    participants: [people.priya, people.sam, { ...people.noah, name: "Jamie Cole", initials: "JC", role: "Harbor Health · Operations" }],
    summary: {
      headline: "Harbor is exploring a team-wide workflow change; their reporting process is the clearest initial use case to validate.",
      bullets: ["Operations spends time reconciling notes across weekly calls.", "The buyer asked about audit access but did not set a purchase timeline.", "A workflow walkthrough is a better next step than a broad platform demo."],
      decisions: ["Focus the next session on the weekly handoff workflow and audit trail."],
      actions: [
        { id: "harbor-workflow", text: "Send a short workflow walkthrough", owner: "Priya Nair", due: "Nov 3" },
        { id: "harbor-audit", text: "Confirm the audit-log options available today", owner: "Sam Rivera", due: "Nov 4" },
      ],
    },
    transcript: transcript(
      [0, "Priya Nair", "Could you walk us through what happens after one of your weekly operations calls?"],
      [104, "Jamie Cole", "Someone usually writes notes, then we copy decisions into a separate tracker. If they miss a detail, it can take a day to resolve."],
      [218, "Sam Rivera", "Which part of that handoff takes the most time?"],
      [302, "Jamie Cole", "The reporting team reconciles the tracker against the original notes every Friday. That is where context tends to go missing."],
      [402, "Priya Nair", "Would a searchable record for the call make that Friday review easier?"],
      [496, "Jamie Cole", "It could, especially if we can show who agreed to a change and when. We have to be careful about access."],
      [606, "Sam Rivera", "We can use the next session to show the workflow and confirm what audit detail is available."],
      [696, "Jamie Cole", "A walkthrough would be more useful than another broad overview."],
      [804, "Priya Nair", "I'll send a short version focused on the handoff. We can decide from there whether a deeper evaluation makes sense."],
      [922, "Jamie Cole", "That sounds good. I haven't set an evaluation date yet, but I can invite our reporting lead next time."],
    ),
    highlights: [{ seconds: 302, label: "Workflow friction", note: "Friday reconciliation is where context gets lost." }],
  },
  {
    id: "candidate-ellis",
    title: "Ellis Brooks — product designer interview",
    kind: "Interview",
    date: "2026-10-30T11:00:00",
    durationSeconds: 3360,
    platform: "Google Meet",
    participants: [{ ...people.ellis }, people.maya, people.jordan],
    summary: {
      headline: "Ellis described a research-led approach to complex workflows and gave a concrete example of revising an onboarding flow.",
      bullets: ["The candidate starts by mapping the user's decision points.", "Their portfolio example involved a cross-functional test with support and engineering.", "The conversation did not include a compensation or availability discussion."],
      decisions: ["Share the case study with the hiring panel before deciding on a follow-up."],
      actions: [
        { id: "ellis-panel", text: "Share the onboarding case study with the hiring panel", owner: "Jordan Lee", due: "Nov 2" },
        { id: "ellis-notes", text: "Add interview feedback to the hiring scorecard", owner: "Maya Chen", due: "Nov 2" },
      ],
    },
    transcript: transcript(
      [0, "Jordan Lee", "To start, can you tell us how you approach a workflow when users have very different needs?"],
      [116, "Ellis Brooks", "I map the decisions people have to make, then talk to support about where those decisions become difficult."],
      [248, "Maya Chen", "Could you share an example where the first version of the flow didn't work?"],
      [344, "Ellis Brooks", "In one onboarding project, users reached setup but didn't understand which workspace to choose. We had optimized for speed, not confidence."],
      [490, "Jordan Lee", "What did you change after learning that?"],
      [578, "Ellis Brooks", "We tested a short explanation beside each option. Engineering helped us instrument the choice so we could compare completion and later corrections."],
      [718, "Maya Chen", "How did you decide what to ship first?"],
      [814, "Ellis Brooks", "The smallest change that answered the research question went first. We kept the rest of the redesign behind a second test."],
      [944, "Jordan Lee", "How did customer support fit into the evaluation?"],
      [1032, "Ellis Brooks", "They reviewed the language and flagged the confusing cases from their tickets. That gave us a useful check outside the test group."],
      [1174, "Maya Chen", "Thanks. We'll share feedback with the panel before we decide on next steps."],
    ),
    highlights: [{ seconds: 578, label: "Case study", note: "Instrumentation compared completion with later corrections." }],
  },
  {
    id: "launch-review",
    title: "Q4 launch readiness review",
    kind: "Project review",
    date: "2026-10-29T13:30:00",
    durationSeconds: 3120,
    platform: "Google Meet",
    participants: [people.maya, people.alex, people.taylor, people.noah],
    summary: {
      headline: "The launch checklist is mostly complete; consent copy and support handoff need a named reviewer before the release window is confirmed.",
      bullets: ["Core onboarding work is in review, not yet marked complete.", "The team wants a concise help-center path for workspace admins.", "A release date was not finalized in this meeting."],
      decisions: ["Keep the release window tentative until consent copy and support readiness are reviewed."],
      actions: [
        { id: "launch-copy", text: "Review consent copy with legal", owner: "Taylor Kim", due: "Oct 31" },
        { id: "launch-support", text: "Draft the admin help-center outline", owner: "Noah Williams", due: "Nov 3" },
        { id: "launch-checklist", text: "Update release checklist with remaining owners", owner: "Maya Chen", due: "Oct 30" },
      ],
    },
    transcript: transcript(
      [0, "Maya Chen", "Let's separate what is done from what is still in review before we put a date on the launch."],
      [92, "Alex Morgan", "The onboarding changes are ready for review. The event check is still running against the new invite state."],
      [208, "Taylor Kim", "I have consent copy drafted, but I need a legal review before I can call it final."],
      [316, "Noah Williams", "Support asked for a short admin guide. They do not need a full training pack, just the setup path and where to send questions."],
      [422, "Maya Chen", "Let's keep the date tentative until we have the copy review and a support owner."],
      [540, "Taylor Kim", "I'll get the copy in front of legal tomorrow and note any changes in the checklist."],
      [658, "Noah Williams", "I can share the help-center outline by Monday. Then support can tell us if a key step is missing."],
      [780, "Alex Morgan", "Once the event check is done, I'll add the results to the release notes."],
      [906, "Maya Chen", "That gives us three remaining checks. We'll come back to timing when all three have owners and status."],
    ),
    highlights: [{ seconds: 422, label: "Release gate", note: "Keep timing tentative until legal and support review." }],
  },
  {
    id: "customer-adoption",
    title: "Customer adoption signals — October",
    kind: "Internal sync",
    date: "2026-10-28T16:00:00",
    durationSeconds: 2260,
    platform: "Zoom",
    participants: [people.sam, people.priya, people.maya, people.taylor],
    summary: {
      headline: "The team agreed to review onboarding feedback by cohort rather than treating all support requests as the same adoption signal.",
      bullets: ["Two customers asked for clearer transcript search guidance.", "The team has anecdotal notes but no consistent cohort baseline yet.", "A short help article can be tested before larger in-product changes."],
      decisions: ["Separate first-week setup questions from recurring search requests in the next review."],
      actions: [
        { id: "adoption-tags", text: "Tag October support themes by account age", owner: "Sam Rivera", due: "Nov 4" },
        { id: "adoption-article", text: "Draft transcript search help article", owner: "Taylor Kim", due: "Nov 6" },
      ],
    },
    transcript: transcript(
      [0, "Sam Rivera", "A few of the support notes look similar on the surface, but I think the account age changes what the request means."],
      [104, "Priya Nair", "Do you have examples from the same feature area across both new and established customers?"],
      [198, "Sam Rivera", "Two new teams asked where transcript search lives. Established teams are asking for more specific speaker filters."],
      [314, "Maya Chen", "Let's keep setup questions separate from repeat search requests. They may point to different problems."],
      [416, "Taylor Kim", "I can test a short help article for search discovery before we change the in-product layout."],
      [520, "Priya Nair", "We should tag the October notes by account age so the next review has a consistent baseline."],
      [632, "Sam Rivera", "I'll go back through the support themes and add that context where we have it."],
      [730, "Maya Chen", "Then let's compare the new-team pattern with the established-team pattern next week."],
    ),
    highlights: [],
  },
  {
    id: "design-crit",
    title: "Transcript workspace design critique",
    kind: "Project review",
    date: "2026-10-27T10:00:00",
    durationSeconds: 1740,
    platform: "Google Meet",
    participants: [people.jordan, people.maya, people.alex],
    summary: {
      headline: "The team favored a readable transcript beside the summary, with timestamp navigation that remains useful on smaller screens.",
      bullets: ["A split view supports quick scanning on desktop.", "On narrow screens, transcript and summary should stack rather than become compressed columns.", "Focus and hover states need to remain visible for timestamp links."],
      decisions: ["Stack transcript and summary on small screens; do not hide the transcript behind a tab by default."],
      actions: [
        { id: "crit-mobile", text: "Update the narrow-screen workspace prototype", owner: "Jordan Lee", due: "Oct 29" },
        { id: "crit-focus", text: "Check keyboard focus states for transcript timestamps", owner: "Alex Morgan", due: "Oct 30" },
      ],
    },
    transcript: transcript(
      [0, "Jordan Lee", "I brought the updated meeting workspace. The main question is whether the transcript and summary compete for attention."],
      [106, "Maya Chen", "On desktop, seeing both at once helps me verify that the summary matches the conversation."],
      [220, "Alex Morgan", "The timestamp links are keyboard reachable, but the focus ring is too close to the play icon."],
      [330, "Jordan Lee", "I'll move the focus treatment and check the hover target. What about smaller screens?"],
      [430, "Maya Chen", "I'd rather stack the sections than hide the transcript. Search should still be close to the conversation."],
      [544, "Alex Morgan", "That keeps the reading order clear. We can preserve the playback controls above both sections."],
      [662, "Jordan Lee", "I'll revise the narrow view and bring it back for a quick check."],
      [748, "Maya Chen", "Sounds good. Keep the current desktop split and focus on readable mobile spacing."],
    ),
    highlights: [{ seconds: 430, label: "Responsive decision", note: "Stack sections; keep transcript visible." }],
  },
];

export const templateLabels: Record<string, string> = {
  general: "General meeting",
  standup: "Stand-up",
  sales: "Sales call",
  interview: "Interview",
  project: "Project review",
};

export function getMeetings(extraMeetings: Meeting[] = []): Meeting[] {
  return [...extraMeetings, ...seedMeetings].sort((a, b) => b.date.localeCompare(a.date));
}

export function getMeetingKindTemplate(kind: MeetingKind) {
  if (kind === "Stand-up") return "standup";
  if (kind === "Customer call") return "sales";
  if (kind === "Interview") return "interview";
  if (kind === "Project review") return "project";
  return "general";
}

export function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${String(minutes % 60).padStart(2, "0")}m`;
  }
  return remaining >= 30 ? `${minutes + 1} min` : `${minutes} min`;
}

export function formatTimestamp(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

export function formatMeetingDate(value: string) {
  const date = new Date(value);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const meetingDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDifference = Math.round((today.getTime() - meetingDay.getTime()) / 86_400_000);
  if (dayDifference === 0) return "Today";
  if (dayDifference === 1) return "Yesterday";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}
