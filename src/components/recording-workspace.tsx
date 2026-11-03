"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icon";
import { useMeetBrief } from "@/components/meetbrief-provider";
import { PageHeading } from "@/components/ui";
import { formatClock } from "@/lib/recording";
import type { Meeting, Participant } from "@/lib/types";

function makeParticipant(name: string, index: number): Participant {
  const cleanName = name.trim();
  const initials = cleanName.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
  return {
    name: cleanName,
    role: "Participant",
    initials: initials || `P${index + 1}`,
    color: ["lavender", "peach", "mint", "sky"][index % 4],
  };
}

export function RecordingWorkspace() {
  const router = useRouter();
  const { addMeeting } = useMeetBrief();
  const [title, setTitle] = useState("");
  const [participantNames, setParticipantNames] = useState("");
  const [notes, setNotes] = useState("");
  const [duration, setDuration] = useState(0);
  const [status, setStatus] = useState<"setup" | "recording" | "processing">("setup");
  const [error, setError] = useState("");
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (status !== "recording") return;
    const interval = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(interval);
  }, [status]);

  const noteLines = useMemo(
    () => notes.split(/(?<=[.!?])\s+|\n+/).map((line) => line.trim()).filter(Boolean),
    [notes],
  );

  function startSimulation() {
    if (title.trim().length < 3 || title.trim().length > 120) {
      setError("Enter a meeting title between 3 and 120 characters.");
      return;
    }
    if (notes.trim().length < 20 || notes.trim().length > 4000) {
      setError("Add at least 20 characters of your own notes (up to 4,000) before starting.");
      return;
    }
    setError("");
    setSeconds(0);
    setStatus("recording");
  }

  function stopSimulation() {
    if (noteLines.length === 0) {
      setError("Add notes before stopping so the demo meeting has real user-provided content.");
      return;
    }
    setDuration(Math.max(seconds, 1));
    setStatus("processing");
    const participants = [
      makeParticipant("Bhawana", 0),
      ...participantNames.split(",").map((name, index) => makeParticipant(name, index + 1)).filter((person) => person.name.length > 0),
    ];
    const now = new Date();
    const meetingId = `demo-${Date.now().toString(36)}`;
    const durationSeconds = Math.max(seconds, 60);
    const transcript = noteLines.slice(0, 30).map((text, index) => ({
      id: `${meetingId}-note-${index + 1}`,
      seconds: Math.floor((index / Math.max(noteLines.length, 1)) * durationSeconds),
      speaker: participants[0].name,
      text,
    }));
    const meeting: Meeting = {
      id: meetingId,
      title: title.trim(),
      kind: "Internal sync",
      date: now.toISOString(),
      durationSeconds,
      platform: "Manual demo capture",
      participants,
      summary: {
        headline: "Demo capture created from notes you entered manually. No call was joined and no audio was transcribed.",
        bullets: noteLines.slice(0, 5),
        decisions: [],
        actions: [],
      },
      transcript,
      highlights: [],
    };
    window.setTimeout(() => {
      addMeeting(meeting);
      router.push(`/meetings/${meetingId}`);
    }, 750);
  }

  return (
    <AppShell>
      <div className="recording-page">
        <PageHeading eyebrow="DEMO CAPTURE" title="Capture a conversation" description="A quiet place to stay present. Notes you enter become a searchable meeting record." actions={<Link href="/meetings" className="button button-quiet"><Icon name="arrowLeft" size={16} /> All meetings</Link>} />
        <div className="capture-disclosure"><span className="capture-disclosure-icon"><Icon name="shield" size={18} /></span><div><strong>Simulation only · no meeting is joined or recorded</strong><p>MeetBrief does not connect to a call, access your microphone, capture audio, or make a real transcript. This flow uses only the title and notes you provide below.</p></div></div>
        <div className="recording-layout">
          <section className={`recording-console ${status === "recording" ? "recording-console-active" : ""}`}>
            <div className="console-topline"><span><span className={`recording-status-dot ${status === "recording" ? "status-live" : ""}`} />{status === "recording" ? "SIMULATED CAPTURE IN PROGRESS" : status === "processing" ? "PREPARING YOUR NOTES" : "READY WHEN YOU ARE"}</span><span className="console-demo-label">DEMO MODE</span></div>
            <div className="recording-visual"><span className="recording-orbit orbit-one" /><span className="recording-orbit orbit-two" /><span className={`recording-mic ${status === "recording" ? "mic-recording" : ""}`}><Icon name={status === "recording" ? "mic" : "headphone"} size={28} /></span></div>
            <div className="recording-timer">{formatClock(status === "recording" ? seconds : status === "processing" ? duration : 0)}</div>
            <p className="recording-status-copy">{status === "recording" ? "Your demo timer is running. Nothing is being recorded." : status === "processing" ? "Organizing the notes you supplied…" : "Your simulated meeting will use only the details you enter."}</p>
            {status === "setup" ? <button className="button button-record-start" onClick={startSimulation}><Icon name="mic" size={17} /> Start simulated capture</button> : status === "recording" ? <button className="button button-record-stop" onClick={stopSimulation}><Icon name="stop" size={16} /> Stop & create meeting</button> : <div className="processing-indicator"><span className="button-spinner" /> Preparing your meeting notes…</div>}
            <div className="console-footnote"><Icon name="lock" size={13} /> Notes stay in this browser’s demo storage.</div>
          </section>
          <section className="capture-form-card">
            <div className="capture-form-heading"><span className="panel-title-icon transcript-icon"><Icon name="edit" size={17} /></span><div><h2>Meeting details</h2><p>These are the only details used to build the sample record.</p></div></div>
            <label className="form-field"><span>Meeting title <b>*</b></span><input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder="e.g. Q4 planning sync" disabled={status !== "setup"} /><small>3–120 characters</small></label>
            <label className="form-field"><span>Other participants <em>optional</em></span><input value={participantNames} onChange={(event) => setParticipantNames(event.target.value)} placeholder="Separate names with commas" disabled={status !== "setup"} /><small>These names are shown as participants; no one is contacted.</small></label>
            <label className="form-field"><span>Your meeting notes <b>*</b></span><textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={4000} rows={7} placeholder="Paste or type notes from your conversation. Separate thoughts into sentences or lines so they’re easier to search later." disabled={status !== "setup"} /><small>{notes.length}/4,000 · at least 20 characters</small></label>
            {error && <p className="form-error" role="alert"><Icon name="info" size={14} />{error}</p>}
            <div className="capture-form-foot"><span><Icon name="info" size={14} /> Sample transcript labels your notes as manually supplied.</span><span>Private to this browser</span></div>
          </section>
        </div>
        <section className="recording-steps"><div className="recording-step"><span>01</span><strong>Add context</strong><p>Give the meeting a title and enter your notes.</p></div><div className="recording-step"><span>02</span><strong>Start the demo timer</strong><p>See how a capture flow feels without connecting to a call.</p></div><div className="recording-step"><span>03</span><strong>Review your record</strong><p>Search your own notes and save a highlight or clip.</p></div></section>
      </div>
    </AppShell>
  );
}
