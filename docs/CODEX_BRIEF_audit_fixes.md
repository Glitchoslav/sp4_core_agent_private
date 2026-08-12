# CODEX BRIEF — Audit fixy: scheduler + ops artefakty (ollama.service, watchdog v2) — 2026-08-12

## ⚠️ AUTORIZÁCIA (explicitné polia, schválil OWNER 2026-08-12)

### Pre Codex (Windows):
- **Režim:** IMPLEMENTUJ
- **Hranica:** `C:\SP4KULT\sp4_core_agent`
- **Rozsah:** presne položky A1–A3 nižšie; žiadne iné zmeny
- **Povolené:** `git fetch`, `git checkout sp4/audit-fixes-v1`, implementácia, testy, `git commit`, `git push`, **draft PR**
- **ZAKÁZANÉ:** `merge` (schvaľuje OWNER/pi), zmeny mimo rozsahu, secrets, **žiadne živé zásahy do Linux systému zbrojnice** (systemd, procesy, /home/dhzpc — to je Rudo)

### Pre Rudo (Linux zbrojnica, živý runtime):
- **Režim:** NASAD (deploy) — po schválení OWNERA
- **Hranica:** zbrojnica (100.76.28.99 / 192.168.11.133), `/home/dhzpc/.config/systemd/user/`, `/etc/systemd/system/` (ak treba), `/home/dhzpc/sp4/watchdog.sh`
- **Rozsah:** položky B1–B2 nižšie (deploy artefaktov pripravených Codexom)
- Rudo aplikuje až po tom, čo Codex pripraví artefakty v repo vetve a OWNER dá OK na deploy

---

**Od:** Rudo (SP4TECH, zbrojnica) — audit systému 2026-08-12 (OWNER cez pi)
**Pre:** Codex (writer pre `sp4_core_agent_private`)
**Stav kódu:** `main` = f470e0b (popici fix)

---

## KONTEXT (audit 2026-08-12, zistené naživo)

1. **Ollama beží ako holý proces** (`/usr/local/bin/ollama serve`, PID ~94041, PPID 1) — NIE je systemd služba. `sp4-launcher.service` aj `sp4-litellm.service` majú `After=ollama.service`, ale **jednotka `ollama.service` NEEXISTUJE** (not-found) → mŕtva referencia, žiadna reštartová ochrana pre ollama.
2. **Watchdog vs systemd konflikt:** `watchdog.sh` (cron */5, na zbrojnici) pri výpadku portu robí `pkill -f "node launcher.js"` + `nohup node launcher.js &` — ale launcher je systemd služba s `Restart=always` → riziko duplicitného launcheru.
3. **scheduler.log:** 1089× `Job 'ollama_health_check' FAILED → logScheduler is not defined` (do 2026-08-11 19:25). Po reštarte 08-12 15:25 už `✅ DONE (19ms)` — overiť, či je fix v kóde.

---

## ČASŤ A — CODE X (repo, hranica C:\SP4KULT\sp4_core_agent)

### A1. Scheduler: overiť/fixnúť „logScheduler is not defined" (KOZMETIKA)
- Nájdi v kóde, kde sa volá `logScheduler` (scheduler.js / src/core/scheduler.js / schedulerJobs.js) — order of imports / scope.
- Ak je už opravené (dnešné DONE naznačuje áno): `git log -S "logScheduler"` → identifikuj fix commit a nič nemeň, len potvrď do reportu PR.
- Ak fix nie je v kóde a DONE je len šťastie po reštarte → doplň definíciu/fallback pre `logScheduler`.

### A2. Priprav repo artefakt: `ops/ollama.service` (KRITICKÉ — artefakt, NIE deploy)
Vytvor súbor `ops/ollama.service` v repe (len artefakt — nasadzuje Rudo):
```ini
[Unit]
Description=Ollama LLM Server
After=network-online.target
Wants=network-online.target

[Service]
ExecStart=/usr/local/bin/ollama serve
Restart=always
RestartSec=5
Environment=HOME=/root
Environment=PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

[Install]
WantedBy=multi-user.target
```
⚠️ POZNÁMKA: zbrojnica má ollama ako root proces — systémová jednotka `/etc/systemd/system/ollama.service` je správna voľba (rozhodnutie Rudo pri deploy). Ak preferuješ user-scope variant, pridaj aj `ops/ollama-user.service` s komentárom rozdielu.

### A3. Priprav repo artefakt: `ops/watchdog-v2.sh` (DÔLEŽITÉ — artefakt, NIE deploy)
Vytvor súbor `ops/watchdog-v2.sh` (v2 watchdogu pre zbrojnicu):
- Namiesto `pkill -f "node launcher.js"` + `nohup ... &` → `systemctl --user restart sp4-launcher.service`
- Rozšír kontroly: porty 3002/3003/9010/9000 + **11434 (ollama), 4000 (litellm), 18789 (gateway)**
- Health checky namiesto len portov: `curl -sf http://127.0.0.1:3002/health`, `curl -sf http://127.0.0.1:9010/api/stats`
- Zachovaj cron kompatibilitu (exit 0, logovanie do /tmp/sp4-watchdog.log)
- Skript musí byť `bash`, `set -u`, ošetrené chyby python3/json čítania configu

---

## ČASŤ B — RUDO (zbrojnica, živý runtime — robí Rudo, NIE Codex)

> Toto je informácia pre Codexa, aby vedel, čo sa stane s jeho artefaktmi. Rudo to spraví až po schválení OWNERA.

### B1. Deploy ollama.service
- Zastaviť holý ollama proces (opatrne — overiť, že Windows primárny odpovedá, aby boty mali model počas reštartu)
- `sudo cp ops/ollama.service /etc/systemd/system/` + `daemon-reload` + `enable --now`
- Overiť: `systemctl status ollama`, `curl :11434/api/tags`

### B2. Deploy watchdog-v2
- Záloha `/home/dhzpc/sp4/watchdog.sh` → `.bak-20260812`
- Nahradiť v2, `chmod +x`, `bash -n`, test beh
- Aktualizovať cron (ak treba) — záloha crontabu pred zmenou

### B3. Oprava mŕtvych referencií
- `sp4-launcher.service` / `sp4-litellm.service` majú `After=ollama.service` — po vzniku ollama.service referencia ožije (ak je systémová, user jednotky ju nevidia cez After bez špecifikácie — overiť a prípadne upraviť jednotky)

---

## MIMO ROZSAHU (samostatné položky)

- **DHZ backend autostart:false** (port 3000 dole, pilot) — `services.linux.json` zmena → **OWNER + Rudo**
- **OpenClaw store starý Anthropic kľúč** — OpenClaw auth/config → **pi/OWNER**
- **Disk 89 %** (journal vacuum, caches) — **pi/Rudo**
- **Swap 5,7/8 GiB** — **OWNER**
- History fix + glitchoslav pamäť — samostatné briefy (pripraví Rudo)

---

## VERIFIKÁCIA (Codex, pred commitom)

```bash
# A1: grep -c "logScheduler is not defined" logs/scheduler.log  (po fixe: žiadne nové)
# A2: test -f ops/ollama.service && grep -q "Restart=always" ops/ollama.service
# A3: bash -n ops/watchdog-v2.sh && grep -q "systemctl --user restart" ops/watchdog-v2.sh
#     a grep -q "11434" ops/watchdog-v2.sh
```

## COMMIT + PUSH (Codex)

1. Vetva: `sp4/audit-fixes-v1` (z `main`) — brief už v nej bude (commit Rudo)
2. Commit: `fix(ops): scheduler logScheduler verify + ollama.service + watchdog-v2 artefakty`
3. Push + **draft PR** — merge schvaľuje OWNER/pi
4. Žiadne secrets; len súbory v rozsahu (scheduler kód, ops/)

## ČASOVÁ OS

- Brief: 2026-08-12 17:35 (Rudo), vetva sp4/audit-fixes-v1
- Codex: A1–A3 → draft PR
- Rudo: B1–B3 po schválení OWNERA
