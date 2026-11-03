"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icon";
import { useMeetBrief } from "@/components/meetbrief-provider";
import { AvatarStack, EmptyState, KindBadge, MeetingCard, PageHeading } from "@/components/ui";
import { formatDuration, formatMeetingDate, formatTimestamp, getMeetings } from "@/lib/meetings";
import type { Meeting, MeetingKind } from "@/lib/types";

const filters = ["All meetings", "Customer", "Internal"] as const;
type DashboardFilter = (typeof filters)[number];

function matchesFilter(meeting: Meeting, filter: DashboardFilter) {
  if (filter === "Customer") return meeting.kind === "Customer call";
  if (filter === "Internal") return meeting.kind !== "Customer call";
  return true;
}

export function Dashboard() {
  const { meetings: extraMeetings, completedActions } = useMeetBrief();
  const meetings = useMemo(() => getMeetings(extraMeetings), [extraMeetings]);
  const [filter, setFilter] = useState<DashboardFilter>("All meetings");
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);

  const matching = meetings.filter((meeting) => {
    const searchText = [
      meeting.title,
      meeting.summary.headline,
      meeting.participants.map((person) => person.name).join(" "),
    ].join(" ").toLowerCase();
    return matchesFilter(meeting, filter) && searchText.includes(query.trim().toLowerCase());
  });
  const recent = showAll ? matching : matching.slice(0, 4);
  const weekMeetings = meetings.filter((meeting) => meeting.date >= "2026-10-28" && meeting.date < "2026-11-04");
  const weekMinutes = weekMeetings.reduce((total, meeting) => total + meeting.durationSeconds, 0) / 60;
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(2026, 9, 28 + index);
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const dayMeetings = weekMeetings.filter((meeting) => meeting.date.slice(0, 10) === dateKey);
    const minutes = dayMeetings.reduce((total, meeting) => total + meeting.durationSeconds, 0) / 60;
    return {
      date,
      meetings: dayMeetings.length,
      minutes,
    };
  });
  const maxDayMinutes = Math.max(...weekDays.map((day) => day.minutes), 1);
  const actions = meetings.flatMap((meeting) =>
    meeting.summary.actions.map((action) => ({ ...action, meeting })),
  );
  const openActions = actions.filter((action) => !completedActions[action.id]);
  const upcoming = openActions.slice(0, 3);

  return (
    <AppShell>
      <div className="dashboard-page">
        <PageHeading
          eyebrow="TUESDAY, NOVEMBER 3"
          title={<>Welcome back, Bhawana<span className="heading-period">.</span></>}
          description="Your conversations, decisions, and next steps — all in one place."
          actions={<Link className="button button-primary" href="/record"><Icon name="mic" size={16} /> Capture a meeting</Link>}
        />
        <section className="overview-grid" aria-label="Weekly overview">
          <div className="overview-card overview-card-featured">
            <div className="overview-card-label"><span className="overview-icon icon-peach"><Icon name="calendar" size={17} /></span><span>This week</span><span className="overview-tag">Oct 28 – Nov 3</span></div>
            <div className="overview-number">{weekMeetings.length}<span> meetings</span></div>
            <p>{formatDuration(Math.round(weekMinutes * 60))} of conversations, ready when you are.</p>
            <div className="week-visual" role="img" aria-label="Meeting minutes by day this week">
              {weekDays.map((day) => {
                const dayLabel = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(day.date);
                const description = `${dayLabel}: ${day.meetings} ${day.meetings === 1 ? "meeting" : "meetings"}, ${Math.round(day.minutes)} minutes`;
                return <span key={day.date.toISOString()} title={description} aria-label={description} style={{ height: `${day.minutes === 0 ? 3 : Math.max(12, (day.minutes / maxDayMinutes) * 100)}%` }} />;
              })}
            </div>
            <div className="week-axis"><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span><span>SUN</span><span>MON</span><span>TUE</span></div>
          </div>
          <div className="overview-card overview-card-actions">
            <div className="overview-card-label"><span className="overview-icon icon-green"><Icon name="checkCircle" size={17} /></span><span>Action items</span></div>
            <div className="overview-number">{openActions.length}<span> to follow up</span></div>
            <p>Small next steps, already pulled out of your meetings.</p>
            <div className="action-preview">
              {upcoming.map((action) => (
                <Link key={action.id} className="action-preview-row" href={`/meetings/${action.meeting.id}`}>
                  <span className="tiny-check" />
                  <span className="action-preview-copy"><strong>{action.text}</strong><small>{action.owner || "Owner not specified"} · {action.meeting.title}</small></span>
                </Link>
              ))}
            </div>
            <Link href="/meetings" className="text-link">View all meetings <Icon name="chevron" size={14} /></Link>
          </div>
        </section>

        <div className="section-heading">
          <div><h2>Recent meetings</h2><p>A little context goes a long way.</p></div>
          <Link href="/meetings" className="text-link">All meetings <Icon name="chevron" size={15} /></Link>
        </div>
        <div className="meeting-toolbar">
          <div className="filter-pills" role="group" aria-label="Filter meetings">
            {filters.map((item) => <button key={item} className={`filter-pill ${filter === item ? "filter-pill-active" : ""}`} onClick={() => setFilter(item)}>{item}</button>)}
          </div>
          <label className="inline-search"><Icon name="search" size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter meetings" aria-label="Filter recent meetings" /></label>
        </div>
        {recent.length > 0 ? (
          <div className="meeting-grid">
            {recent.map((meeting) => <MeetingCard key={meeting.id} meeting={meeting} />)}
          </div>
        ) : (
          <EmptyState icon="search" title="No meetings found" description="Try a different search or filter." action={<button className="button button-secondary" onClick={() => { setQuery(""); setFilter("All meetings"); }}>Clear filters</button>} />
        )}
        {matching.length > 4 && !showAll && <button className="button button-secondary load-more" onClick={() => setShowAll(true)}>Show all {matching.length} meetings</button>}
      </div>
    </AppShell>
  );
}

export function MeetingsList() {
  const { meetings: extraMeetings } = useMeetBrief();
  const meetings = useMemo(() => getMeetings(extraMeetings), [extraMeetings]);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"All types" | MeetingKind>("All types");
  const kinds: ("All types" | MeetingKind)[] = ["All types", "Customer call", "Internal sync", "Stand-up", "Interview", "Project review"];

  const result = meetings.filter((meeting) => {
    if (kind !== "All types" && meeting.kind !== kind) return false;
    const haystack = [
      meeting.title,
      meeting.summary.headline,
      meeting.participants.map((person) => person.name).join(" "),
      meeting.transcript.map((line) => line.text).join(" "),
    ].join(" ").toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  return (
    <AppShell>
      <div className="content-page">
        <PageHeading eyebrow="YOUR CONVERSATIONS" title="Meetings" description="A searchable home for every conversation and the work that follows." actions={<Link href="/record" className="button button-primary"><Icon name="mic" size={16} /> Record a meeting</Link>} />
        <div className="list-toolbar">
          <label className="inline-search list-search"><Icon name="search" size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search titles, people, and transcripts" aria-label="Search meetings" /></label>
          <label className="select-control"><Icon name="filter" size={16} /><select aria-label="Filter by meeting type" value={kind} onChange={(event) => setKind(event.target.value as "All types" | MeetingKind)}>{kinds.map((item) => <option key={item}>{item}</option>)}</select><Icon name="down" size={14} /></label>
          <span className="result-count">{result.length} {result.length === 1 ? "meeting" : "meetings"}</span>
        </div>
        {result.length > 0 ? (
          <div className="meeting-list">
            {result.map((meeting) => (
              <Link key={meeting.id} className="meeting-list-row" href={`/meetings/${meeting.id}`}>
                <span className="meeting-list-date"><strong>{new Intl.DateTimeFormat("en-US", { day: "2-digit" }).format(new Date(meeting.date))}</strong><small>{new Intl.DateTimeFormat("en-US", { month: "short" }).format(new Date(meeting.date))}</small></span>
                <span className="meeting-list-main"><span className="meeting-list-title">{meeting.title}</span><span className="meeting-list-description">{meeting.summary.headline}</span><span className="meeting-list-mobile-meta"><KindBadge kind={meeting.kind} /> · {formatMeetingDate(meeting.date)}</span></span>
                <span className="meeting-list-kind"><KindBadge kind={meeting.kind} /></span>
                <span className="meeting-list-people"><AvatarStack participants={meeting.participants} limit={2} /><small>{meeting.participants.length} people</small></span>
                <span className="meeting-list-duration"><Icon name="clock" size={14} />{formatDuration(meeting.durationSeconds)}</span>
                <Icon name="chevron" size={17} className="list-chevron" />
              </Link>
            ))}
          </div>
        ) : <EmptyState icon="search" title="No matching meetings" description="Try another search or choose a different meeting type." action={<button className="button button-secondary" onClick={() => { setQuery(""); setKind("All types"); }}>Clear filters</button>} />}
      </div>
    </AppShell>
  );
}

export function HighlightsPage() {
  const { meetings: extraMeetings, highlights: savedHighlights } = useMeetBrief();
  const meetings = useMemo(() => getMeetings(extraMeetings), [extraMeetings]);
  const seedHighlights = meetings.flatMap((meeting) =>
    meeting.highlights.map((highlight, index) => ({
      id: `${meeting.id}-seed-${index}`,
      meetingId: meeting.id,
      seconds: highlight.seconds,
      note: highlight.note,
      label: highlight.label,
      seeded: true,
    })),
  );
  const localHighlights = savedHighlights.map((item) => ({
    ...item,
    label: "Saved moment",
    seeded: false,
  }));
  const allHighlights = [...localHighlights, ...seedHighlights]
    .map((highlight) => ({ ...highlight, meeting: meetings.find((meeting) => meeting.id === highlight.meetingId) }))
    .filter((highlight): highlight is typeof highlight & { meeting: Meeting } => Boolean(highlight.meeting))
    .sort((a, b) => b.meeting.date.localeCompare(a.meeting.date));

  return (
    <AppShell>
      <div className="content-page">
        <PageHeading eyebrow="MOMENTS WORTH KEEPING" title="Highlights" description="The moments you saved, ready to revisit in their original conversation." />
        {allHighlights.length ? (
          <div className="highlight-grid">
            {allHighlights.map((highlight) => (
              <Link href={`/meetings/${highlight.meeting.id}?t=${highlight.seconds}`} className="highlight-card" key={highlight.id}>
                <span className="highlight-play"><Icon name="play" size={15} /></span>
                <span className="highlight-copy"><span className="highlight-label">{highlight.label} <span>· {formatTimestamp(highlight.seconds)}</span></span><strong>{highlight.note}</strong><small>{highlight.meeting.title}</small></span>
                <span className="highlight-date">{formatMeetingDate(highlight.meeting.date)}</span>
              </Link>
            ))}
          </div>
        ) : <EmptyState icon="bookmark" title="Your highlights will live here" description="Save a moment from a meeting transcript to come back to it later." />}
      </div>
    </AppShell>
  );
}
