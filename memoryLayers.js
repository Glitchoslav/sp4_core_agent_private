// memoryLayers.js – Vrstvy pamäte: Raw → Compressed → Chapters
// Spravuje "inteligentnú" pamäť, ktorá si pamätá evolúciu

import fs from "fs/promises";
import path from "path";
import { loadMemory, saveMemory } from "./memory.js";
import { askLocalLLM } from "./sp4os/llmLocal.js";

const LAYERS_FILE = path.join("data", "memoryLayers.json");

const DEFAULT_LAYERS = {
  chapters: [], // Veľké bloky času/témy
  summaries: [], // Kompresované zhrnutia
  triggers: {}, // Keď sa vzorec opakuje
  seeds: [] // Kľúčové rozhodnutia, momenty
};

// ──────────────────────────────
// SEEDS – Kľúčové momenty
// ──────────────────────────────

export async function addSeed(text, type = "observation") {
  const layers = await loadLayers();

  layers.seeds.push({
    id: `seed-${Date.now()}`,
    text,
    type, // "decision", "revelation", "commitment", "crisis", "victory"
    createdAt: new Date().toISOString(),
    impact: "pending" // pending, low, medium, high
  });

  // Zálohuj aj do memory notes
  const mem = await loadMemory();
  mem.notes.push({
    id: `seed-${Date.now()}`,
    text: `🌱 SEED [${type}]: ${text}`,
    createdAt: new Date().toISOString(),
    source: "seed"
  });
  await saveMemory(mem);

  await saveLayers(layers);
  return layers.seeds[layers.seeds.length - 1];
}

export async function getSeedsForContext(limit = 5) {
  const layers = await loadLayers();
  return layers.seeds
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);
}

// ──────────────────────────────
// CHAPTERS – Veľké fázy života
// ──────────────────────────────

export async function createChapter(name, description, startDate = null) {
  const layers = await loadLayers();

  const chapter = {
    id: `ch-${Date.now()}`,
    name,
    description,
    startDate: startDate || new Date().toISOString(),
    endDate: null,
    logCount: 0,
    tags: [],
    mood: "neutral"
  };

  layers.chapters.push(chapter);
  await saveLayers(layers);

  // Zálohuj ako seed
  await addSeed(`Nová fáza: ${name} – ${description}`, "chapter");

  return chapter;
}

export async function getCurrentChapter() {
  const layers = await loadLayers();
  const activeChapters = layers.chapters.filter(c => !c.endDate);
  return activeChapters[activeChapters.length - 1] || null;
}

// ──────────────────────────────
// TAGY + EMÓCIE – Automatická kategorizácia
// ──────────────────────────────

export async function analyzeLogForTags(input) {
  // Rýchly analytical run cez LLM
  const analysisPrompt = `
Analyzuj túto vetu a priraď jednoducho:

VETA: "${input}"

Odpoveď v JSON (iba toto):
{
  "tags": ["tag1", "tag2"],
  "emotion": "low|neutral|high",
  "intensity": 1-5,
  "category": "work|life|finance|relationship|sp4|health|other"
}

Príklad:
Veta: "Hypotéka ma žerie. SP4 ide super."
Odpoveď: {"tags":["hypotéka","finance","sp4"],"emotion":"mixed","intensity":3,"category":"finance"}
`;

  try {
    const response = await askLocalLLM(analysisPrompt, "Be a JSON analyzer. Only output valid JSON.");
    const lines = response.split("\n");
    const jsonLine = lines.find(l => l.includes("{"));
    if (jsonLine) {
      return JSON.parse(jsonLine);
    }
  } catch {
    // Fallback
  }

  return {
    tags: [],
    emotion: "neutral",
    intensity: 2,
    category: "other"
  };
}

export async function enrichLogWithMetadata(logEntry) {
  // Pridá k log entry metadáta
  const analysis = await analyzeLogForTags(logEntry.input);

  return {
    ...logEntry,
    metadata: {
      tags: analysis.tags,
      emotion: analysis.emotion,
      intensity: analysis.intensity,
      category: analysis.category,
      analyzedAt: new Date().toISOString()
    }
  };
}

// ──────────────────────────────
// TRIGGERS – Automatické varovania
// ──────────────────────────────

export async function checkTriggers() {
  const mem = await loadMemory();
  const log = mem.log || [];
  const layers = await loadLayers();

  if (log.length < 5) return null;

  // Vezmi posledných 7 dní
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const recentLogs = log.filter(l => new Date(l.ts) >= weekAgo);

  // Analyzuj tagy
  const tagCounts = {};
  const emotionCounts = { low: 0, neutral: 0, high: 0 };

  for (const entry of recentLogs) {
    const metadata = entry.metadata || {};
    const tags = metadata.tags || [];
    const emotion = metadata.emotion || "neutral";

    tags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });

    emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
  }

  // Zisti top tagy a emócie
  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag, count]) => ({ tag, count }));

  const burnoutRisk = emotionCounts.low > recentLogs.length * 0.4;
  const highEnergy = emotionCounts.high > recentLogs.length * 0.4;

  layers.triggers = {
    lastChecked: new Date().toISOString(),
    topTags,
    emotionDistribution: emotionCounts,
    burnoutRisk,
    highEnergy,
    recentLogsCount: recentLogs.length
  };

  await saveLayers(layers);

  return layers.triggers;
}

// ──────────────────────────────
// PERSISTENCE
// ──────────────────────────────

export async function loadLayers() {
  try {
    const raw = await fs.readFile(LAYERS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return JSON.parse(JSON.stringify(DEFAULT_LAYERS));
  }
}

export async function saveLayers(layers) {
  await fs.mkdir("data", { recursive: true });
  await fs.writeFile(LAYERS_FILE, JSON.stringify(layers, null, 2), "utf-8");
}

// ──────────────────────────────
// SUMMARY GENERATION
// ──────────────────────────────

export async function generateCompressedSummary(daysBack = 7) {
  const mem = await loadMemory();
  const log = mem.log || [];

  if (log.length === 0) return null;

  const now = new Date();
  const cutoff = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

  const recentLogs = log.filter(l => new Date(l.ts) >= cutoff);

  if (recentLogs.length === 0) return null;

  // v1.0: Filter by reasonKept - prioritize high importance
  const priorityReasons = ['high_importance', 'core_value', 'learning_moment', 'emotional_moment'];
  const importantLogs = recentLogs.filter(l =>
    l.metadata?.reasonKept && priorityReasons.includes(l.metadata.reasonKept)
  );

  const logsToSummarize = importantLogs.length >= 5 ? importantLogs : recentLogs;

  console.log(`   📊 Summarizing ${logsToSummarize.length} logs (${importantLogs.length} high-priority)`);

  // Vyber iba inputy
  const topics = logsToSummarize.map(l => `- ${l.input}`).join("\n");

  const summaryPrompt = `
Robí mi kompresovaný súhrn mojej mentálnej aktivity za posledných ${daysBack} dní.

Otázky, ktoré som si kladiem:
${topics}

Tvoj súhrn (max 100 slov):
1. Hlavné témy
2. Skrytý vzorec
3. Aký je moj mindset?
`;

  try {
    const summary = await askLocalLLM(summaryPrompt, buildSummarySystemPrompt());

    const layers = await loadLayers();
    layers.summaries.push({
      id: `sum-${Date.now()}`,
      period: `${daysBack}d`,
      createdAt: new Date().toISOString(),
      text: summary
    });

    // Udržuj max 10 súhrnov
    if (layers.summaries.length > 10) {
      layers.summaries = layers.summaries.slice(-10);
    }

    await saveLayers(layers);

    return summary;
  } catch (err) {
    console.error("❌ Chyba pri generovaní súhrnu:", err.message);
    return null;
  }
}

function buildSummarySystemPrompt() {
  return `
Si analytik tvojho podvedomia.
Zhrň to, čo sa skrýva za otázkami.
Buď úprimný aj keď to nie je príjemné.
`;
}
