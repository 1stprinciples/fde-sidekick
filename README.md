# FDE Copilot

**Turn messy brainstorms into structured plans while you speak.**

FDE Copilot is a voice-first planning tool built for forward deployed engineers, hackathon teams, and anyone who thinks better out loud than in a text box. Press record, talk through your idea, and watch as three artifacts — a project summary, an architecture diagram, and a prioritized task list — assemble themselves in real time.

<video src="assets/demo.mp4" width="100%" autoplay loop muted></video>

## Why this exists

Forward deployed engineers live in the gap between a customer's problem and a working solution. The typical workflow after a discovery call or brainstorm looks like this:

1. Scribble notes during the conversation
2. Spend 30-60 minutes afterward turning those notes into a structured summary
3. Sketch an architecture diagram in a separate tool
4. Write up next steps in yet another doc

That post-conversation writeup is where momentum dies. By the time you've organized everything, the energy from the brainstorm is gone and half the context is fuzzy.

FDE Copilot collapses steps 1 through 4 into a single live session. You talk, it structures. When you stop recording, the artifacts are already there — editable, exportable, and ready to share with your team or drop into a project repo.

This matters because **the bottleneck in rapid prototyping isn't code — it's the planning lag between "we should build this" and "here's what we're actually building."** FDE Copilot kills that lag.

## How it works

```
You speak into your mic
        ↓
Audio chunks stream to OpenAI Whisper (every ~2s)
        ↓
Live transcript updates in the browser
        ↓
Every 12 seconds, the full transcript is sent to a chat model
        ↓
Three artifacts refresh in place:
  • Summary    — problem, users, solution, constraints, open questions
  • Architecture — Mermaid system diagram (double-click nodes to rename)
  • Next Steps   — actionable checklist you can edit line by line
```

Everything auto-saves to your browser's local storage. When you're done, hit **Export Files** and get `summary.md`, `architecture.mmd`, and `next_steps.md`.

You can also open the **Notes + Chat** panel to steer the AI manually — ask it to zoom in on a subsystem, rewrite the summary for a different audience, or add constraints you forgot to mention.

## Quickstart

You need **Node.js 18+** and an **OpenAI API key**.

```bash
git clone https://github.com/1stprinciples/fde-sidekick.git
cd fde-sidekick
npm install
cp .env.example .env
```

Open `.env` and paste your API key:

```
OPENAI_API_KEY=sk-...
OPENAI_CHAT_MODEL=gpt-4.1-mini
PORT=8787
```

Start both the frontend and backend:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in Chrome. Click **Start Recording** and talk.

> **Mic not working?** Click the lock icon in Chrome's address bar and allow microphone access for localhost.

## Tech stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, Vite 5 |
| Backend | Express 4, Node.js |
| AI | OpenAI Chat Completions + Whisper |
| Diagrams | Mermaid |
| Validation | Zod |

The frontend dev server (port 5173) proxies API calls to the Express backend (port 8787). In production, the backend serves the built frontend from `dist/`.

## Commands

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start frontend + backend together |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve production build locally |
| `npm run doctor` | Run diagnostics (checks ports, env, connectivity) |

## API

Three endpoints:

- `GET /api/health` — status check (API key present, dist built, URLs)
- `POST /api/transcribe` — accepts `multipart/form-data` with an `audio` field, returns transcribed text via Whisper
- `POST /api/sidekick` — accepts `{ messages, liveTranscript }`, returns structured JSON:

```json
{
  "assistant_response": "string",
  "summary": "markdown string",
  "architecture": "mermaid graph string",
  "next_steps": ["task 1", "task 2", "..."]
}
```

## Troubleshooting

Run `npm run doctor` first — it checks Node/npm versions, `.env` config, port availability, and endpoint reachability.

| Problem | Fix |
|---------|-----|
| Mic blocked | Click lock icon in Chrome → allow microphone for localhost |
| 401 from API | Check `OPENAI_API_KEY` in `.env`, restart `npm run dev` |
| Port in use | Kill existing processes on 5173 / 8787, or change `PORT` in `.env` |
| Blank page | Make sure both servers are running — `npm run dev` starts both |

## Contributing

1. Fork the repo
2. Create a feature branch
3. Run `npm run build` and `npm run doctor` before opening a PR
4. Include screenshots or a GIF if you changed the UI

See the [PRD](docs/PRD-MVP-v0.1.md) for context on design decisions and the post-MVP roadmap.

## License

MIT — see [LICENSE](LICENSE).
