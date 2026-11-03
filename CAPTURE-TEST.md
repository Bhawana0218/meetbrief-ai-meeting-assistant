# Capture Test

## Setup

- **Tool:** AI assistant using Copilot SDK in VS Code (VS Code Copilot Chat, Copilot session target).
- **Model:** not exposed by harness. The current session metadata and hook payload do not expose an exact model or a separate planning/execution model, so none is guessed.
- **Mechanism:** VS Code Copilot preview hooks, using the `UserPromptSubmit` and `Stop` lifecycle events.
- **Configuration:** [.github/hooks/agent-capture.json](./.github/hooks/agent-capture.json) invokes [.github/hooks/capture-agent-turn.ps1](./.github/hooks/capture-agent-turn.ps1). The prompt event stores the verbatim prompt temporarily; the stop event reads the transcript path and records only the final user-facing assistant response.
- **Canary log files:** [.agent-logs/2026-11-03_10-45-59_e2f177ab-3d71-49ab-8e76-9bc9f10e3da5.md](./.agent-logs/2026-11-03_10-45-59_e2f177ab-3d71-49ab-8e76-9bc9f10e3da5.md) and [.agent-logs/2026-11-03_10-47-25_a96f3157-236a-4574-b325-4a07675cbde7.md](./.agent-logs/2026-11-03_10-47-25_a96f3157-236a-4574-b325-4a07675cbde7.md). The canaries ran in distinct chat sessions with distinct session IDs.

## Canary entries

### Canary 1

```text
[LOG_ENTRY type=PROMPT num=1 session=e2f177ab-3d71-49ab-8e76-9bc9f10e3da5]
timestamp: 2026-11-03T10:45:59.199Z
model: not exposed by harness.

CAPTURE TEST — 8x assignment, Copilot. This is a capture check; respond exactly `Canary received.` and do not ask a question.

[LOG_ENTRY type=RESPONSE num=1 session=e2f177ab-3d71-49ab-8e76-9bc9f10e3da5]
timestamp: 2026-11-03T10:46:09.356Z
model: not exposed by harness.

Canary received.
```

### Canary 2

```text
[LOG_ENTRY type=PROMPT num=1 session=a96f3157-236a-4574-b325-4a07675cbde7]
timestamp: 2026-11-03T10:47:25.831Z
model: not exposed by harness.

CAPTURE TEST — 8x assignment, Copilot. This is the second capture check; respond exactly `Second canary received.` and do not ask a question.

[LOG_ENTRY type=RESPONSE num=1 session=a96f3157-236a-4574-b325-4a07675cbde7]
timestamp: 2026-11-03T10:47:42.667Z
model: not exposed by harness.

Second canary received.
```

## First attempt

The initial bare canary prompt caused the agent to ask for clarification instead of producing a final response, so it did not create a completed log entry and was not counted as a passing canary. I then added an explicit response instruction. That first probe also exposed a Windows stdin encoding issue that mangled the em dash in temporary pending state; the hook now reads stdin as UTF-8. Both successful logs preserve the em dash correctly.

The original setup conversation began before the hook was installed and therefore was not captured automatically. No transcript was backfilled or manually added. Capture verification passed before MeetBrief application development began.

Completed application-turn logs are committed individually by the stop hook after each response and pushed to the configured upstream. A commit or push failure is reported by the hook rather than silently dropping the capture.
