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
  const { meetings: extraMeetings, summaries, completedActions, setActionCompleted } = useMeetBrief();
  const meetings = useMemo(
    () => getMeetings(extraMeetings).map((meeting) => summaries[meeting.id] ? { ...meeting, summary: summaries[meeting.id] } : meeting),
    [extraMeetings, summaries],
  );
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
  const weekEnd = new Date();
  weekEnd.setHours(23, 59, 59, 999);
  const weekStart = new Date(weekEnd);
  weekStart.setDate(weekStart.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);
  const weekMeetings = meetings.filter((meeting) => {
    const date = new Date(meeting.date);
    return date >= weekStart && date <= weekEnd;
  });
  const weekMinutes = weekMeetings.reduce((total, meeting) => total + meeting.durationSeconds, 0) / 60;
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
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
  const upcoming = openActions.slice(0, 4);
  const totalSeconds = meetings.reduce((total, meeting) => total + meeting.durationSeconds, 0);
  const decisionCount = meetings.reduce((total, meeting) => total + meeting.summary.decisions.length, 0);
  const todayLabel = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date());

  return (
    <AppShell>
      <div className="dashboard-page">
        <section className="intelligence-hero">
          <div className="intelligence-hero-copy">
            <div className="hero-overline"><span className="hero-overline-dot" /> MEETING INTELLIGENCE <span className="hero-overline-separator">/</span> {todayLabel.toUpperCase()}</div>
            <h1>Make every conversation<br /><em>move work forward.</em></h1>
            <p>Good conversations deserve a better afterlife. Find the signal, keep the context, and know what happens next.</p>
            <div className="hero-actions">
              <Link className="button button-hero-primary" href="/record"><Icon name="mic" size={16} /> Capture a meeting <Icon name="arrow" size={14} /></Link>
              <Link className="hero-secondary-link" href="/meetings">Explore your library <Icon name="arrow" size={14} /></Link>
            </div>
            <div className="hero-proof"><span className="hero-proof-avatars"><AvatarStack participants={meetings[0]?.participants ?? []} limit={3} /></span><span><strong>{meetings.length} conversations</strong> in your demo workspace</span></div>
          </div>
          <div className="hero-intelligence-card">
            <div className="hero-card-top"><span><Icon name="sparkles" size={15} /> THE SIGNAL, NOT THE NOISE</span><span className="hero-demo-label">SAMPLE DATA</span></div>
            <div className="hero-insight-number">{String(weekMeetings.length).padStart(2, "0")}<span> conversations<br />in the last 7 days</span></div>
            <div className="hero-chart" role="img" aria-label={`Meeting time across the last seven days, totaling ${formatDuration(Math.round(weekMinutes * 60))}`}>
              {weekDays.map((day) => {
                const dayLabel = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(day.date);
                const description = `${dayLabel}: ${day.meetings} ${day.meetings === 1 ? "meeting" : "meetings"}, ${Math.round(day.minutes)} minutes`;
                return <span key={day.date.toISOString()} title={description} style={{ "--bar-height": `${day.minutes === 0 ? 5 : Math.max(14, (day.minutes / maxDayMinutes) * 100)}%` } as React.CSSProperties}><i /></span>;
              })}
            </div>
            <div className="hero-chart-labels">{weekDays.map((day) => <span key={day.date.toISOString()}>{new Intl.DateTimeFormat("en-US", { weekday: "narrow" }).format(day.date)}</span>)}</div>
            <div className="hero-chart-foot"><span><span className="hero-chart-legend" /> Minutes discussed</span><strong>{formatDuration(Math.round(weekMinutes * 60))}</strong></div>
          </div>
          <span className="hero-orbit hero-orbit-one" aria-hidden="true" />
          <span className="hero-orbit hero-orbit-two" aria-hidden="true" />
        </section>

        <section className="dashboard-metrics" aria-label="Demo workspace overview">
          <article className="metric-card"><span className="metric-icon metric-icon-blue"><Icon name="calendar" size={17} /></span><div><span className="metric-label">CONVERSATIONS</span><strong>{meetings.length}</strong><small>in your library</small></div></article>
          <article className="metric-card"><span className="metric-icon metric-icon-violet"><Icon name="clock" size={17} /></span><div><span className="metric-label">TIME TOGETHER</span><strong>{(totalSeconds / 3600).toFixed(1)}<small className="metric-unit"> hrs</small></strong><small>across all conversations</small></div></article>
          <article className="metric-card"><span className="metric-icon metric-icon-cyan"><Icon name="checkCircle" size={17} /></span><div><span className="metric-label">OPEN FOLLOW-UPS</span><strong>{openActions.length}</strong><small>ready for a next step</small></div></article>
          <article className="metric-card"><span className="metric-icon metric-icon-amber"><Icon name="sparkles" size={17} /></span><div><span className="metric-label">DECISIONS</span><strong>{decisionCount}</strong><small>captured in meeting notes</small></div></article>
          <p className="metrics-disclosure"><Icon name="info" size={13} /> Counts are calculated from the sample meetings in this browser.</p>
        </section>

        <div className="dashboard-main-grid">
          <section className="dashboard-library">
            <div className="section-heading">
              <div><span className="section-eyebrow">YOUR CONVERSATION MEMORY</span><h2>Recent meetings</h2><p>Context that keeps the work moving.</p></div>
              <Link href="/meetings" className="text-link">View all <Icon name="arrow" size={14} /></Link>
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
          </section>

          <aside className="followup-panel">
            <div className="followup-panel-heading"><span className="followup-panel-icon"><Icon name="check" size={17} /></span><div><span className="section-eyebrow">KEEP THE MOMENTUM</span><h2>Up next</h2></div><span className="followup-count">{openActions.length}</span></div>
            <p className="followup-panel-intro">Follow-ups from your conversations, ready when you are.</p>
            {upcoming.length ? <div className="followup-list">{upcoming.map((action) => (
              <div key={action.id} className="followup-item">
                <button className="followup-check" aria-label={`Mark complete: ${action.text}`} onClick={() => setActionCompleted(action.id, true)}><Icon name="check" size={13} /></button>
                <div className="followup-item-copy"><Link href={`/meetings/${action.meeting.id}`} className="followup-task">{action.text}</Link><span>{action.owner || "Owner not specified"}{action.due ? <><i>·</i>{action.due}</> : null}</span><Link href={`/meetings/${action.meeting.id}`} className="followup-source"><Icon name="file" size={12} />{action.meeting.title}</Link></div>
              </div>
            ))}</div> : <div className="followup-empty"><Icon name="checkCircle" size={21} /><strong>You’re all caught up</strong><span>Every recorded follow-up is complete.</span></div>}
            <Link href="/meetings" className="followup-footer">Open meeting library <Icon name="arrow" size={14} /></Link>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}

export function MeetingsList() {
  const { meetings: extraMeetings, summaries } = useMeetBrief();
  const meetings = useMemo(
    () => getMeetings(extraMeetings).map((meeting) => summaries[meeting.id] ? { ...meeting, summary: summaries[meeting.id] } : meeting),
    [extraMeetings, summaries],
  );
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
      <div className="content-page highlights-page">
        <PageHeading eyebrow="A LIBRARY OF SIGNAL" title="Ideas worth keeping" description="A curated trail of the moments, decisions, and customer signals you chose to save." />
        <div className="highlights-intro"><span className="highlights-intro-mark"><Icon name="bookmark" size={18} /></span><span><strong>{allHighlights.length} moments, kept in context</strong><small>Every highlight opens at its original place in the conversation.</small></span><span className="highlights-intro-demo">SAMPLE + SAVED</span></div>
        {allHighlights.length ? (
          <div className="highlight-grid knowledge-grid">
            {allHighlights.map((highlight) => (
              <Link href={`/meetings/${highlight.meeting.id}?t=${highlight.seconds}`} className="highlight-card knowledge-card" key={highlight.id}>
                <span className="knowledge-quote-mark" aria-hidden="true">“</span>
                <span className="knowledge-card-label">{highlight.label}<span>{highlight.seeded ? "SAMPLE" : "SAVED"}</span></span>
                <strong className="knowledge-quote">{highlight.note}</strong>
                <span className="knowledge-card-footer"><span>{highlight.meeting.transcript.filter((line) => line.seconds <= highlight.seconds).pop()?.speaker ?? "Meeting moment"}</span><small>{highlight.meeting.title}</small></span><span className="knowledge-card-time">{formatMeetingDate(highlight.meeting.date)}<i>{formatTimestamp(highlight.seconds)} <Icon name="arrow" size={13} /></i></span>
              </Link>
            ))}
          </div>
        ) : <EmptyState icon="bookmark" title="Your highlights will live here" description="Save a moment from a meeting transcript to come back to it later." />}
      </div>
    </AppShell>
  );
}
