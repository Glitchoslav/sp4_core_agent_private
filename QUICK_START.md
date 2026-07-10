# 🚀 SP4 v2.0 - Quick Start Guide

## Ľahké spustenie

### 🎯 Testovanie Full Autonomy v2.0

```bash
# Test mission planner (detekcia typov misií)
npm run test:planner

# Test full autonomy (end-to-end s real AI)
npm run test:autonomy

# Test /mission command (live integration test)
npm run test:mission

# Live mission test (2 skutočné misie)
npm run mission
```

---

### 🌐 Servery

```bash
# Production server (Full SP4 v2.0 + Full Autonomy)
npm run serve
# → http://localhost:3002

# Demo server (bez full integration, mock responses)
npm run demo
# → http://localhost:3002

# Legacy server (starý REST API)
npm run server
# → http://localhost:3001
```

---

### 📡 API Endpoints (Production Server)

**Health Check:**
```powershell
Invoke-WebRequest -Uri http://localhost:3002/health
```

**Chat:**
```powershell
$body = @{message="Ahoj SP4!"} | ConvertTo-Json
Invoke-WebRequest -Uri http://localhost:3002/api/chat -Method POST -Body $body -ContentType "application/json"
```

**Mission (Full Autonomy v2.0):**
```powershell
$body = @{goal="Vytvor Python funkciu na faktoriál"} | ConvertTo-Json
Invoke-WebRequest -Uri http://localhost:3002/api/mission -Method POST -Body $body -ContentType "application/json"
```

**List Missions:**
```powershell
Invoke-WebRequest -Uri http://localhost:3002/api/missions
```

**Get Mission Details:**
```powershell
Invoke-WebRequest -Uri http://localhost:3002/api/mission/m_20251125_262877
```

---

### ⚡ Najrychlejší test

```bash
# Spustí 2 skutočné misie s AI (18s):
npm run mission
```

**Výsledok:**
- ✅ Python calculator (4 tasks, $0.330)
- ✅ LinkedIn posts (1 task, $0.100)

---

### 🔥 Production Deployment

**Option 1: PM2 (recommended)**
```bash
npm install -g pm2
pm2 start server_production.js --name sp4-v2
pm2 logs sp4-v2
pm2 stop sp4-v2
```

**Option 2: Standalone PowerShell**
```powershell
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd C:\SP4KULT\sp4_core_agent; node server_production.js"
```

**Option 3: Windows Service (nssm)**
```bash
nssm install SP4-v2 "C:\Program Files\nodejs\node.exe"
nssm set SP4-v2 AppDirectory "C:\SP4KULT\sp4_core_agent"
nssm set SP4-v2 AppParameters "server_production.js"
nssm start SP4-v2
```

---

### 📊 Available NPM Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `npm run mission` | `node test_live_mission.js` | **BEST** - Live test 2 misií |
| `npm run serve` | `node server_production.js` | Production server |
| `npm run demo` | `node server_demo.js` | Demo server (mock) |
| `npm run test:planner` | `node test_planner.js` | Test mission detection |
| `npm run test:autonomy` | `node test_full_autonomy.js` | Test full workflow |
| `npm run test:mission` | `node test_mission_command.js` | Test /mission cmd |

---

### 🎯 Quick Examples

**1. Najrýchlejší test (ODPORÚČANÉ):**
```bash
npm run mission
```

**2. Test specific mission type:**
```bash
node -e "import('./integration.js').then(m => { const agent = new m.SP4IntegratedAgent(); agent.initialize().then(() => agent.processMessage('/mission Vytvor Python web scraper', 'core')).then(r => console.log(r.response)); });"
```

**3. Server + curl test:**
```bash
npm run serve &
sleep 5
curl -X POST http://localhost:3002/api/mission \
  -H "Content-Type: application/json" \
  -d '{"goal":"Vytvor React component pre todo list"}'
```

---

## 🔥 TL;DR

```bash
# Jednoduchý test (18s):
npm run mission

# Alebo server:
npm run serve
# Otvor http://localhost:3002/health
```

**DONE!** 🚀
