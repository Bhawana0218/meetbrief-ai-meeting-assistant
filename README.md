# MeetBrief

MeetBrief is a meeting-intelligence demo for reviewing conversations and following through. Its warm editorial workspace brings searchable transcripts, timestamp navigation, grounded summaries, decisions, action items, saved moments, and simulated clip links into one responsive product.

> **Demo disclosure:** the sample recordings are simulated. The capture screen never joins a meeting, requests microphone access, captures audio/video, or produces speech recognition. Capture records only the meeting title, participant names, and notes you enter. Summary generation uses the local demo summarizer unless you configure an OpenAI-compatible API.

> **Live demo:** [meetbrief-ai-meeting-assistant.vercel.app](https://meetbrief-ai-meeting-assistant.vercel.app/). It runs without an API key in clearly labeled demo-summary mode.

## Run locally

Requirements: Node.js 20.9 or later and npm.

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sample meetings are available immediately; no account or database credentials are required.

Optional environment variables can be copied from `.env.example`:

| Variable | Purpose | Default |
| --- | --- | --- |
| `OPENAI_API_KEY` | Enables live summary generation in the API route. Keep this server-side; never expose it with a `NEXT_PUBLIC_` prefix. | Not set; the source-based demo summarizer is used. |
| `OPENAI_BASE_URL` | OpenAI-compatible API base URL. | `https://api.openai.com/v1` |
| `OPENAI_MODEL` | Model name supported by the configured API. | `gpt-4o-mini` |

Restart the dev server after changing environment variables. Without the API key, the interface labels summaries as **DEMO** and clearly explains that they are generated from the supplied sample notes. If a configured provider is unavailable, the UI shows an error notice and falls back to those source notes. Live model output can still be wrong; review it before relying on it.

## Features

- **Workspace overview:** seeded meeting summaries, participants, duration, weekly overview, action-item follow-up, and customer/internal filters.
- **Eight sample conversations:** customer calls, internal syncs, stand-ups, interviews, and project reviews. The Northstar onboarding sample includes a longer speaker-labeled transcript with useful search and timestamp targets.
- **Meeting workspace:** simulated playback controls and timeline, transcript search and speaker filters, clickable timestamps, summary templates, decisions, follow-up checkboxes, participant list, and saved highlights.
- **Summary formats:** general, stand-up, sales call, interview, and project review. The optional API route requires structured output and instructs the model to omit unsupported facts, owners, and dates.
- **Search:** find meeting titles and summaries, transcript phrases and speakers, participants, or action items across the sample library.
- **Highlights and clips:** save timestamped notes and create a local share page for a selected transcript range. A clip is a simulated transcript preview, not exported audio or video.
- **Capture walkthrough:** run a timer and create a meeting from manually supplied notes. No call is joined and no recording is made.
- **Local persistence:** completed actions, edited summaries, saved highlights, generated clip links, and manually created meetings are stored in browser `localStorage`.
- **Responsive layout:** collapsible navigation and layouts tuned for desktop, tablet, and phone widths.
- **MeetBrief Intelligence design:** midnight-navy navigation, warm ivory workspace surfaces, cobalt interaction accents, and editorial display typography. Dashboard totals are calculated from the sample meetings and locally saved completion state; the weekly chart uses real sample meeting durations rather than fabricated analytics.
- **Meeting library and knowledge pages:** filterable meeting records and quote-led highlights retain speaker, time, and source-meeting context.
- **Thoughtful interaction states:** accessible search scopes, transcript phrase highlighting, responsive navigation, motion that respects reduced-motion preferences, and explicit sample/demo disclosures.

## Architecture

```text
src/
  app/
    api/summaries/route.ts    Optional OpenAI-compatible summary endpoint
    meetings/[id]/page.tsx    Meeting detail route
    search/page.tsx           Global search
    share/[clipId]/page.tsx   Local demo clip page
    record/page.tsx           Manual-note capture simulation
    globals.css               Design tokens, responsive system, and motion
  components/
    app-shell.tsx             Navigation and global search
    dashboard.tsx             Overview, meeting list, and highlights views
    meeting-workspace.tsx     Playback, transcript, insights, and clips
    meetbrief-provider.tsx    Local demo state and persistence
    recording-workspace.tsx   Explicitly simulated capture flow
  lib/
    meetings.ts               Typed sample meeting content
    summary.ts                Template labels and demo summary helpers
    types.ts                  Shared application data types
```

The sample content is defined in `src/lib/meetings.ts`. The summary API validates request and response shapes, keeps the API key on the server, and has a clearly marked no-key demo response. The app does not currently include Supabase, authentication, team sharing across browsers, real video files, or a live meeting bot.

## Checks

```bash
npm run lint
npm run typecheck
npm run build
```

## Deploy to Vercel

1. Import the GitHub repository into Vercel and select the Next.js framework preset.
2. Keep the default build command (`npm run build`) and output settings.
3. Optionally add `OPENAI_API_KEY`, `OPENAI_BASE_URL`, and `OPENAI_MODEL` in the Vercel project’s server-side environment-variable settings. Do not add a `NEXT_PUBLIC_` prefix to the API key.
4. Deploy. The demo works without a key; generated browser data remains in each visitor’s own browser and is not shared with other users.

The current production deployment was published with the Vercel CLI. Automatic GitHub deployments are not connected: Vercel requires a GitHub login connection on the account before it can link the repository. Complete that connection in Vercel’s account settings, then connect the Git repository from the project’s Git settings to deploy automatically on pushes.

## Under-five-minute walkthrough

1. **0:00–0:35 — Overview:** scan the weekly cards and filter recent customer/internal meetings.
2. **0:35–1:45 — Northstar meeting:** play or seek the simulated timeline, search the transcript for “CSV,” and select a speaker. Click a timestamp to jump.
3. **1:45–2:35 — Follow-through:** change the summary format, regenerate its source-based demo summary, review decisions, and complete an action item.
4. **2:35–3:20 — Moments:** save a highlight and revisit it from the Highlights page.
5. **3:20–4:00 — Search and share:** search “pilot” across conversations, create a short clip link, and view its transcript-only demo share page.
6. **4:00–4:45 — Capture:** enter a title and your own notes, start and stop the simulated timer, then open the resulting meeting. Point out that it never joined or recorded a real call.

## Agent capture evidence

The repository hook and original two canary logs are documented in [CAPTURE-TEST.md](./CAPTURE-TEST.md). The `.agent-logs/` directory is intentionally tracked; the stop hook commits and pushes each completed turn’s log.
