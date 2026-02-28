import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import multer from "multer";
import OpenAI from "openai";
import { toFile } from "openai/uploads";
import { z } from "zod";

dotenv.config({ override: true });

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

app.use(cors());
app.use(express.json({ limit: "2mb" }));

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  // Keep server bootable so the UI can render setup instructions.
  console.warn("[fde-sidekick] OPENAI_API_KEY is missing. API routes will return setup errors.");
}
const openai = new OpenAI({ apiKey });

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(12000),
});

const SidekickRequestSchema = z.object({
  messages: z.array(MessageSchema).default([]),
  liveTranscript: z.string().max(12000).optional().default(""),
});

const SidekickResponseSchema = z.object({
  assistant_response: z.string().min(1),
  summary: z.string().min(1),
  architecture: z.string().min(1),
  next_steps: z.array(z.string().min(1)).min(3).max(20),
});

const SYSTEM_PROMPT = [
  "You are FDE Sidekick, a hackathon planning copilot.",
  "Return ONLY valid JSON with keys: assistant_response, summary, architecture, next_steps.",
  "summary: markdown with sections: Problem, Users, Solution, Constraints, Open Questions.",
  "architecture: valid Mermaid flowchart in flowchart TD format.",
  "next_steps: array of concise actionable tasks (3 to 20 items).",
  "assistant_response: short coaching response in <= 80 words.",
  "Never include markdown code fences.",
].join(" ");

function stripCodeFence(rawText) {
  const text = String(rawText || "").trim();
  if (!text.startsWith("```")) {
    return text;
  }

  return text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function normalizeNextSteps(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/\r?\n/)
      .map((line) => line.replace(/^[-*\d.\s]+/, "").trim())
      .filter(Boolean);
  }

  return [];
}

function parseSidekickPayload(rawText) {
  const cleaned = stripCodeFence(rawText);
  let parsed;

  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      throw new Error("Model response was not valid JSON.");
    }
    parsed = JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
  }

  const normalized = {
    assistant_response: String(parsed.assistant_response ?? "").trim(),
    summary: String(parsed.summary ?? "").trim(),
    architecture: String(parsed.architecture ?? "").trim(),
    next_steps: normalizeNextSteps(parsed.next_steps),
  };

  return SidekickResponseSchema.parse(normalized);
}

function ensureApiKey(res) {
  if (apiKey) {
    return true;
  }

  res.status(500).json({
    error: "OPENAI_API_KEY is not set. Copy .env.example to .env and add your key.",
  });
  return false;
}

function getSafeApiError(error, fallbackMessage) {
  const status = typeof error?.status === "number" ? error.status : null;
  if (status === 401) {
    return {
      error: "OpenAI authentication failed.",
      details: "Check OPENAI_API_KEY in .env and restart the server.",
      status: 401,
    };
  }

  if (status === 429) {
    return {
      error: "OpenAI rate limit reached.",
      details: "Wait a moment and retry.",
      status: 429,
    };
  }

  const message = error instanceof Error ? error.message : fallbackMessage;
  return {
    error: fallbackMessage,
    details: message,
    status: 500,
  };
}

app.get("/api/health", (_req, res) => {
  const hasDist = fs.existsSync(path.resolve(process.cwd(), "dist"));
  res.json({
    ok: true,
    timestamp: new Date().toISOString(),
    hasApiKey: Boolean(apiKey),
    hasDist,
    webUrl: "http://localhost:5173",
    apiUrl: `http://localhost:${process.env.PORT || 8787}`,
  });
});

app.post("/api/transcribe", upload.single("audio"), async (req, res) => {
  if (!ensureApiKey(res)) {
    return;
  }

  if (!req.file) {
    res.status(400).json({ error: "Missing audio file." });
    return;
  }

  try {
    const audioFile = await toFile(req.file.buffer, req.file.originalname || "recording.webm", {
      type: req.file.mimetype || "audio/webm",
    });

    const transcript = await openai.audio.transcriptions.create({
      model: "whisper-1",
      file: audioFile,
    });

    const text = typeof transcript === "string" ? transcript : transcript.text || "";
    res.json({ text: text.trim() });
  } catch (error) {
    console.error("[transcribe]", error);
    const safe = getSafeApiError(error, "Transcription failed.");
    res.status(safe.status).json({ error: safe.error, details: safe.details });
  }
});

app.post("/api/sidekick", async (req, res) => {
  if (!ensureApiKey(res)) {
    return;
  }

  let payload;
  try {
    payload = SidekickRequestSchema.parse(req.body);
  } catch (error) {
    res.status(400).json({
      error: "Invalid request payload.",
      details: error instanceof Error ? error.message : "Unknown validation error",
    });
    return;
  }

  const model = process.env.OPENAI_CHAT_MODEL || "gpt-4.1-mini";
  const liveTranscript = payload.liveTranscript.trim();

  try {
    const completion = await openai.chat.completions.create({
      model,
      temperature: 0.35,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...payload.messages,
        ...(liveTranscript
          ? [
              {
                role: "user",
                content:
                  "Live voice transcript (in-progress, not final): " +
                  liveTranscript +
                  "\nUse it to refresh artifacts now.",
              },
            ]
          : []),
      ],
    });

    const raw = completion.choices?.[0]?.message?.content ?? "{}";
    const sidekickPayload = parseSidekickPayload(raw);
    res.json(sidekickPayload);
  } catch (error) {
    console.error("[sidekick]", error);

    if (error instanceof z.ZodError) {
      res.status(422).json({
        error: "Model output did not match schema.",
        details: error.issues,
      });
      return;
    }

    const safe = getSafeApiError(error, "Artifact generation failed.");
    res.status(safe.status).json({ error: safe.error, details: safe.details });
  }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, "../dist");

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) {
      next();
      return;
    }
    res.sendFile(path.join(distPath, "index.html"));
  });
}

const port = Number(process.env.PORT || 8787);
app.listen(port, () => {
  console.log(`[fde-sidekick] server running on http://localhost:${port}`);
});
