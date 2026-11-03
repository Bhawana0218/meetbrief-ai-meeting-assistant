"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icon";
import { useMeetBrief } from "@/components/meetbrief-provider";
import { AvatarStack, EmptyState, KindBadge, PersonAvatar } from "@/components/ui";
import { formatDuration, formatTimestamp, getMeetingKindTemplate, getMeetings } from "@/lib/meetings";
import { buildDemoSummary, templateNames } from "@/lib/summary";
import type { MeetingSummary, TemplateId } from "@/lib/types";

function formatLongDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatClock(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function HighlightText({ text, query }: { text: string; query: string }) {
  const trimmed = query.trim();
  if (!trimmed) return <>{text}</>;
  const parts = text.split(new RegExp(`(${trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
  return <>{parts.map((part, index) => part.toLowerCase() === trimmed.toLowerCase() ? <mark key={index}>{part}</mark> : part)}</>;
}

export function MeetingWorkspace({ meetingId }: { meetingId: string }) {
  const {
    meetings: extraMeetings,
    summaries,
    completedActions,
    highlights: savedHighlights,
    clips,
    setActionCompleted,
    setMeetingSummary,
    addHighlight,
    addClip,
    ready,
  } = useMeetBrief();
  const meetings = useMemo(() => getMeetings(extraMeetings), [extraMeetings]);
  const foundMeeting = meetings.find((item) => item.id === meetingId);
  const foundSummary = foundMeeting ? summaries[foundMeeting.id] ?? foundMeeting.summary : undefined;
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [search, setSearch] = useState("");
  const [speakerFilter, setSpeakerFilter] = useState("All speakers");
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId | null>(null);
  const [generating, setGenerating] = useState(false);
  const [summaryMode, setSummaryMode] = useState<"demo" | "ai" | "seed">("seed");
  const [notice, setNotice] = useState<{ message: string; kind: "success" | "error" } | null>(null);
  const [highlightNote, setHighlightNote] = useState("");
  const [clipDialogOpen, setClipDialogOpen] = useState(false);
  const [clipTitle, setClipTitle] = useState("");
  const [clipStart, setClipStart] = useState(0);
  const [clipEnd, setClipEnd] = useState(0);
  const [clipUrl, setClipUrl] = useState("");
  const [createdClipId, setCreatedClipId] = useState("");
  const [clipStartText, setClipStartText] = useState("00:00");
  const [clipEndText, setClipEndText] = useState("00:30");
  const transcriptRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!foundMeeting) return;
    const urlTime = Number(new URLSearchParams(window.location.search).get("t"));
    if (Number.isFinite(urlTime) && urlTime >= 0) {
      const animationFrame = window.requestAnimationFrame(() => setCurrentTime(Math.min(urlTime, foundMeeting.durationSeconds)));
      return () => window.cancelAnimationFrame(animationFrame);
    }
  }, [foundMeeting]);

  useEffect(() => {
    if (!isPlaying || !foundMeeting) return;
    const timer = window.setInterval(() => {
      setCurrentTime((current) => {
        if (current + 1 >= foundMeeting.durationSeconds) {
          setIsPlaying(false);
          return foundMeeting.durationSeconds;
        }
        return current + 1;
      });
    }, 1000 / playbackRate);
    return () => window.clearInterval(timer);
  }, [isPlaying, foundMeeting, playbackRate]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 4200);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    if (!clipDialogOpen) return;
    function closeDialog(event: KeyboardEvent) {
      if (event.key === "Escape") setClipDialogOpen(false);
    }
    window.addEventListener("keydown", closeDialog);
    return () => window.removeEventListener("keydown", closeDialog);
  }, [clipDialogOpen]);

  if (!ready && !foundMeeting) {
    return <AppShell><div className="loading-card"><span className="loading-dot" />Loading meeting notes…</div></AppShell>;
  }
  if (!foundMeeting || !foundSummary) {
    return (
      <AppShell>
        <EmptyState icon="search" title="We couldn't find this meeting" description="It may have been removed from this demo workspace." action={<Link href="/meetings" className="button button-secondary">Back to meetings</Link>} />
      </AppShell>
    );
  }

  const meeting = foundMeeting;
  const summary = foundSummary;
  const template = selectedTemplate ?? getMeetingKindTemplate(meeting.kind) as TemplateId;
  const visibleTranscript = meeting.transcript.filter((line) => {
    const textMatch = !search.trim() || `${line.speaker} ${line.text}`.toLowerCase().includes(search.trim().toLowerCase());
    const speakerMatch = speakerFilter === "All speakers" || line.speaker === speakerFilter;
    return textMatch && speakerMatch;
  });
  const highlights = [
    ...savedHighlights.filter((highlight) => highlight.meetingId === meeting.id).map((highlight) => ({
      id: highlight.id,
      seconds: highlight.seconds,
      label: "Saved moment",
      note: highlight.note,
    })),
    ...meeting.highlights.map((highlight, index) => ({
      id: `${meeting.id}-seed-${index}`,
      ...highlight,
    })),
  ].sort((a, b) => a.seconds - b.seconds);
  const completedCount = summary.actions.filter((action) => completedActions[action.id]).length;

  function seekTo(seconds: number, transcriptId?: string) {
    setCurrentTime(Math.max(0, Math.min(seconds, meeting.durationSeconds)));
    if (transcriptId) {
      window.setTimeout(() => transcriptRefs.current[transcriptId]?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 0);
    }
  }

  async function regenerateSummary() {
    setGenerating(true);
    setNotice(null);
    try {
      const response = await fetch("/api/summaries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template,
          meeting: {
            title: meeting.title,
            transcript: meeting.transcript.map(({ speaker, seconds, text }) => ({ speaker, seconds, text })),
            participants: meeting.participants.map((person) => person.name),
            sourceSummary: meeting.summary,
          },
        }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const message = payload && typeof payload === "object" && "error" in payload ? String(payload.error) : "The summary service returned an error.";
        throw new Error(message);
      }
      if (!payload || typeof payload !== "object" || !("summary" in payload) || !("mode" in payload)) {
        throw new Error("The summary service returned an invalid response.");
      }
      const result = payload as { summary: MeetingSummary; mode: "ai" | "demo" };
      setMeetingSummary(meeting.id, result.summary);
      setSummaryMode(result.mode);
      setNotice({
        message: result.mode === "ai" ? "AI summary generated from the meeting notes." : "Demo summary refreshed from the supplied meeting notes.",
        kind: "success",
      });
    } catch (error) {
      console.error("Could not regenerate the meeting summary.", error);
      setMeetingSummary(meeting.id, buildDemoSummary(meeting, template));
      setSummaryMode("demo");
      setNotice({
        message: "The summary service was unavailable. A source-based demo summary is shown instead.",
        kind: "error",
      });
    } finally {
      setGenerating(false);
    }
  }

  function saveHighlight() {
    const note = highlightNote.trim();
    if (note.length < 3 || note.length > 240) {
      setNotice({ message: "Add a highlight note between 3 and 240 characters.", kind: "error" });
      return;
    }
    try {
      addHighlight(meeting.id, currentTime, note);
      setHighlightNote("");
      setNotice({ message: `Moment saved at ${formatTimestamp(currentTime)}.`, kind: "success" });
    } catch (error) {
      console.error("Could not save highlight.", error);
      setNotice({ message: "The highlight could not be saved.", kind: "error" });
    }
  }

  function openClipDialog() {
    setClipStart(currentTime);
    setClipEnd(Math.min(currentTime + 30, meeting.durationSeconds));
    setClipStartText(formatTimestamp(currentTime));
    setClipEndText(formatTimestamp(Math.min(currentTime + 30, meeting.durationSeconds)));
    setClipTitle(`${meeting.title} · ${formatTimestamp(currentTime)}`);
    setClipUrl("");
    setCreatedClipId("");
    setClipDialogOpen(true);
  }

  async function createShareClip() {
    if (clipTitle.trim().length < 3 || clipTitle.trim().length > 120) {
      setNotice({ message: "Clip title must be between 3 and 120 characters.", kind: "error" });
      return;
    }
    const startMatch = clipStartText.match(/^(\d{1,3}):([0-5]\d)$/);
    const endMatch = clipEndText.match(/^(\d{1,3}):([0-5]\d)$/);
    if (!startMatch || !endMatch) {
      setNotice({ message: "Enter clip times in mm:ss format.", kind: "error" });
      return;
    }
    const startSeconds = Number(startMatch[1]) * 60 + Number(startMatch[2]);
    const endSeconds = Number(endMatch[1]) * 60 + Number(endMatch[2]);
    if (startSeconds < 0 || endSeconds > meeting.durationSeconds || endSeconds <= startSeconds) {
      setNotice({ message: "Choose an end time after the start, within this meeting.", kind: "error" });
      return;
    }
    setClipStart(startSeconds);
    setClipEnd(endSeconds);
    try {
      const clip = addClip({
        meetingId: meeting.id,
        startSeconds,
        endSeconds,
        title: clipTitle.trim(),
        isPublic: true,
      });
      setCreatedClipId(clip.id);
      const url = `${window.location.origin}/share/${clip.id}`;
      setClipUrl(url);
      try {
        await navigator.clipboard.writeText(url);
        setNotice({ message: "Demo share link copied. It only works in this browser.", kind: "success" });
      } catch {
        setNotice({ message: "Demo link created. Use the copy button below to copy it.", kind: "success" });
      }
    } catch (error) {
      console.error("Could not create meeting clip.", error);
      setNotice({ message: "The demo clip could not be created.", kind: "error" });
    }
  }

  async function copyClipLink(clipId: string) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/share/${clipId}`);
      setNotice({ message: "Demo share link copied. It only works in this browser.", kind: "success" });
    } catch (error) {
      console.error("Could not copy demo link.", error);
      setNotice({ message: "Clipboard access is unavailable in this browser.", kind: "error" });
    }
  }

  return (
    <AppShell>
      <div className="meeting-page">
        <div className="back-link-row"><Link href="/meetings"><Icon name="arrowLeft" size={16} /> All meetings</Link><span className="meeting-breadcrumb-separator">/</span><span>{meeting.title}</span></div>
        <div className="meeting-detail-heading">
          <div className="meeting-title-block">
            <div className="meeting-title-tags"><KindBadge kind={meeting.kind} /><span className="meeting-platform"><span className="platform-dot" />{meeting.platform}</span></div>
            <h1>{meeting.title}</h1>
            <div className="meeting-detail-meta"><span><Icon name="calendar" size={15} />{formatLongDate(meeting.date)}</span><span><Icon name="clock" size={15} />{formatDuration(meeting.durationSeconds)}</span><span><AvatarStack participants={meeting.participants} limit={4} />{meeting.participants.length} participants</span></div>
          </div>
          <div className="meeting-heading-actions"><button className="button button-secondary" onClick={openClipDialog}><Icon name="share" size={16} /> Share clip</button><button className="button button-primary" onClick={() => document.getElementById("action-items")?.scrollIntoView({ behavior: "smooth" })}><Icon name="checkCircle" size={16} /> Follow-ups</button></div>
        </div>

        <section className="player-card" aria-label="Simulated recording player">
          <div className="player-topline"><span className="player-label"><Icon name="headphone" size={15} /> MEETING RECORDING</span><span className="demo-recording-label"><span /> SIMULATED PLAYBACK</span></div>
          <div className="player-main">
            <button className="player-play" aria-label={isPlaying ? "Pause simulated playback" : "Play simulated playback"} onClick={() => setIsPlaying((playing) => !playing)}><Icon name={isPlaying ? "pause" : "play"} size={19} /></button>
            <div className="player-track-area">
              <div className="player-time-row"><span>{formatClock(currentTime)}</span><span>{formatClock(meeting.durationSeconds)}</span></div>
              <input className="player-range" type="range" min={0} max={meeting.durationSeconds} value={currentTime} aria-label="Simulated recording position" style={{ "--progress": `${(currentTime / meeting.durationSeconds) * 100}%` } as React.CSSProperties} onChange={(event) => seekTo(Number(event.target.value))} />
              <div className="player-ticks"><span /><span /><span /><span /><span /><span /><span /><span /><span /></div>
            </div>
            <button className="speed-button" onClick={() => setPlaybackRate((rate) => rate === 2 ? 1 : rate + 0.25)} aria-label={`Playback speed ${playbackRate} times; change speed`}>{playbackRate}×</button>
          </div>
          <div className="player-disclosure"><Icon name="info" size={14} /> Demo playback is a simulated timeline. No audio or video recording is stored.</div>
          <div className="player-bottom">
            <span><Icon name="volume" size={16} /> Transcript synced to conversation</span>
            <button className="text-button" onClick={openClipDialog}><Icon name="share" size={15} /> Create a clip</button>
          </div>
        </section>

        <div className="workspace-grid">
          <section className="transcript-panel" aria-label="Meeting transcript">
            <div className="panel-heading transcript-heading">
              <div><span className="panel-title-icon transcript-icon"><Icon name="file" size={17} /></span><div><h2>Transcript</h2><p>{meeting.transcript.length} moments · searchable</p></div></div>
            </div>
            <div className="transcript-controls">
              <label className="transcript-search"><Icon name="search" size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find in transcript..." aria-label="Search transcript" /></label>
              <label className="speaker-select"><Icon name="people" size={15} /><select value={speakerFilter} onChange={(event) => setSpeakerFilter(event.target.value)} aria-label="Filter transcript by speaker"><option>All speakers</option>{meeting.participants.map((person) => <option key={person.name}>{person.name}</option>)}</select><Icon name="down" size={13} /></label>
            </div>
            <div className="transcript-list">
              {visibleTranscript.length ? visibleTranscript.map((line) => {
                const person = meeting.participants.find((item) => item.name === line.speaker);
                const isActive = currentTime >= line.seconds && currentTime < (meeting.transcript.find((item) => item.seconds > line.seconds)?.seconds ?? line.seconds + 40);
                return (
                  <div className={`transcript-entry ${isActive ? "transcript-entry-active" : ""}`} key={line.id} ref={(element) => { transcriptRefs.current[line.id] = element; }}>
                    <button className="transcript-time" onClick={() => seekTo(line.seconds, line.id)} aria-label={`Jump to ${formatTimestamp(line.seconds)}`}>{formatTimestamp(line.seconds)}</button>
                    <div className="transcript-entry-content">
                      <div className="transcript-speaker">{person && <PersonAvatar person={person} />}<strong>{line.speaker}</strong>{isActive && <span className="speaking-indicator"><i /><i /><i /></span>}</div>
                      <p><HighlightText text={line.text} query={search} /></p>
                    </div>
                  </div>
                );
              }) : <div className="transcript-no-match"><Icon name="search" size={18} /><strong>No matching transcript lines</strong><span>Try a different search or speaker.</span><button className="text-link" onClick={() => { setSearch(""); setSpeakerFilter("All speakers"); }}>Clear search</button></div>}
            </div>
            <div className="transcript-footer"><Icon name="shield" size={14} /> Demo transcript · generated sample content</div>
          </section>

          <aside className="insights-column">
            <section className="insights-card summary-card">
              <div className="insights-card-heading"><div><span className="panel-title-icon summary-icon"><Icon name="sparkles" size={17} /></span><div><h2>AI summary</h2><p>Clear takeaways, without the rewatch.</p></div></div><span className={`summary-source ${summaryMode === "ai" ? "summary-source-ai" : ""}`}>{summaryMode === "ai" ? "AI" : "DEMO"}</span></div>
              <div className="summary-template-row">
                <label htmlFor="summary-template">FORMAT</label>
                <select id="summary-template" value={template} onChange={(event) => setSelectedTemplate(event.target.value as TemplateId)}>
                  {Object.entries(templateNames).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                </select>
                <button className="icon-button regenerate-button" onClick={regenerateSummary} disabled={generating} aria-label="Regenerate summary" title="Regenerate summary"><Icon name="wand" size={16} /></button>
              </div>
              <p className="summary-headline">{summary.headline}</p>
              <div className="summary-bullets">{summary.bullets.map((bullet, index) => <div className="summary-bullet" key={`${index}-${bullet}`}><span className="bullet-dot" /><p>{bullet}</p></div>)}</div>
              <button className="button button-summary" onClick={regenerateSummary} disabled={generating}>{generating ? <><span className="button-spinner" /> Generating…</> : <><Icon name="sparkles" size={15} /> Regenerate summary</>}</button>
              <div className="ai-disclosure"><Icon name="info" size={13} /> {summaryMode === "ai" ? "Sent to your configured AI provider. Review the generated notes for accuracy." : "Source-based demo summary. Add an API key to enable live AI."}</div>
            </section>

            <section className="insights-card">
              <div className="insights-card-heading section-card-heading"><div><span className="panel-title-icon decision-icon"><Icon name="checkCircle" size={17} /></span><div><h2>Decisions</h2><p>{summary.decisions.length} captured</p></div></div></div>
              {summary.decisions.length ? <ul className="decision-list">{summary.decisions.map((decision, index) => <li key={`${index}-${decision}`}><span className="decision-check"><Icon name="check" size={13} /></span><span>{decision}</span></li>)}</ul> : <p className="section-empty-copy">No decisions were recorded in this meeting.</p>}
            </section>

            <section className="insights-card" id="action-items">
              <div className="insights-card-heading section-card-heading"><div><span className="panel-title-icon action-icon"><Icon name="check" size={17} /></span><div><h2>Action items</h2><p>{completedCount} of {summary.actions.length} complete</p></div></div><span className="action-progress">{summary.actions.length ? Math.round((completedCount / summary.actions.length) * 100) : 0}%</span></div>
              {summary.actions.length ? <div className="action-list">{summary.actions.map((action) => {
                const done = completedActions[action.id] ?? false;
                return <label key={action.id} className={`action-row ${done ? "action-row-done" : ""}`}><input type="checkbox" checked={done} onChange={(event) => setActionCompleted(action.id, event.target.checked)} /><span className="custom-checkbox"><Icon name="check" size={12} /></span><span className="action-text-group"><span className="action-text">{action.text}</span><span className="action-meta">{action.owner || "Owner not specified"}{action.due ? <><span>·</span><span className="action-due">{action.due}</span></> : null}</span></span></label>;
              })}</div> : <p className="section-empty-copy">No follow-ups were recorded in this meeting.</p>}
            </section>
          </aside>
        </div>

        <section className="below-workspace-grid">
          <div className="below-card highlights-card">
            <div className="below-heading"><div><span className="panel-title-icon highlight-icon"><Icon name="bookmark" size={17} /></span><div><h2>Key moments</h2><p>Jump back to something worth keeping.</p></div></div><span className="count-badge">{highlights.length}</span></div>
            <div className="add-highlight-row"><label className="highlight-input"><Icon name="edit" size={15} /><input maxLength={240} value={highlightNote} onChange={(event) => setHighlightNote(event.target.value)} placeholder={`Save a note at ${formatTimestamp(currentTime)}…`} aria-label="Highlight note" /></label><button className="button button-secondary button-small" onClick={saveHighlight}><Icon name="plus" size={14} /> Save moment</button></div>
            {highlights.length ? <div className="saved-highlights-list">{highlights.map((highlight) => <button key={highlight.id} className="saved-highlight-row" onClick={() => seekTo(highlight.seconds)}><span className="saved-highlight-time">{formatTimestamp(highlight.seconds)}</span><span className="saved-highlight-copy"><strong>{highlight.label}</strong><small>{highlight.note}</small></span><Icon name="play" size={13} /></button>)}</div> : <p className="section-empty-copy">No moments saved yet. Add a note while reviewing the conversation.</p>}
          </div>
          <div className="below-card participants-card">
            <div className="below-heading"><div><span className="panel-title-icon people-icon"><Icon name="people" size={17} /></span><div><h2>People</h2><p>{meeting.participants.length} in this conversation</p></div></div></div>
            <div className="participant-list">{meeting.participants.map((person) => <div key={person.name} className="participant-row"><PersonAvatar person={person} /><span><strong>{person.name}</strong><small>{person.role}</small></span><span className="participant-speaker">{meeting.transcript.some((line) => line.speaker === person.name) ? "Speaker" : "Guest"}</span></div>)}</div>
          </div>
        </section>

        {clips.filter((clip) => clip.meetingId === meeting.id).length > 0 && <section className="existing-clips"><div className="section-heading"><div><h2>Shared clips</h2><p>Simulated links saved from this conversation.</p></div></div><div className="clip-list">{clips.filter((clip) => clip.meetingId === meeting.id).map((clip) => <div key={clip.id} className="clip-row"><span className="clip-icon"><Icon name="play" size={14} /></span><div><strong>{clip.title}</strong><small>{formatTimestamp(clip.startSeconds)} – {formatTimestamp(clip.endSeconds)} · {clip.isPublic ? "Public demo link" : "Private"}</small></div><Link className="text-link" href={`/share/${clip.id}`}>Open clip <Icon name="arrow" size={14} /></Link><button className="icon-button" aria-label="Copy clip link" onClick={() => copyClipLink(clip.id)}><Icon name="copy" size={15} /></button></div>)}</div></section>}

        {notice && <div role="status" className={`toast toast-${notice.kind}`}><Icon name={notice.kind === "success" ? "checkCircle" : "info"} size={17} />{notice.message}<button className="toast-close" aria-label="Dismiss message" onClick={() => setNotice(null)}><Icon name="close" size={15} /></button></div>}
        {clipDialogOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setClipDialogOpen(false); }}><section className="clip-modal" role="dialog" aria-modal="true" aria-labelledby="clip-modal-title"><div className="modal-heading"><div><span className="panel-title-icon highlight-icon"><Icon name="share" size={17} /></span><div><h2 id="clip-modal-title">Create a meeting clip</h2><p>A timestamped demo link, not an exported video.</p></div></div><button className="icon-button" aria-label="Close dialog" onClick={() => setClipDialogOpen(false)}><Icon name="close" /></button></div><div className="clip-modal-disclosure"><Icon name="info" size={15} /> This demo creates a local link to the transcript segment. No audio or video is exported.</div><label className="form-field"><span>Clip title</span><input value={clipTitle} maxLength={120} onChange={(event) => setClipTitle(event.target.value)} /></label><div className="clip-time-fields"><label className="form-field"><span>Start · mm:ss</span><input inputMode="numeric" value={clipStartText} onChange={(event) => { setClipStartText(event.target.value); const match = event.target.value.match(/^(\d{1,3}):([0-5]\d)$/); if (match) setClipStart(Number(match[1]) * 60 + Number(match[2])); }} onBlur={() => setClipStartText(formatTimestamp(clipStart))} aria-label="Clip start time in minutes and seconds" /></label><label className="form-field"><span>End · mm:ss</span><input inputMode="numeric" value={clipEndText} onChange={(event) => { setClipEndText(event.target.value); const match = event.target.value.match(/^(\d{1,3}):([0-5]\d)$/); if (match) setClipEnd(Number(match[1]) * 60 + Number(match[2])); }} onBlur={() => setClipEndText(formatTimestamp(clipEnd))} aria-label="Clip end time in minutes and seconds" /></label></div>{clipUrl ? <div className="created-clip-link"><Icon name="link" size={15} /><Link href={`/share/${createdClipId}`}>{clipUrl}</Link><button className="icon-button" aria-label="Copy demo clip link" onClick={() => copyClipLink(createdClipId)}><Icon name="copy" size={15} /></button></div> : <button className="button button-primary modal-submit" onClick={createShareClip}><Icon name="link" size={16} /> Create local demo link</button>}<p className="modal-privacy"><Icon name="lock" size={13} /> Demo links are stored in this browser only.</p></section></div>}
      </div>
    </AppShell>
  );
}
