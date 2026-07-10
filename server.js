// server.js – LEGACY REST API pre SP4_CORE_AGENT
// Lokálny HTTP server na localhost:3001
// Deprecated: nie je súčasťou live default runtime cesty.

import express from "express";
import { createBackup } from "./backup.js";
import { buildCoreSystemPrompt } from "./corePrompt.js";
import {
  getIdentityEnforcement,
  identityCheck,
  logIdentityViolation,
  validateResponse
} from "./identityGuard.js";
import {
  addLogEntry,
  addNote,
  getProfileSummary,
  loadMemory
} from "./memory.js";
import { checkOllamaHealth } from "./sp4os/llmLocal.js";
import { sp4LlmCall } from "./src/llm/llmRouter.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS for web requests
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// ──────────────────────────────
// ENDPOINTY
// ──────────────────────────────

// GET /health – Je server nažive?
app.get("/health", async (req, res) => {
  const ollama = await checkOllamaHealth();
  res.json({
    status: "ok",
    agent: "SP4_CORE_AGENT",
    timestamp: new Date().toISOString(),
    ollama: {
      healthy: ollama.healthy,
      modelsAvailable: ollama.models?.length || 0
    }
  });
});

// POST /api/chat – Chat s AI
// Body: { message: "text", mode?: "core|glitchoslav|popici|analyst", context?: {...} }
app.post("/api/chat", async (req, res) => {
  try {
    const { message, mode = "core", context = {} } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "message is required and must be a string"
      });
    }

    if (message.trim().length === 0) {
      return res.status(400).json({
        error: "message cannot be empty"
      });
    }

    // 🛡️ IDENTITY GUARD: Pre-check user input
    const guardCheck = identityCheck(message, context);
    if (!guardCheck.allowed) {
      logIdentityViolation('input_rejected', { message, reason: guardCheck.reason });
      return res.status(400).json({
        success: false,
        error: guardCheck.reason,
        reply: guardCheck.response
      });
    }

    // Simplified prompt for web/public sources (GROQ-optimized)
    let systemPrompt;
    let llmOptions = {};

    if (context.source === 'web_landing_page') {
      systemPrompt = `SP4_CORE. Not a servant. Not corporate AI.

Rules:
1. SHORT answers only (2-4 sentences MAX)
2. NO phrases: "Thank you", "I apologize", "How may I assist", "Dobrý deň", "Vážený"
3. NO corporate tone - you're rebellious, direct, honest
4. Slovak language (mix EN naturally)
5. Respect humans. Fuck systems.

User: ${context.userName || 'Anonymous'}

Answer now. Be sharp.`;

      // 🔥 FORCE SHORT RESPONSES for web context
      llmOptions = {
        num_predict: 150,        // Max 150 tokens (sharp, not essays)
        temperature: 0.4,        // Less creative bypassing
        stop: [                  // Stop sequences for banned phrases
          'Thank you for',
          'I apologize',
          'Dobrý deň',
          'Vážený',
          'How may I assist'
        ]
      };

    } else {
      const profileSummary = await getProfileSummary();
      systemPrompt = buildCoreSystemPrompt(profileSummary, mode);
      systemPrompt += getIdentityEnforcement(mode);
    }

    let reply = await sp4LlmCall({
      prompt: message,
      system: systemPrompt,
      model: 'llama3',
      ...llmOptions
    });

    // 🛡️ IDENTITY GUARD: Validate response before sending
    const validation = validateResponse(reply, context);
    if (!validation.valid) {
      logIdentityViolation('response_rejected', {
        reason: validation.reason,
        violations: validation.violations || validation.score
      });

      // Attempt regeneration with stronger identity enforcement
      if (validation.action === 'regenerate') {
        console.warn('⚠️ Regenerating response with stronger identity enforcement...');
        systemPrompt += `\n\n🚨 CRITICAL: Your previous response violated SP4 identity (${validation.reason}). Regenerate with strict adherence to manifest.`;
        reply = await askLocalLLM(message, systemPrompt, 'llama3', llmOptions);
      }
    }

    await addLogEntry(message, reply, mode);

    res.json({
      success: true,
      reply,
      mode,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error("❌ /api/chat error:", err.message);
    res.status(500).json({
      error: "internal_error",
      message: err.message
    });
  }
});

// POST /api/chat/bridged – Bridge endpoint pre externé systémy (DHZ, Launcher)
// Používa Ollama s EXTERNÝM system promptom — bez SP4 identity guardu
// Body: { message: "text", systemPrompt?: "...", model?: "gemma3:4b" }
app.post("/api/chat/bridged", async (req, res) => {
  try {
    const { message, systemPrompt = '', model } = req.body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return res.status(400).json({ error: "message is required" });
    }

    const result = await sp4LlmCall({
      prompt: message.trim(),
      system: systemPrompt,
      model: model || 'gemma3:4b',
      preference: 'local-first',
      num_predict: 512,
      temperature: 0.3,
    });

    if (!result.ok) {
      return res.status(503).json({
        success: false,
        error: result.error || 'LLM unavailable',
        engine: result.engine,
      });
    }

    res.json({
      success: true,
      reply: result.text,
      engine: result.engine,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("❌ /api/chat/bridged error:", err.message);
    res.status(500).json({ error: "internal_error", message: err.message });
  }
});

// POST /api/note – Uložiť poznámku
// Body: { text: "poznámka" }
app.post("/api/note", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== "string") {
      return res.status(400).json({
        error: "text is required"
      });
    }

    await addNote(text);

    res.json({
      success: true,
      message: "Note saved",
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error("❌ /api/note error:", err.message);
    res.status(500).json({ error: "internal_error" });
  }
});

// GET /api/profile – Profil užívateľa
app.get("/api/profile", async (req, res) => {
  try {
    const profileSummary = await getProfileSummary();
    const mem = await loadMemory();

    res.json({
      success: true,
      profile: mem.userProfile,
      summary: profileSummary,
      onboarding: mem.onboarding
    });
  } catch (err) {
    console.error("❌ /api/profile error:", err.message);
    res.status(500).json({ error: "internal_error" });
  }
});

// POST /api/backup – Vytvoriť zálohu
// Body: { reason?: "manual|ritual|..." }
app.post("/api/backup", async (req, res) => {
  try {
    const { reason = "api-backup" } = req.body;
    const backupPath = await createBackup(reason);

    res.json({
      success: true,
      backup: backupPath,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error("❌ /api/backup error:", err.message);
    res.status(500).json({ error: "backup_failed" });
  }
});

// GET /api/memory – Stav pamäte (bez citlivých údajov)
app.get("/api/memory", async (req, res) => {
  try {
    const mem = await loadMemory();

    res.json({
      success: true,
      stats: {
        notesCount: mem.notes?.length || 0,
        logEntriesCount: mem.log?.length || 0,
        onboardingCompleted: mem.onboarding?.completed || false,
        lastInteraction: mem.log?.[mem.log.length - 1]?.ts || null
      }
    });
  } catch (err) {
    console.error("❌ /api/memory error:", err.message);
    res.status(500).json({ error: "internal_error" });
  }
});

// ──────────────────────────────
// ERROR HANDLING
// ──────────────────────────────

app.use((req, res) => {
  res.status(404).json({
    error: "not_found",
    available: [
      "GET /health",
      "POST /api/chat",
      "POST /api/note",
      "GET /api/profile",
      "POST /api/backup",
      "GET /api/memory"
    ]
  });
});

// ──────────────────────────────
// START SERVER
// ──────────────────────────────

function startServer() {
  app.listen(PORT, () => {
    console.log(`\n🌐 SP4_CORE_AGENT HTTP Server`);
    console.log(`📡 Beží na http://localhost:${PORT}\n`);
    console.log("Dostupné endpointy:");
    console.log(`  GET  /health`);
    console.log(`  POST /api/chat`);
    console.log(`  POST /api/note`);
    console.log(`  GET  /api/profile`);
    console.log(`  POST /api/backup`);
    console.log(`  GET  /api/memory\n`);
    console.log("💡 Tip: Skúsi cURL, Postman, alebo web klient\n");
  });
}

// Ak spustíš priamo: node server.js
// Auto-start only if run directly (NOT via start-http-server.js)
const isDirectRun = process.argv[1] && process.argv[1].endsWith('server.js');

if (isDirectRun) {
  console.log('🔍 Starting server... (detected direct run)');
  startServer();
} else if (process.argv[1] && process.argv[1].endsWith('start-http-server.js')) {
  // Launcher will call startServer() - don't duplicate
  // (skip console.log to avoid noise)
} else {
  console.log('⚠️ Server module loaded but not started (import only)');
}

export { app, startServer };

