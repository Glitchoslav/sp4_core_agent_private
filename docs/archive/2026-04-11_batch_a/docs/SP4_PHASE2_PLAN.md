# 🚀 SP4 Phase 2 Plan - HTTP Server & Mobile Access

**Current State:** v0.8.6.9 - CLI stable, goals working, debug ready  
**Next State:** v0.9.0 - HTTP API, mobile access, webhooks  
**Timeline:** 1-2 weeks

---

## 🎯 Phase 2 Goals

### Primary Objective
**Turn SP4_CORE from CLI tool → accessible service**

- Mobile access (phone, tablet)
- Remote access (Telegram, webhooks)
- API for integrations (shortcuts, IFTTT, custom apps)

### Non-Goals (Out of Scope)
- ❌ Cloud deployment (stay local/self-hosted only)
- ❌ User accounts (single-user system)
- ❌ Web frontend (Phase 3)
- ❌ Real-time WebSockets (overkill for now)

---

## 📦 Deliverables

### 1. HTTP REST API (`server_v07.js`)

**Core Endpoints:**

```javascript
// Chat & Commands
POST   /api/chat              // Send message, get response
POST   /api/command           // Execute command (/goal, /mirror, etc)

// Goals Management
GET    /api/goals             // List all goals
POST   /api/goals             // Create new goal
PUT    /api/goals/:id/done    // Mark goal as done
PUT    /api/goals/:id/drop    // Drop goal
DELETE /api/goals/:id         // Delete goal (admin)

// Memory & Context
GET    /api/mirror/:days      // Get mirror for N days
GET    /api/seeds             // Get all seeds
POST   /api/seed              // Create new seed

// Status & Debug
GET    /api/status            // Agent status (mode, memory, uptime)
GET    /api/debug/modes       // Debug modes info
GET    /api/debug/memory      // Debug memory stats
GET    /api/debug/engines     // Debug engine routing

// Rituals
POST   /api/ritual/today      // Execute /today ritual
POST   /api/ritual/mirror     // Execute /mirror ritual
POST   /api/ritual/trinity    // Execute /trinity with question
```

**Authentication:**
- Simple API key (env var: `SP4_API_KEY`)
- Header: `Authorization: Bearer <key>`
- No OAuth, no JWT (overkill for single-user)

**Response Format:**
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2025-11-21T00:00:00Z",
  "version": "0.9.0"
}
```

**Error Format:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_GOAL",
    "message": "Goal not found",
    "details": { ... }
  },
  "timestamp": "2025-11-21T00:00:00Z"
}
```

---

### 2. Telegram Bot Integration (`telegram_bot.js`)

**Why Telegram:**
- Fastest mobile access
- No app needed
- Push notifications built-in
- End-to-end encryption available

**Bot Commands:**
```
/start          - Initialize bot
/goal [text]    - Set/view goal
/mirror [days]  - Get mirror
/today          - Daily check-in
/trinity <q>    - Trinity question
/mode <name>    - Switch persona
/seed <text>    - Record seed
```

**Implementation:**
```javascript
// telegram_bot.js
import TelegramBot from 'node-telegram-bot-api';
import fetch from 'node-fetch';

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const API_URL = 'http://localhost:3001/api';

bot.onText(/\/goal(.*)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const goalText = match[1]?.trim();
  
  if (!goalText) {
    // GET goals
    const res = await fetch(`${API_URL}/goals`);
    const data = await res.json();
    bot.sendMessage(chatId, formatGoals(data));
  } else {
    // POST new goal
    const res = await fetch(`${API_URL}/goals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: goalText })
    });
    const data = await res.json();
    bot.sendMessage(chatId, `🎯 ${data.message}`);
  }
});

// ... more commands
```

**Security:**
- Whitelist single Telegram user ID (env: `TELEGRAM_USER_ID`)
- Reject all other users
- No public bot, private only

---

### 3. iOS Shortcuts Integration

**Why Shortcuts:**
- Native iOS integration
- Siri voice commands
- Home Screen widgets
- Automation triggers

**Example Shortcuts:**

**1. Daily Check-In (Morning Ritual):**
```
Trigger: 7:00 AM daily
Action: 
  → GET http://localhost:3001/api/ritual/today
  → Show notification with response
  → Speak response (Siri)
```

**2. Set Goal (Voice):**
```
Trigger: "Hey Siri, set SP4 goal"
Action:
  → Ask for input (goal text)
  → POST http://localhost:3001/api/goals
  → Show notification "🎯 Goal set"
```

**3. Evening Mirror:**
```
Trigger: 10:00 PM daily
Action:
  → GET http://localhost:3001/api/mirror/1
  → Show notification
  → Save to Notes app
```

**Note:** Requires iPhone on same network as Mac (or VPN/Tailscale)

---

### 4. Home Assistant Integration (Optional)

**Why Home Assistant:**
- Automation heaven
- Dashboard widgets
- Voice assistants (Alexa, Google Home)
- Triggers (location, time, sensors)

**Custom Component:**
```yaml
# configuration.yaml
sp4_core:
  host: localhost
  port: 3001
  api_key: !secret sp4_api_key

sensor:
  - platform: sp4_core
    name: "SP4 Active Goal"
    endpoint: /api/goals
    value_template: "{{ value_json.data.active.text }}"
```

---

## 🏗️ Implementation Plan

### Week 1: HTTP Server Foundation

**Day 1-2: Basic Server**
- [x] Create `server_v07.js`
- [ ] Express setup
- [ ] CORS + basic auth
- [ ] Health endpoint (`/health`)
- [ ] Status endpoint (`/api/status`)

**Day 3-4: Core Endpoints**
- [ ] POST `/api/chat` - Reuse integration.js
- [ ] POST `/api/command` - Reuse index_v07.js handlers
- [ ] GET `/api/goals` - Reuse goalsModel.js
- [ ] POST `/api/goals` - Create goal

**Day 5-7: Goals CRUD + Testing**
- [ ] PUT `/api/goals/:id/done`
- [ ] PUT `/api/goals/:id/drop`
- [ ] Integration tests (Postman/curl)
- [ ] Error handling
- [ ] Logging

### Week 2: Mobile Access

**Day 8-10: Telegram Bot**
- [ ] Bot setup (BotFather)
- [ ] Basic commands (/start, /goal, /mirror)
- [ ] User whitelist
- [ ] Testing

**Day 11-12: iOS Shortcuts**
- [ ] Example shortcuts (3-5 core rituals)
- [ ] Documentation
- [ ] Testing on iPhone

**Day 13-14: Polish + Docs**
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Telegram bot README
- [ ] Shortcuts setup guide
- [ ] Security hardening

---

## 🔒 Security Considerations

### API Key Management
```bash
# .env
SP4_API_KEY=generated_random_key_here
TELEGRAM_BOT_TOKEN=bot_token_from_botfather
TELEGRAM_USER_ID=your_telegram_id
```

### Network Security
- **Localhost only** by default (`127.0.0.1`)
- **Tailscale/VPN** for remote access (no public internet!)
- **HTTPS** if exposed (Let's Encrypt + reverse proxy)

### Rate Limiting
```javascript
// Prevent abuse
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100 // max 100 requests per window
});

app.use('/api/', limiter);
```

---

## 🧪 Testing Strategy

### Unit Tests
```bash
npm run test:server     # Server endpoints
npm run test:telegram   # Telegram bot handlers
```

### Integration Tests
```bash
# Postman collection
POST /api/chat
POST /api/goals
GET /api/mirror/7
POST /api/ritual/trinity
```

### Manual Testing
```bash
# CLI test
curl -X POST http://localhost:3001/api/chat \
  -H "Authorization: Bearer ${SP4_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"message": "SP4_CORE → vysvetli blockchain"}'

# Telegram test
# Send "/goal Test goal" in Telegram
# Verify response
```

---

## 📊 Success Metrics

### Week 1
- [ ] Server running stable (no crashes)
- [ ] All core endpoints working
- [ ] < 200ms response time (local)
- [ ] 100% test coverage for endpoints

### Week 2
- [ ] Telegram bot responding
- [ ] 3+ iOS Shortcuts working
- [ ] Daily ritual automated (morning check-in)
- [ ] No security vulnerabilities

---

## 🚨 Risks & Mitigations

### Risk 1: Server Stability
**Mitigation:** 
- PM2 process manager
- Auto-restart on crash
- Health checks every 30s

### Risk 2: Mobile Network Issues
**Mitigation:**
- Retry logic in Telegram bot
- Graceful error messages
- Queue failed requests

### Risk 3: Security Breach
**Mitigation:**
- API key required
- Whitelist Telegram user
- No public exposure
- Regular security audits

---

## 🔮 Future (Phase 3+)

**Not in Phase 2, but ideas:**

- [ ] Web dashboard (React/Vue)
- [ ] Voice interface (Whisper.cpp STT)
- [ ] Shared SP4 network (anonymized seeds)
- [ ] Encryption layer (shadowLog)
- [ ] Multi-user support (SP4 community)
- [ ] Mobile app (React Native)

---

## 📚 Resources Needed

### Libraries
```json
{
  "express": "^4.18.0",
  "cors": "^2.8.5",
  "express-rate-limit": "^7.0.0",
  "node-telegram-bot-api": "^0.64.0",
  "dotenv": "^16.0.0"
}
```

### Tools
- **Postman** - API testing
- **ngrok** (optional) - Telegram webhook testing
- **PM2** - Process management
- **Tailscale** (optional) - Secure remote access

---

## 🎯 Definition of Done (Phase 2)

- [x] HTTP server running stable
- [x] All core endpoints working + tested
- [x] Telegram bot functional (basic commands)
- [x] 3+ iOS Shortcuts created + documented
- [x] Security hardened (API key, whitelist, rate limit)
- [x] Documentation complete (API docs, setup guides)
- [x] No regressions in CLI (v0.8.6.9 features still work)

**When ALL checked → Phase 2 COMPLETE → v0.9.0 release**

---

**Next Steps:**
1. Manual CLI test (v0.8.6.9 validation)
2. Git commit + push (stable baseline)
3. Start Phase 2: `server_v07.js` skeleton

**Be real. Be free. Be connected.** 🔥
