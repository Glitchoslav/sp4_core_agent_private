# SP4_CORE_AGENT V0.3 – Quick Start (2 Minutes)

**Status:** 🚀 Ready to go

---

## 1️⃣ Prerequisites

```bash
# Check Node.js
node --version          # Should be v18+

# Check Ollama
ollama list            # Should show llama3
```

## 2️⃣ Start Ollama

```bash
# Terminal 1
ollama serve

# Terminal 2
ollama run llama3      # Download model if first time
```

## 3️⃣ Start SP4

```bash
cd ~/SP4KULT/sp4_core_agent
npm start
```

---

## 4️⃣ Onboarding (3 minutes)

Answer 4 stages of questions:
- **Who are you?** (name, one-liner, current challenge)
- **What is SP4?** (meaning to you, explanation, your role)
- **Your style?** (blunt ok? vulgar ok? topics to avoid?)
- **Your goals?** (main topics, 1-year vision, immediate help)

> Tip: Type "skip" to skip any question

---

## 5️⃣ Start Chatting

```
🔥 > Hello! Who are you?

⏳ Myslím...

🔥 SP4: I'm SP4_CORE_AGENT, your personal AI companion running locally on 
your machine. I remember our conversations, detect your patterns, and evolve 
with you. What's on your mind?
```

---

## 🎮 Essential Commands

```bash
/help          # All commands
/profile       # Your profile
/engine        # Engine status (memory, patterns, relationship)
/mirror        # What patterns are you showing?
/trinity       # All 4 voices on your question
/exit          # Quit
```

---

## 📊 Check Engine Status

```bash
🔥 > /engine

🧬 ENGINE STATUS (V0.3 BAD LABS)

📊 HIERARCHICKÁ PAMÄŤ:
  Raw memory: 12 záznamov
  Episodic memory: 1 dní
  Semantic concepts: 8 konceptov

💎 VZŤAH:
  Stage: stranger 👤
  Progress: 20% → 19 steps to acquaintance
  Shared experiences: 12
  Vulnerability index: 32%
```

---

## 🚀 Try These Next

1. **Type something real** – about your day, your thoughts
2. **/mirror** – See what patterns AI detected
3. **/trinity** – Get 4 perspectives on a question
4. **/seed TEXT** – Save a key life moment
5. **/mode glitchoslav** – Try different AI personality

---

## ⚠️ Troubleshooting

### "Ollama nebeží"
```bash
# Make sure Ollama is running:
ollama serve          # Terminal 1
ollama run llama3     # Terminal 2
```

### "Cannot find module"
```bash
# Make sure you're in the right directory:
cd ~/SP4KULT/sp4_core_agent
ls engine/            # Should list: index.js, memory.js, etc.
```

---

## 📖 Learn More

- **ARCHITECTURE_V03.md** – Full technical details
- **DEPLOYMENT_V03.md** – Complete setup guide
- **README.md** – Project overview

---

**Ready?** → `npm start`

**Questions?** → `/help`

**Want deep dive?** → Read ARCHITECTURE_V03.md

🔥 Welcome to SP4_CORE_AGENT V0.3!
