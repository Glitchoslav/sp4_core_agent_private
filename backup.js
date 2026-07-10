// backup.js – Automatická záloha SP4 pamäte
// Najdôležitejšia vec: aby si nestratil dušu

import fs from "fs/promises";
import path from "path";

const BACKUP_DIR = "backups";
const MEMORY_FILE = "data/memory.json";

export async function createBackup(reason = "auto") {
  try {
    // Skontroluj, či existuje memory
    const memoryExists = await fileExists(MEMORY_FILE);
    if (!memoryExists) {
      console.log("⚠️  Žiadna pamäť na zálohovaní.");
      return;
    }

    // Vytvor priečinok na zálohy
    await fs.mkdir(BACKUP_DIR, { recursive: true });

    // Načítaj pamäť
    const memoryRaw = await fs.readFile(MEMORY_FILE, "utf-8");
    const memory = JSON.parse(memoryRaw);

    // Update metaReflection - lastBackup timestamp
    if (!memory.metaReflection) memory.metaReflection = {};
    memory.metaReflection.lastBackup = new Date().toISOString();

    // Serialize updated memory
    const memoryUpdated = JSON.stringify(memory, null, 2);

    // Save updated memory back
    await fs.writeFile(MEMORY_FILE, memoryUpdated, "utf-8");

    // Vygeneruj meno: memory-2025-11-15_14-30.json
    const timestamp = new Date().toISOString()
      .slice(0, 19)
      .replace("T", "_")
      .replace(/:/g, "-");

    const backupName = `memory-${timestamp}_${reason}.json`;
    const backupPath = path.join(BACKUP_DIR, backupName);

    // Uložíme metadáta o zálohovaní
    const backupMeta = {
      createdAt: new Date().toISOString(),
      reason,
      filename: backupName,
      originalSize: memoryUpdated.length
    };

    // Uložíme zálohu
    await fs.writeFile(backupPath, memoryUpdated, "utf-8");

    // Zapíšeme do logu záloh
    await appendBackupLog(backupMeta);

    console.log(`✅ Záloha vytvorená: ${backupName}`);
    return backupPath;
  } catch (err) {
    console.error("❌ Chyba pri zálohovaní:", err.message);
  }
}

export async function listBackups() {
  try {
    const backupExists = await fileExists(BACKUP_DIR);
    if (!backupExists) {
      console.log("📁 Zatiaľ žiadne zálohy.");
      return [];
    }

    const files = await fs.readdir(BACKUP_DIR);
    const jsonFiles = files.filter(f => f.endsWith(".json") && f.startsWith("memory-"));

    if (jsonFiles.length === 0) {
      console.log("📁 Zatiaľ žiadne zálohy.");
      return [];
    }

    console.log(`\n📁 ${jsonFiles.length} záloh nájdených:\n`);
    jsonFiles.forEach((file, idx) => {
      console.log(`  ${idx + 1}. ${file}`);
    });
    console.log();

    return jsonFiles;
  } catch (err) {
    console.error("❌ Chyba pri čítaní záloh:", err.message);
    return [];
  }
}

export async function restoreBackup(filename) {
  try {
    const backupPath = path.join(BACKUP_DIR, filename);

    const exists = await fileExists(backupPath);
    if (!exists) {
      console.log(`❌ Záloha ${filename} neexistuje.`);
      return false;
    }

    // Načítaj zálohu
    const backup = await fs.readFile(backupPath, "utf-8");

    // Vytvor emergency backup aktuálneho stavu
    await createBackup("pre-restore");

    // Obnov pamäť
    await fs.mkdir("data", { recursive: true });
    await fs.writeFile(MEMORY_FILE, backup, "utf-8");

    console.log(`✅ Pamäť obnovená z: ${filename}`);
    return true;
  } catch (err) {
    console.error("❌ Chyba pri obnove:", err.message);
    return false;
  }
}

// ──────────────────────────────
// Pomôcky
// ──────────────────────────────

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function appendBackupLog(meta) {
  const logFile = path.join(BACKUP_DIR, "backups.log");
  const logEntry = `${meta.createdAt} | ${meta.reason} | ${meta.filename} | ${meta.originalSize}b\n`;

  try {
    await fs.appendFile(logFile, logEntry, "utf-8");
  } catch (err) {
    console.error("⚠️  Chyba pri logu:", err.message);
  }
}

// Rituál: Denná automatická záloha
export async function setupDailyBackup() {
  // Spustí sa pri štarte
  // Skontroluj, či dnes už existuje záloha
  const today = new Date().toISOString().slice(0, 10);
  const backupExists = await fileExists(BACKUP_DIR);

  if (!backupExists) {
    await createBackup("daily");
    return;
  }

  try {
    const files = await fs.readdir(BACKUP_DIR);
    const todayBackups = files.filter(f => f.includes(today));

    if (todayBackups.length === 0) {
      await createBackup("daily");
    }
  } catch {
    // Ignorerej
  }
}
