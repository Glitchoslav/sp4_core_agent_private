// logger.js – jednoduchý súborový logger (offline)

import fs from "fs/promises";
import path from "path";

const LOG_DIR = "logs";
const LOG_FILE = path.join(LOG_DIR, "agent.log");

async function ensureLogDir() {
  await fs.mkdir(LOG_DIR, { recursive: true });
}

function formatLine(level, message, extra) {
  const ts = new Date().toISOString();
  const base = `[${ts}] [${level}] ${message}`;
  if (!extra) return base + "\n";
  try {
    const payload = typeof extra === "string" ? extra : JSON.stringify(extra);
    return `${base} ${payload}\n`;
  } catch {
    return base + "\n";
  }
}

export async function logInfo(message, extra) {
  await ensureLogDir();
  await fs.appendFile(LOG_FILE, formatLine("INFO", message, extra), "utf-8");
}

export async function logWarn(message, extra) {
  await ensureLogDir();
  await fs.appendFile(LOG_FILE, formatLine("WARN", message, extra), "utf-8");
}

export async function logError(message, extra) {
  await ensureLogDir();
  await fs.appendFile(LOG_FILE, formatLine("ERROR", message, extra), "utf-8");
}

export async function logEvent(level, message, extra) {
  const lvl = (level || "INFO").toUpperCase();
  if (lvl === "ERROR") return logError(message, extra);
  if (lvl === "WARN") return logWarn(message, extra);
  return logInfo(message, extra);
}
