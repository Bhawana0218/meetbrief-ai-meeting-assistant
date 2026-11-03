"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icon";
import { useMeetBrief } from "@/components/meetbrief-provider";
import { AvatarStack, EmptyState } from "@/components/ui";
import { formatMeetingDate, formatTimestamp, getMeetings } from "@/lib/meetings";

export function SharedClipPage({ clipId }: { clipId: string }) {
  const { clips, meetings: extraMeetings, setClipPublic, ready } = useMeetBrief();
  const meetings = useMemo(() => getMeetings(extraMeetings), [extraMeetings]);
  const clip = clips.find((item) => item.id === clipId);
  const meeting = clip ? meetings.find((item) => item.id === clip.meetingId) : undefined;
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  async function copyLink() {
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch (error) {
      console.error("Could not copy the demo clip link.", error);
      setCopyError("Clipboard access is unavailable. You can copy the link from the address bar.");
    }
  }

  if (!ready && !clip) return <AppShell><div className="loading-card"><span className="loading-dot" />Loading clip…</div></AppShell>;
  if (!clip || !meeting) {
    return <AppShell><EmptyState icon="search" title="This demo clip isn't available" description="Local demo links only work in the browser where the clip was created." action={<Link className="button button-secondary" href="/meetings">Browse meetings</Link>} /></AppShell>;
  }

  const lines = meeting.transcript.filter((line) => line.seconds >= clip.startSeconds && line.seconds <= clip.endSeconds);

  return (
    <AppShell>
      <div className="shared-clip-page">
        <div className="back-link-row"><Link href={`/meetings/${meeting.id}`}><Icon name="arrowLeft" size={16} /> Back to meeting</Link><span className="meeting-breadcrumb-separator">/</span><span>Shared clip</span></div>
        {!clip.isPublic ? (
          <div className="privacy-gate"><span className="privacy-gate-icon"><Icon name="lock" size={24} /></span><h1>This demo link is private</h1><p>The creator turned off access to this local clip.</p><Link className="button button-secondary" href={`/meetings/${meeting.id}`}>Return to meeting</Link></div>
        ) : (
          <div className="shared-clip-card">
            <div className="shared-clip-brand"><span className="brand-mark"><Icon name="logo" size={21} /></span><span>meetbrief<span className="brand-period">.</span></span><span className="demo-link-badge"><Icon name="info" size={13} /> LOCAL DEMO LINK</span></div>
            <span className="shared-clip-kicker">A MOMENT FROM A MEETING</span>
            <h1>{clip.title}</h1>
            <Link href={`/meetings/${meeting.id}`} className="shared-meeting-link">{meeting.title}<Icon name="arrow" size={14} /></Link>
            <div className="shared-clip-player"><span className="shared-clip-play"><Icon name="play" size={19} /></span><div className="shared-clip-wave" aria-hidden="true">{Array.from({ length: 42 }, (_, index) => <i key={index} style={{ height: `${18 + ((index * 37 + 19) % 70)}%` }} />)}</div><span className="shared-clip-duration">{formatTimestamp(clip.startSeconds)} – {formatTimestamp(clip.endSeconds)}</span></div>
            <div className="shared-clip-disclosure"><Icon name="headphone" size={15} /> Simulated clip · transcript preview only · no audio or video exported.</div>
            <div className="shared-clip-participants"><AvatarStack participants={meeting.participants} limit={5} /><span>{meeting.participants.map((person) => person.name).join(", ")}</span></div>
            <div className="shared-transcript">
              <div className="shared-transcript-heading"><h2>In this clip</h2><span>{lines.length} transcript {lines.length === 1 ? "moment" : "moments"}</span></div>
              {lines.length ? lines.map((line) => <div className="shared-transcript-line" key={line.id}><span>{formatTimestamp(line.seconds)}</span><p><strong>{line.speaker}</strong>{line.text}</p></div>) : <p className="section-empty-copy">No transcript line falls inside this selected range. You can still open the full meeting.</p>}
            </div>
            <div className="shared-clip-footer"><span><Icon name="shield" size={14} /> Stored locally in this browser · {formatMeetingDate(meeting.date)}</span><div><button className="text-button" onClick={copyLink}><Icon name="copy" size={14} />{copied ? "Copied" : "Copy link"}</button><button className="text-button text-button-danger" onClick={() => setClipPublic(clip.id, false)}><Icon name="lock" size={14} /> Turn off link</button></div>{copyError && <p className="share-copy-error" role="status">{copyError}</p>}</div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
