# FDE Sidekick PRD (Refined MVP)

- Product: FDE Sidekick
- Version: 0.1.0-mvp
- Date: 2026-02-28
- Status: Ready to Build
- Repo: https://github.com/1stprinciples/fde-sidekick

## 1) Why this version exists
The first open-source release should prove one thing: **a team can type a raw project idea and immediately get useful, structured artifacts without leaving the conversation**.

This version prioritizes speed to value, reliability, and easy setup over feature breadth.

## 2) MVP outcome (single sentence)
In under 2 minutes, a user can start a session, describe an idea, and receive:
1. a live project summary,
2. a Mermaid architecture draft,
3. an actionable next-step checklist.

## 3) Target users for v0.1
1. Solo hackers validating project ideas.
2. Hackathon teams aligning quickly before coding.
3. FDE/DevRel users who need a fast, demo-ready planning flow.

## 4) Core user story
As a hackathon builder, I want to brainstorm in chat and automatically see my idea converted into concrete planning artifacts so I can start implementation faster.

## 5) Scope for v0.1 (must-have)

### A. Chat-first session
1. Single-user chat interface.
2. Text input only.
3. Conversation + artifact generation on each send.

### B. Three artifacts only
1. `summary` (markdown)
- Problem, target user, solution, constraints, open questions.
2. `architecture` (Mermaid)
- High-level components and data flow.
3. `next_steps` (markdown checklist)
- 6-12 concrete tasks to start building.

### C. Reliable structured output contract
1. LLM must return strict JSON.
2. Parse validation with graceful fallback when parsing fails.
3. UI shows partial results if one artifact fails.

### D. Minimal open-source readiness
1. Clear setup with `.env.example`.
2. MIT license.
3. README with:
- quickstart,
- screenshots/GIF,
- architecture overview,
- known limitations,
- contribution guide (small starter).

### E. Basic export
1. "Export session" downloads:
- `summary.md`
- `architecture.mmd`
- `next_steps.md`

## 6) Explicitly out of scope for v0.1
1. Voice input / speech recognition.
2. Huddle mode timer.
3. Dual-panel auto-switch animations.
4. Dynamic artifact registry/plugins.
5. Multi-user collaboration.
6. Persistent cloud storage.
7. Multi-model routing and model picker.
8. Polished design system work beyond clean baseline UX.

## 7) UX requirements (minimal but good)
1. Layout:
- Left: chat.
- Right: artifact tabs (`Summary`, `Architecture`, `Next Steps`).
2. States:
- idle, generating, success, error.
3. Errors:
- Friendly message + retry button.
4. Accessibility:
- keyboard-send, visible focus, readable contrast.

## 8) API contract (v0.1)

### Request
- Input: full conversation history + system prompt.

### Response JSON schema
```json
{
  "assistant_response": "string",
  "summary": "markdown string",
  "architecture": "mermaid graph string",
  "next_steps": ["task 1", "task 2"]
}
```

### Validation rules
1. `assistant_response`, `summary`, `architecture` must be non-empty strings.
2. `next_steps` must be an array with 3-20 items.
3. On schema mismatch: show assistant text fallback and preserve previous artifacts.

## 9) Success metrics for launch (first 30 days)
1. Time-to-first-artifact: under 30 seconds on median network.
2. Local setup success: user can run within 10 minutes via README.
3. Artifact usefulness: at least one exported file reused by user in real project (qualitative feedback/issues).
4. Open-source traction baseline:
- 100+ GitHub stars,
- 10+ issues/discussions from external users,
- 5+ community PRs or documented improvement suggestions.

## 10) Risks and mitigations
1. API key handling confusion.
- Mitigation: strict docs, `.env.example`, warning banner, never commit keys.
2. LLM JSON instability.
- Mitigation: schema validation + fallback parser + retry with repair prompt.
3. Mermaid render failure.
- Mitigation: show raw Mermaid text and keep export working.
4. Scope creep before release.
- Mitigation: freeze v0.1 scope to sections 5 and 7 only.

## 11) Implementation slices (recommended order)
1. Slice 1: app shell + chat + mocked artifact state.
2. Slice 2: LLM integration + JSON validation.
3. Slice 3: artifact renderers (markdown + Mermaid).
4. Slice 4: export session.
5. Slice 5: docs polish + demo recording.

## 12) Release definition of done
1. Fresh clone works with README steps.
2. One prompt produces all 3 artifacts successfully.
3. Export generates all files.
4. Basic error states verified manually.
5. Repo includes MIT license and contribution notes.

## 13) Post-MVP queue (v0.2 candidates)
1. Voice input.
2. Session persistence.
3. Rich artifact set (PRD/prototype/timeline/risks).
4. Better visual system and animation polish.
5. Optional backend proxy for API security.
