# FDE Sidekick Debug Plan

- [x] Verify project starts locally (`npm run dev`) and record current behavior.
- [x] Verify frontend/backend endpoints from terminal (`:5173`, `:8787/api/health`).
- [x] Reproduce browser-side issue with DevTools MCP or fallback checks.
- [x] Identify root cause for user's localhost failure.
- [x] Apply fix(es) in code/config/docs.
- [x] Re-test full flow and provide exact run instructions.

## Round 2 (Localhost still failing on user side)

- [x] Re-run dev server and capture exact bound host/port output.
- [x] Validate access via `localhost` and `127.0.0.1` for both web and API.
- [x] Force stable host binding and single URL instructions in scripts/config.
- [x] Re-test and provide one copy-paste startup command.

## Round 3 (Chrome says not working)

- [x] Inspect active Chrome tab with DevTools MCP (snapshot, console, network).
- [x] Confirm whether app load and API requests are succeeding.
- [x] Patch UX for microphone-permission pending state.
- [x] Re-build and keep server running for user retest.

## Round 4 (Recording transcribes first words then fails)

- [x] Confirm likely chunk-transcription failure mode.
- [x] Switch live transcription to cumulative recording buffer.
- [x] Add final transcription pass on stop.
- [x] Rebuild and prepare for user retest.

## Round 5 (Header and onboarding copy polish)

- [x] Remove top `Idle` status indicator from the header.
- [x] Update title/branding to `FDE Copilot`.
- [x] Add short explainer lines at the top describing what the site does.
- [x] Verify updated header in Chrome DevTools MCP snapshot.

## Round 6 (Editable artifacts + autosave)

- [x] Simplify title to bold `FDE Copilot`.
- [x] Make summary artifact editable.
- [x] Make architecture artifact editable (Mermaid source) with live preview.
- [x] Make next-steps artifact editable by line.
- [x] Persist artifacts locally with auto-save and verify after refresh.

## Round 7 (Architecture direct editing UX)

- [x] Remove Mermaid source textarea from architecture tab.
- [x] Add double-click rename on diagram nodes.
- [x] Add double-tap rename support on touch.
- [x] Keep architecture autosave by updating Mermaid source behind the scenes.
- [x] Validate interaction in Chrome DevTools MCP.

## Round 8 (Recording-first UX + continuous refresh)

- [x] Shift main layout from chat-first to recording-first.
- [x] Add large primary recording control in the main view.
- [x] Keep artifacts visible and editable while recording is active.
- [x] Add continuous timed artifact refresh while recording (12s cadence).
- [x] Move chat into optional minimal Copilot drawer.
- [x] Validate new layout and drawer behavior in Chrome DevTools MCP.

## Round 9 (Copilot drawer clarity + close controls)

- [x] Add explicit close button inside the Notes + Chat drawer.
- [x] Remove ambiguous top header Copilot toggle.
- [x] Add contextual Notes + Chat entry point in recording hub with clearer label.
- [x] Validate open/close interaction and wording via Chrome DevTools MCP.
