import React, { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

const ARTIFACT_STORAGE_KEY = "fde-sidekick.artifacts.v1";
const LIVE_REFRESH_INTERVAL_MS = 12000;

const INITIAL_ARTIFACTS = {
  assistant_response: "",
  summary:
    "## Waiting for input\n\nDescribe your project idea by typing or recording voice to generate live artifacts.",
  architecture: "flowchart TD\n  A[Idea] --> B[Architecture]\n  B --> C[Build Plan]",
  next_steps: [
    "Describe the problem and who it serves.",
    "List key constraints (time, team size, APIs).",
    "Define first deliverable for the next hour.",
  ],
};

function normalizeNextSteps(nextSteps) {
  if (Array.isArray(nextSteps)) {
    return nextSteps
      .map((step) => String(step || "").trim())
      .filter(Boolean);
  }

  if (typeof nextSteps === "string") {
    return nextSteps
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  return [...INITIAL_ARTIFACTS.next_steps];
}

function normalizeArtifacts(rawArtifacts) {
  const safe = rawArtifacts && typeof rawArtifacts === "object" ? rawArtifacts : {};

  return {
    assistant_response:
      typeof safe.assistant_response === "string"
        ? safe.assistant_response
        : INITIAL_ARTIFACTS.assistant_response,
    summary: typeof safe.summary === "string" ? safe.summary : INITIAL_ARTIFACTS.summary,
    architecture:
      typeof safe.architecture === "string"
        ? safe.architecture
        : INITIAL_ARTIFACTS.architecture,
    next_steps: normalizeNextSteps(safe.next_steps),
  };
}

function loadSavedArtifacts() {
  try {
    const raw = window.localStorage.getItem(ARTIFACT_STORAGE_KEY);
    if (!raw) {
      return INITIAL_ARTIFACTS;
    }
    return normalizeArtifacts(JSON.parse(raw));
  } catch {
    return INITIAL_ARTIFACTS;
  }
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceFirstArchitectureLabel(source, oldLabel, newLabel) {
  const current = String(oldLabel || "").trim();
  const replacement = String(newLabel || "").trim();
  if (!current || !replacement || current === replacement) {
    return source;
  }

  const escaped = escapeRegExp(current);
  const patterns = [
    { regex: new RegExp(`\\[\\s*${escaped}\\s*\\]`), wrap: (text) => `[${text}]` },
    { regex: new RegExp(`\\(\\(\\s*${escaped}\\s*\\)\\)`), wrap: (text) => `((${text}))` },
    { regex: new RegExp(`\\[\\[\\s*${escaped}\\s*\\]\\]`), wrap: (text) => `[[${text}]]` },
    { regex: new RegExp(`\\(\\s*${escaped}\\s*\\)`), wrap: (text) => `(${text})` },
    { regex: new RegExp(`\\{\\s*${escaped}\\s*\\}`), wrap: (text) => `{${text}}` },
    { regex: new RegExp(`\"\\s*${escaped}\\s*\"`), wrap: (text) => `"${text}"` },
  ];

  for (const pattern of patterns) {
    if (pattern.regex.test(source)) {
      return source.replace(pattern.regex, () => pattern.wrap(replacement));
    }
  }

  const plainIndex = source.indexOf(current);
  if (plainIndex >= 0) {
    return `${source.slice(0, plainIndex)}${replacement}${source.slice(plainIndex + current.length)}`;
  }

  return source;
}

function pickMimeType() {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  for (const type of candidates) {
    if (window.MediaRecorder && window.MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return "";
}

function buildDownload(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function ArchitecturePanel({ code, onRenameNodeLabel }) {
  const [svg, setSvg] = useState("");
  const [renderError, setRenderError] = useState("");
  const lastTouchRef = useRef({ label: "", at: 0 });

  useEffect(() => {
    let active = true;

    async function renderDiagram() {
      try {
        const id = `mermaid-${Math.random().toString(36).slice(2)}`;
        const { svg: renderedSvg } = await mermaid.render(id, code);
        if (active) {
          setRenderError("");
          setSvg(renderedSvg);
        }
      } catch (error) {
        if (active) {
          setRenderError(error instanceof Error ? error.message : "Mermaid render failed");
          setSvg("");
        }
      }
    }

    void renderDiagram();

    return () => {
      active = false;
    };
  }, [code]);

  function readLabelFromEventTarget(target) {
    const elementTarget =
      target instanceof Element ? target : target instanceof Node ? target.parentElement : null;
    if (!elementTarget) {
      return "";
    }

    const labelHost = elementTarget.closest("g.node, g.cluster, g.edgeLabel, text, tspan, span, p");
    if (!labelHost) {
      return "";
    }

    return String(labelHost.textContent || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function handleRenameRequest(rawLabel) {
    const label = String(rawLabel || "").trim();
    if (!label || !onRenameNodeLabel) {
      return;
    }
    onRenameNodeLabel(label);
  }

  function handleDoubleClick(event) {
    handleRenameRequest(readLabelFromEventTarget(event.target));
  }

  function handlePointerUp(event) {
    if (event.pointerType !== "touch") {
      return;
    }

    const label = readLabelFromEventTarget(event.target);
    if (!label) {
      return;
    }

    const now = Date.now();
    const previous = lastTouchRef.current;
    if (previous.label === label && now - previous.at < 360) {
      handleRenameRequest(label);
      lastTouchRef.current = { label: "", at: 0 };
      return;
    }
    lastTouchRef.current = { label, at: now };
  }

  if (renderError) {
    return (
      <div className="artifactPreview artifactErrorBlock">
        <p>Diagram preview failed. Showing Mermaid source instead.</p>
        <pre>{code}</pre>
      </div>
    );
  }

  return (
    <div
      className="artifactPreview mermaidCanvas"
      onDoubleClick={handleDoubleClick}
      onPointerUp={handlePointerUp}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export default function App() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Describe your project and I will build a live summary, architecture sketch, and next-step plan.",
    },
  ]);
  const [input, setInput] = useState("");
  const [artifacts, setArtifacts] = useState(() => loadSavedArtifacts());
  const [activeTab, setActiveTab] = useState("summary");
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLiveUpdating, setIsLiveUpdating] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isRequestingMic, setIsRequestingMic] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recorderSupported, setRecorderSupported] = useState(false);
  const [micError, setMicError] = useState("");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [liveAssistantPreview, setLiveAssistantPreview] = useState("");
  const [health, setHealth] = useState(null);
  const [healthError, setHealthError] = useState("");
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);

  const messagesRef = useRef(messages);
  const liveTranscriptRef = useRef(liveTranscript);
  const liveAssistantPreviewRef = useRef(liveAssistantPreview);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const transcribeQueueRef = useRef(Promise.resolve());
  const audioChunksRef = useRef([]);
  const recordingMimeTypeRef = useRef("audio/webm");
  const pendingLiveRef = useRef("");
  const generatingRef = useRef(false);
  const liveInFlightRef = useRef(false);
  const lastLiveRefreshRef = useRef("");

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    liveTranscriptRef.current = liveTranscript;
  }, [liveTranscript]);

  useEffect(() => {
    liveAssistantPreviewRef.current = liveAssistantPreview;
  }, [liveAssistantPreview]);

  useEffect(() => {
    try {
      window.localStorage.setItem(ARTIFACT_STORAGE_KEY, JSON.stringify(artifacts));
    } catch {
      // Ignore storage errors (private browsing/storage disabled).
    }
  }, [artifacts]);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "loose",
      theme: "dark",
      themeVariables: {
        primaryColor: "#0f0f0f",
        primaryTextColor: "#cfd4cf",
        primaryBorderColor: "#3f8f5a",
        lineColor: "#44de77",
        background: "#0a0a0a",
      },
      flowchart: {
        useMaxWidth: true,
      },
    });
  }, []);

  useEffect(() => {
    const supported = Boolean(navigator.mediaDevices && window.MediaRecorder);
    setRecorderSupported(supported);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadHealth() {
      try {
        const response = await fetch("/api/health");
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.error || "Health check failed");
        }
        if (active) {
          setHealth(payload);
          setHealthError("");
        }
      } catch (requestError) {
        if (active) {
          setHealthError(
            requestError instanceof Error
              ? requestError.message
              : "Cannot connect to backend health endpoint"
          );
        }
      }
    }

    void loadHealth();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (!isRecording) {
      return;
    }

    const intervalId = window.setInterval(() => {
      pendingLiveRef.current = liveTranscriptRef.current.trim();
      void flushLiveUpdates();
    }, LIVE_REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isRecording]);

  async function requestSidekick(messagesPayload, liveTranscriptPayload = "") {
    const response = await fetch("/api/sidekick", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: messagesPayload,
        liveTranscript: liveTranscriptPayload,
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      const detail = payload?.details
        ? typeof payload.details === "string"
          ? payload.details
          : JSON.stringify(payload.details)
        : "Request failed";
      throw new Error(payload?.error ? `${payload.error}: ${detail}` : detail);
    }

    return payload;
  }

  async function runTurn(nextMessages) {
    setError("");
    setIsGenerating(true);
    generatingRef.current = true;

    try {
      const payload = await requestSidekick(nextMessages);
      setArtifacts(normalizeArtifacts(payload));

      if (payload.assistant_response) {
        const withAssistant = [
          ...nextMessages,
          { role: "assistant", content: payload.assistant_response },
        ];
        setMessages(withAssistant);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Generation failed");
    } finally {
      generatingRef.current = false;
      setIsGenerating(false);
      if (pendingLiveRef.current) {
        void flushLiveUpdates();
      }
    }
  }

  async function flushLiveUpdates(force = false) {
    if (liveInFlightRef.current || generatingRef.current) {
      return;
    }

    const transcript = (pendingLiveRef.current || liveTranscriptRef.current).trim();
    pendingLiveRef.current = "";

    if (transcript.length < 12) {
      return;
    }

    if (!force && transcript === lastLiveRefreshRef.current) {
      return;
    }

    liveInFlightRef.current = true;
    setIsLiveUpdating(true);

    try {
      const payload = await requestSidekick(messagesRef.current, transcript);
      setArtifacts(normalizeArtifacts(payload));
      setLiveAssistantPreview(payload.assistant_response || "");
      lastLiveRefreshRef.current = transcript;
      return payload;
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Live update failed");
    } finally {
      liveInFlightRef.current = false;
      setIsLiveUpdating(false);
    }
  }

  async function transcribeChunk() {
    const combinedBlob = new Blob(audioChunksRef.current, {
      type: recordingMimeTypeRef.current || "audio/webm",
    });
    if (combinedBlob.size === 0) {
      return;
    }

    setIsTranscribing(true);

    try {
      const extension = combinedBlob.type.includes("mp4") ? "m4a" : "webm";
      const formData = new FormData();
      formData.append("audio", combinedBlob, `recording-progress-${Date.now()}.${extension}`);

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.details || payload?.error || "Transcription failed");
      }

      const text = String(payload?.text || "").trim();
      if (!text) {
        return;
      }

      const previousTranscript = liveTranscriptRef.current.trim();
      if (text === previousTranscript) {
        return;
      }

      setMicError("");
      setLiveTranscript(text);
      pendingLiveRef.current = text;
    } catch (transcribeError) {
      setMicError(
        transcribeError instanceof Error
          ? `Transcription failed: ${transcribeError.message}`
          : "Failed to transcribe audio"
      );
    } finally {
      setIsTranscribing(false);
    }
  }

  async function startRecording() {
    if (!recorderSupported || isRecording || isGenerating || isRequestingMic) {
      return;
    }

    setMicError("");
    setError("");
    setLiveAssistantPreview("");
    setLiveTranscript("");
    audioChunksRef.current = [];
    transcribeQueueRef.current = Promise.resolve();
    pendingLiveRef.current = "";
    lastLiveRefreshRef.current = "";

    try {
      setIsRequestingMic(true);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = pickMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recordingMimeTypeRef.current = mimeType || recorder.mimeType || "audio/webm";

      recorder.ondataavailable = (event) => {
        if (!event.data || event.data.size === 0) {
          return;
        }

        audioChunksRef.current.push(event.data);
        transcribeQueueRef.current = transcribeQueueRef.current
          .then(() => transcribeChunk())
          .catch(() => {});
      };

      recorder.onstop = () => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      };

      recorder.start(2200);
      setIsRecording(true);
    } catch (startError) {
      if (startError instanceof Error && startError.name === "NotAllowedError") {
        setMicError("Microphone permission denied. Allow mic access for localhost in Chrome.");
      } else if (startError instanceof Error && startError.name === "NotFoundError") {
        setMicError("No microphone device found.");
      } else {
        setMicError(startError instanceof Error ? startError.message : "Cannot access microphone");
      }
    } finally {
      setIsRequestingMic(false);
    }
  }

  async function stopRecording() {
    if (!isRecording) {
      return;
    }

    setIsRecording(false);

    const recorder = mediaRecorderRef.current;
    mediaRecorderRef.current = null;
    let stopPromise = Promise.resolve();
    if (recorder && recorder.state !== "inactive") {
      stopPromise = new Promise((resolve) => {
        recorder.addEventListener("stop", () => resolve(), { once: true });
      });
      recorder.stop();
    }

    await stopPromise;
    await transcribeQueueRef.current;
    await transcribeChunk();

    const finalTranscript = liveTranscriptRef.current.trim();
    pendingLiveRef.current = finalTranscript;

    if (!finalTranscript) {
      return;
    }

    const finalPayload = await flushLiveUpdates(true);

    const nextMessages = [...messagesRef.current, { role: "user", content: finalTranscript }];
    const preview = String(finalPayload?.assistant_response || liveAssistantPreviewRef.current).trim();
    if (preview) {
      nextMessages.push({ role: "assistant", content: preview });
    }
    setMessages(nextMessages);
  }

  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || isGenerating || isRecording) {
      return;
    }

    const nextMessages = [...messagesRef.current, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    void runTurn(nextMessages);
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }

  function exportArtifacts() {
    buildDownload("summary.md", artifacts.summary || "", "text/markdown;charset=utf-8");
    buildDownload("architecture.mmd", artifacts.architecture || "", "text/plain;charset=utf-8");
    buildDownload(
      "next_steps.md",
      (artifacts.next_steps || []).map((step) => `- [ ] ${step}`).join("\n"),
      "text/markdown;charset=utf-8"
    );
  }

  function updateArtifactField(field, value) {
    setArtifacts((current) => normalizeArtifacts({ ...current, [field]: value }));
  }

  function updateNextStepsFromText(text) {
    const parsed = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .map((line) => line.replace(/^([-*]\s+|\d+[.)]\s+|\[\s?\]\s*)/, "").trim())
      .filter(Boolean);

    setArtifacts((current) =>
      normalizeArtifacts({
        ...current,
        next_steps: parsed,
      })
    );
  }

  function handleArchitectureNodeRename(currentLabel) {
    const label = String(currentLabel || "").trim();
    if (!label) {
      return;
    }

    const nextLabel = window.prompt("Rename node label", label);
    if (nextLabel === null) {
      return;
    }

    const cleaned = nextLabel.trim();
    if (!cleaned || cleaned === label) {
      return;
    }

    setArtifacts((current) => {
      const updatedArchitecture = replaceFirstArchitectureLabel(
        current.architecture,
        label,
        cleaned
      );
      if (updatedArchitecture === current.architecture) {
        return current;
      }
      return normalizeArtifacts({
        ...current,
        architecture: updatedArchitecture,
      });
    });
  }

  return (
    <div className="appShell">
      <header className="topBar">
        <div className="heroCopy">
          <h1 className="heroTitle">
            <strong>FDE Copilot</strong>
          </h1>
          <p className="heroLine">
            Turn messy brainstorms into structured output while you speak.
          </p>
          <p className="heroLine heroLineMuted">
            Live summary, architecture map, and next steps update in one workspace.
          </p>
        </div>
        <div className="topActions">
          <button type="button" className="secondaryButton" onClick={exportArtifacts}>
            Export Files
          </button>
        </div>
      </header>

      {!health?.hasApiKey ? (
        <section className="setupBanner">
          <p>
            Setup required: missing <code>OPENAI_API_KEY</code>. Create <code>.env</code> from{" "}
            <code>.env.example</code> and restart <code>npm run dev</code>.
          </p>
        </section>
      ) : null}
      {healthError ? (
        <section className="setupBanner setupBannerError">
          <p>
            Backend not reachable ({healthError}). Run <code>npm run dev</code> and then{" "}
            <code>npm run doctor</code>.
          </p>
        </section>
      ) : null}

      <main className="recordingLayout">
        <section className="recordingHub">
          <button
            type="button"
            className={`recordHeroButton ${isRecording ? "recording" : ""}`}
            onClick={isRecording ? stopRecording : startRecording}
            disabled={!recorderSupported || isGenerating || isRequestingMic}
          >
            <span className="recordHeroDot" aria-hidden>
              ●
            </span>
            <span className="recordHeroLabel">
              {isRequestingMic ? "Allowing Mic..." : isRecording ? "Stop Recording" : "Start Recording"}
            </span>
          </button>

          <p className="recordingMeta">
            Artifacts refresh continuously while recording (every {Math.round(LIVE_REFRESH_INTERVAL_MS / 1000)}s).
          </p>
          {isTranscribing ? <p className="recordingMeta recordingMetaActive">Transcribing audio...</p> : null}
          {isLiveUpdating ? (
            <p className="recordingMeta recordingMetaActive">Refreshing artifacts from latest transcript...</p>
          ) : null}

          {error ? <p className="errorText inlineError">{error}</p> : null}
          {micError ? <p className="errorText inlineError">Mic: {micError}</p> : null}

          <section className="liveStrip transcriptPanel">
            <h3>Live Transcript</h3>
            <p>
              {liveTranscript ||
                (isRecording
                  ? "Listening..."
                  : "Press Record and start speaking. Artifacts will keep updating while you talk.")}
            </p>
            {liveAssistantPreview ? (
              <p className="liveAssist">Copilot pulse: {liveAssistantPreview}</p>
            ) : null}
          </section>

          <div className="copilotEntry">
            <p className="recordingMeta">Need manual edits or prompts?</p>
            <button
              type="button"
              className="secondaryButton"
              onClick={() => setIsCopilotOpen(true)}
              disabled={isCopilotOpen}
            >
              {isCopilotOpen ? "Notes + Chat Open" : "Open Notes + Chat"}
            </button>
          </div>

          {!recorderSupported ? (
            <p className="hintText">This browser does not support MediaRecorder microphone capture.</p>
          ) : (
            <p className="hintText">
              If recording does not start, click the lock icon in Chrome and allow microphone for
              localhost.
            </p>
          )}
        </section>

        <section className="artifactPanel artifactWorkspace">
          <div className="panelHeader">
            <h2>Artifacts</h2>
            <div className="tabList" role="tablist" aria-label="Artifacts">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "summary"}
                className={activeTab === "summary" ? "activeTab" : ""}
                onClick={() => setActiveTab("summary")}
              >
                Summary
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "architecture"}
                className={activeTab === "architecture" ? "activeTab" : ""}
                onClick={() => setActiveTab("architecture")}
              >
                Architecture
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "next_steps"}
                className={activeTab === "next_steps" ? "activeTab" : ""}
                onClick={() => setActiveTab("next_steps")}
              >
                Next Steps
              </button>
            </div>
          </div>

          {activeTab === "summary" ? (
            <div className="artifactBody">
              <label className="editorLabel" htmlFor="summary-editor">
                Editable summary
              </label>
              <textarea
                id="summary-editor"
                name="summary-editor"
                className="artifactEditor"
                value={artifacts.summary}
                onChange={(event) => updateArtifactField("summary", event.target.value)}
                placeholder="Summary will appear here..."
              />
            </div>
          ) : null}

          {activeTab === "architecture" ? (
            <div className="artifactBody">
              <p className="editorLabel">Double-click or double-tap a diagram node to rename it</p>
              <div className="architectureCanvasWrap">
                <ArchitecturePanel
                  code={artifacts.architecture}
                  onRenameNodeLabel={handleArchitectureNodeRename}
                />
              </div>
            </div>
          ) : null}

          {activeTab === "next_steps" ? (
            <div className="artifactBody">
              <label className="editorLabel" htmlFor="next-steps-editor">
                Editable next steps (one line per task)
              </label>
              <textarea
                id="next-steps-editor"
                name="next-steps-editor"
                className="artifactEditor"
                value={(artifacts.next_steps || []).join("\n")}
                onChange={(event) => updateNextStepsFromText(event.target.value)}
                placeholder="One task per line..."
              />
            </div>
          ) : null}
        </section>
      </main>

      <aside className={`copilotDrawer ${isCopilotOpen ? "open" : ""}`} aria-hidden={!isCopilotOpen}>
        <div className="panelHeader drawerHeader">
          <h2>Notes + Chat</h2>
          <div className="drawerHeaderActions">
            <span>{messages.length} messages</span>
            <button
              type="button"
              className="drawerCloseButton"
              onClick={() => setIsCopilotOpen(false)}
              aria-label="Close Notes and Chat panel"
            >
              Close
            </button>
          </div>
        </div>

        <div className="messages">
          {messages.map((message, index) => (
            <article
              key={`${message.role}-${index}`}
              className={`messageBubble ${message.role === "user" ? "messageUser" : "messageAssistant"}`}
            >
              <p className="messageRole">{message.role === "user" ? "You" : "Copilot"}</p>
              <p>{message.content}</p>
            </article>
          ))}
        </div>

        <div className="composer">
          <textarea
            id="sidekick-input"
            name="sidekick-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Optional: type extra direction for Copilot"
            disabled={isGenerating || isRecording}
          />
          <div className="composerActions">
            <button
              type="button"
              className="primaryButton"
              onClick={handleSend}
              disabled={!input.trim() || isGenerating || isRecording}
            >
              Send
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
