"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { getMeetings } from "@/lib/meetings";
import { Icon, type IconName } from "@/components/icon";
import { useMeetBrief } from "@/components/meetbrief-provider";

const navigation: { label: string; href: string; icon: IconName }[] = [
  { label: "Overview", href: "/", icon: "grid" },
  { label: "Meetings", href: "/meetings", icon: "calendar" },
  { label: "Highlights", href: "/highlights", icon: "bookmark" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { meetings: extraMeetings, storageError } = useMeetBrief();
  const meetings = useMemo(() => getMeetings(extraMeetings), [extraMeetings]);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const matches = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (needle.length < 2) return [];
    return meetings
      .filter((meeting) =>
        [
          meeting.title,
          meeting.summary.headline,
          meeting.participants.map((person) => person.name).join(" "),
          meeting.transcript.map((line) => line.text).join(" "),
          meeting.summary.actions.map((action) => action.text).join(" "),
        ]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      )
      .slice(0, 4);
  }, [meetings, search]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
        setMobileSearchOpen(true);
        setSearchOpen(true);
      }
      if (event.key === "Escape") {
        setSearchOpen(false);
        setMobileSearchOpen(false);
        setMenuOpen(false);
        setNoticeOpen(false);
        setProfileOpen(false);
      }
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (searchWrapRef.current && !searchWrapRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
        setMobileSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = search.trim();
    if (!query) return;
    setSearchOpen(false);
    setMobileSearchOpen(false);
    router.push(`/search?q=${encodeURIComponent(query)}`);
  }

  const pageTitle =
    pathname === "/"
      ? "Overview"
      : pathname.startsWith("/meetings/")
        ? "Meeting notes"
        : pathname.startsWith("/meetings")
          ? "Meetings"
          : pathname.startsWith("/highlights")
            ? "Highlights"
            : pathname.startsWith("/record")
              ? "Record a meeting"
              : pathname.startsWith("/share")
                ? "Shared clip"
                : "Search";

  return (
    <div className="app-frame">
      {menuOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <Link className="brand" href="/" onClick={() => setMenuOpen(false)}>
          <span className="brand-mark"><Icon name="logo" size={23} strokeWidth={1.7} /></span>
          <span>meetbrief<span className="brand-period">.</span></span>
        </Link>
        <div className="workspace-switcher">
          <div className="workspace-avatar">S</div>
          <div className="workspace-copy"><strong>Studio North</strong><span>Free workspace</span></div>
          <Icon name="down" size={15} className="muted-icon" />
        </div>
        <p className="nav-label">WORKSPACE</p>
        <nav className="main-nav" aria-label="Main navigation">
          {navigation.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : item.href === "/meetings"
                  ? pathname.startsWith("/meetings")
                  : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link ${active ? "nav-link-active" : ""}`}
                onClick={() => setMenuOpen(false)}
              >
                <Icon name={item.icon} size={18} />
                <span>{item.label}</span>
                {item.label === "Meetings" && <span className="nav-count">{meetings.length}</span>}
              </Link>
            );
          })}
          <Link className={`nav-link ${pathname.startsWith("/search") ? "nav-link-active" : ""}`} href="/search" onClick={() => setMenuOpen(false)}>
            <Icon name="search" size={18} /><span>Search all</span>
          </Link>
        </nav>
        <div className="sidebar-bottom">
          <div className="capture-note">
            <span className="capture-icon"><Icon name="mic" size={16} /></span>
            <div><strong>Catch every detail</strong><span>Capture a meeting</span></div>
            <Link href="/record" className="capture-arrow" aria-label="Start a demo capture"><Icon name="arrow" size={15} /></Link>
          </div>
          <div className="profile-row">
            <div className="avatar avatar-lavender">BW</div>
            <div className="profile-copy"><strong>Bhawana</strong><span>Personal workspace</span></div>
            <div className="profile-menu-wrap">
              <button className="icon-button profile-menu" aria-label="Workspace profile" aria-expanded={profileOpen} onClick={() => setProfileOpen((open) => !open)}><Icon name="dots" size={18} /></button>
              {profileOpen && <div className="profile-popover"><strong>Personal workspace</strong><p>Meetings and changes in this demo are saved in this browser.</p><Link href="/record" onClick={() => setProfileOpen(false)}>Create a demo meeting <Icon name="arrow" size={13} /></Link></div>}
            </div>
          </div>
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <button className="mobile-menu icon-button" aria-label="Open navigation" onClick={() => setMenuOpen(true)}><Icon name="menu" /></button>
          <div className="breadcrumb"><span>Studio North</span><Icon name="chevron" size={14} /><strong>{pageTitle}</strong></div>
          <div className="topbar-actions">
            <div className="global-search-wrap" ref={searchWrapRef}>
              <button
                className={`mobile-search-toggle icon-button ${mobileSearchOpen ? "mobile-search-toggle-hidden" : ""}`}
                aria-label="Open search"
                aria-expanded={mobileSearchOpen}
                aria-controls="global-meeting-search"
                onClick={() => {
                  setMobileSearchOpen(true);
                  setSearchOpen(true);
                  window.setTimeout(() => searchRef.current?.focus(), 0);
                }}
              >
                <Icon name="search" size={18} />
              </button>
              <form id="global-meeting-search" className={`global-search ${mobileSearchOpen ? "global-search-mobile-open" : ""}`} role="search" onSubmit={submitSearch}>
                <Icon name="search" size={17} />
                <input
                  ref={searchRef}
                  aria-label="Search all meetings"
                  placeholder="Search anything..."
                  value={search}
                  onFocus={() => setSearchOpen(true)}
                  onChange={(event) => { setSearch(event.target.value); setSearchOpen(true); }}
                />
                <kbd>⌘ K</kbd>
              </form>
              {searchOpen && search.trim().length >= 2 && (
                <div className="search-popover">
                  <div className="popover-label">MEETING RESULTS</div>
                  {matches.length > 0 ? matches.map((meeting) => (
                    <Link key={meeting.id} href={`/meetings/${meeting.id}`} className="quick-result" onClick={() => { setSearchOpen(false); setSearch(""); }}>
                      <span className="quick-result-icon"><Icon name="file" size={16} /></span>
                      <span className="quick-result-copy"><strong>{meeting.title}</strong><small>{meeting.participants.map((person) => person.name.split(" ")[0]).join(", ")}</small></span>
                      <Icon name="chevron" size={14} />
                    </Link>
                  )) : <p className="search-empty">No meetings match “{search.trim()}”.</p>}
                  <button className="search-all-button" onClick={() => { setSearchOpen(false); router.push(`/search?q=${encodeURIComponent(search.trim())}`); }}>Search all conversations <Icon name="arrow" size={14} /></button>
                </div>
              )}
            </div>
            <div className="notification-wrap">
              <button className="icon-button notification-button" aria-label="Notifications" onClick={() => setNoticeOpen((open) => !open)}><Icon name="bell" size={19} /><span /></button>
              {noticeOpen && <div className="notification-popover"><strong>You’re all caught up</strong><p>New meeting notes and follow-ups will show up here.</p><button onClick={() => setNoticeOpen(false)}>Got it</button></div>}
            </div>
            <Link className="button button-primary top-record" href="/record"><Icon name="mic" size={16} /> Record</Link>
          </div>
        </header>
        {storageError && <div className="storage-warning" role="status"><Icon name="info" size={16} /> Demo changes could not be saved in this browser: {storageError}</div>}
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
