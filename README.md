# FDE Sidekick (v0.1)

Voice-first planning copilot for hackathons.  
Speak your idea, then watch artifacts update continuously while recording.

## Features

- Recording-first interface with live transcript panel
- OpenAI Whisper transcription (`whisper-1`) via local backend
- Continuous artifact refresh while speaking (timed cadence)
- Editable artifacts with local auto-save
- Three core outputs:
  - `Summary` (markdown)
  - `Architecture` (Mermaid, with node rename via double-click/double-tap)
  - `Next Steps` (editable checklist lines)
- Export artifacts as:
  - `summary.md`
  - `architecture.mmd`
  - `next_steps.md`
- Optional Notes + Chat side panel

## Tech Stack

- Frontend: React + Vite
- Backend: Express
- AI: OpenAI Chat Completions + Whisper
- Diagram rendering: Mermaid

## Requirements

- Node.js 18+ (Node 20+ recommended)
- npm 9+
- OpenAI API key

## Quickstart

1. Clone and install:

```bash
git clone git@github.com:1stprinciples/fde-sidekick.git
# or: git clone https://github.com/1stprinciples/fde-sidekick.git
cd fde-sidekick
npm install
```

2. Create env file:

```bash
cp .env.example .env
```

3. Set env values in `.env`:

```bash
OPENAI_API_KEY=your_openai_key_here
OPENAI_CHAT_MODEL=gpt-4.1-mini
PORT=8787
```

4. Start both frontend and backend:

```bash
npm run dev
```

5. Open:

- [http://localhost:5173](http://localhost:5173)
- If needed: [http://127.0.0.1:5173](http://127.0.0.1:5173)

## Usage

1. Click `Start Recording`.
2. Speak your project idea naturally.
3. Watch transcript + artifacts update continuously.
4. Stop recording when done.
5. Edit artifacts manually as needed.
6. Export files with `Export Files`.

Optional:

- Open `Notes + Chat` for manual prompting or edits.

## Commands

- `npm run dev` - run web + API together
- `npm run build` - production build
- `npm run preview` - preview production build
- `npm run doctor` - local diagnostics

## Diagnostics / Troubleshooting

Run:

```bash
npm run doctor
```

It checks:

- Node/npm availability
- `.env` and `OPENAI_API_KEY`
- Open ports (`5173`, `8787`)
- Frontend/backend reachability

Common fixes:

- Microphone blocked: click the lock icon in Chrome and allow mic for `localhost`.
- API auth errors (`401`): verify `OPENAI_API_KEY`, then restart `npm run dev`.
- Backend unreachable: ensure port `8787` is free.
- Frontend unreachable: ensure port `5173` is free.

## API Endpoints

- `GET /api/health`
- `POST /api/transcribe` (`multipart/form-data`, field: `audio`)
- `POST /api/sidekick`

`/api/sidekick` response shape:

```json
{
  "assistant_response": "string",
  "summary": "markdown string",
  "architecture": "mermaid string",
  "next_steps": ["task 1", "task 2", "task 3"]
}
```

## Open Source Notes

- License: MIT ([LICENSE](LICENSE))
- Never commit `.env` or API keys
- PRD/MVP reference: [docs/PRD-MVP-v0.1.md](docs/PRD-MVP-v0.1.md)

## Contributing

1. Fork the repo.
2. Create a feature branch.
3. Run `npm run build` and `npm run doctor`.
4. Open a PR with a short summary and screenshots/GIF if UI changed.
