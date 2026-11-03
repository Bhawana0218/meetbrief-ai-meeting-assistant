import Link from "next/link";
import type { ReactNode } from "react";
import { formatDuration, formatMeetingDate, getMeetingKindTemplate } from "@/lib/meetings";
import type { Meeting, MeetingKind, Participant } from "@/lib/types";
import { Icon } from "@/components/icon";

const kindClass: Record<MeetingKind, string> = {
  "Customer call": "kind-customer",
  "Internal sync": "kind-internal",
  "Stand-up": "kind-standup",
  Interview: "kind-interview",
  "Project review": "kind-project",
};

export function PersonAvatar({ person, className = "" }: { person: Participant; className?: string }) {
  return (
    <span className={`avatar avatar-${person.color} ${className}`} title={`${person.name} · ${person.role}`}>
      {person.initials}
    </span>
  );
}

export function AvatarStack({ participants, limit = 3 }: { participants: Participant[]; limit?: number }) {
  const visible = participants.slice(0, limit);
  return (
    <span className="avatar-stack" aria-label={`${participants.length} participants`}>
      {visible.map((person) => <PersonAvatar key={person.name} person={person} />)}
      {participants.length > limit && <span className="avatar avatar-more">+{participants.length - limit}</span>}
    </span>
  );
}

export function KindBadge({ kind }: { kind: MeetingKind }) {
  return <span className={`kind-badge ${kindClass[kind]}`}>{kind}</span>;
}

export function MeetingCard({ meeting, compact = false }: { meeting: Meeting; compact?: boolean }) {
  const actionCount = meeting.summary.actions.length;
  return (
    <Link href={`/meetings/${meeting.id}`} className={`meeting-card ${compact ? "meeting-card-compact" : ""}`}>
      <div className="meeting-card-top">
        <KindBadge kind={meeting.kind} />
        <span className="meeting-card-date">{formatMeetingDate(meeting.date)}</span>
      </div>
      <h3>{meeting.title}</h3>
      <p className="meeting-card-summary">{meeting.summary.headline}</p>
      {meeting.summary.bullets[0] && <p className="meeting-card-context"><span>KEY TAKEAWAY</span>{meeting.summary.bullets[0]}</p>}
      <div className="meeting-card-bottom">
        <AvatarStack participants={meeting.participants} />
        <span className="meeting-card-duration"><Icon name="clock" size={13} />{formatDuration(meeting.durationSeconds)}</span>
        <span className="card-actions-count"><Icon name="checkCircle" size={14} />{actionCount} next steps</span>
      </div>
    </Link>
  );
}

export function PageHeading({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {actions && <div className="page-heading-actions">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  icon = "inbox",
  title,
  description,
  action,
}: {
  icon?: "inbox" | "search" | "bookmark";
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon"><Icon name={icon} size={22} /></span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function meetingTemplateLabel(meeting: Meeting) {
  return getMeetingKindTemplate(meeting.kind);
}
