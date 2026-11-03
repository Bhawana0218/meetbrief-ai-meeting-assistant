"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icon";
import { useMeetBrief } from "@/components/meetbrief-provider";
import { EmptyState, KindBadge, PageHeading } from "@/components/ui";
import { formatDuration, formatMeetingDate, formatTimestamp, getMeetings } from "@/lib/meetings";

export function SearchResults({ initialQuery = "" }: { initialQuery?: string }) {
  const { meetings: extraMeetings } = useMeetBrief();
  const meetings = useMemo(() => getMeetings(extraMeetings), [extraMeetings]);
  const [query, setQuery] = useState(initialQuery);
  const [scope, setScope] = useState("Everything");
  const scopes = ["Everything", "Meetings", "Transcripts", "People", "Actions"];
  const result = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return meetings.flatMap((meeting) => {
      const matches = [];
      if (scope === "Everything" || scope === "Meetings") {
        if (`${meeting.title} ${meeting.summary.headline}`.toLowerCase().includes(needle)) {
          matches.push({ type: "Meeting", text: meeting.summary.headline, time: undefined });
        }
      }
      if (scope === "Everything" || scope === "Transcripts") {
        for (const line of meeting.transcript) {
          if (`${line.speaker} ${line.text}`.toLowerCase().includes(needle)) {
            matches.push({ type: "Transcript", text: `${line.speaker}: “${line.text}”`, time: line.seconds });
          }
        }
      }
      if (scope === "Everything" || scope === "People") {
        for (const person of meeting.participants) {
          if (`${person.name} ${person.role}`.toLowerCase().includes(needle)) {
            matches.push({ type: "Participant", text: `${person.name} · ${person.role} joined this conversation.`, time: undefined });
          }
        }
      }
      if (scope === "Everything" || scope === "Actions") {
        for (const action of meeting.summary.actions) {
          if (`${action.text} ${action.owner ?? ""} ${action.due ?? ""}`.toLowerCase().includes(needle)) {
            matches.push({ type: "Action item", text: `${action.text}${action.owner ? ` · ${action.owner}` : ""}${action.due ? ` · ${action.due}` : ""}`, time: undefined });
          }
        }
      }
      return matches.map((item) => ({ meeting, ...item }));
    });
  }, [meetings, query, scope]);

  return (
    <AppShell>
      <div className="content-page search-page">
        <PageHeading eyebrow="YOUR CONVERSATION MEMORY" title="Search everything" description="Find a decision, a phrase, a person, or the next step hidden in a meeting." />
        <label className="search-page-input"><Icon name="search" size={20} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try “CSV import”, “Jordan”, or “follow up”" aria-label="Search all meetings" autoFocus /></label>
        <div className="search-filters">
          <div className="filter-pills" role="group" aria-label="Search in">
            {scopes.map((item) => <button key={item} className={`filter-pill ${scope === item ? "filter-pill-active" : ""}`} onClick={() => setScope(item)}>{item}</button>)}
          </div>
          <span className="result-count">{query.trim() ? `${result.length} ${result.length === 1 ? "result" : "results"}` : "Search across 8 conversations"}</span>
        </div>
        {query.trim() ? (
          result.length ? (
            <div className="search-results-list">
              {result.map((item, index) => (
                <Link key={`${item.meeting.id}-${item.type}-${item.time ?? index}-${index}`} className="search-result-card" href={`/meetings/${item.meeting.id}${item.time !== undefined ? `?t=${item.time}` : ""}`}>
                  <span className={`search-result-type ${item.type === "Action item" ? "result-type-action" : item.type === "Transcript" ? "result-type-transcript" : ""}`}><Icon name={item.type === "Transcript" ? "file" : item.type === "Action item" ? "checkCircle" : item.type === "Participant" ? "people" : "calendar"} size={14} />{item.type}</span>
                  <span className="search-result-text">{item.text}</span>
                  <span className="search-result-meeting"><strong>{item.meeting.title}</strong><span><KindBadge kind={item.meeting.kind} /> · {formatMeetingDate(item.meeting.date)} · {formatDuration(item.meeting.durationSeconds)}</span></span>
                  {item.time !== undefined && <span className="search-result-time">{formatTimestamp(item.time)} <Icon name="arrow" size={13} /></span>}
                </Link>
              ))}
            </div>
          ) : <EmptyState icon="search" title="No matches in your meetings" description="Try a shorter phrase or search in another category." action={<button className="button button-secondary" onClick={() => setQuery("")}>Clear search</button>} />
        ) : <div className="search-suggestions"><span>Try searching for</span>{["pilot", "transcript search", "Maya Chen"].map((item) => <button key={item} className="suggestion-chip" onClick={() => setQuery(item)}>{item}<Icon name="arrow" size={13} /></button>)}</div>}
        <div className="search-disclosure"><Icon name="info" size={14} /> Search runs locally across the sample conversations in this demo workspace.</div>
      </div>
    </AppShell>
  );
}
