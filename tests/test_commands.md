# 🧪 Test Commands (v0.8.6.9)

## Test Sequence

### 1. Test /debug commands
```
/debug_modes
/debug_memory
/debug_engines
```

### 2. Test /goal workflow
```
/goal
/goal Dokončiť SP4_CORE_AGENT v0.9 do konca mesiaca
/goals
/goal done
/goal Napísať dokumentáciu pre SP4 komunitu
/goal
/goal drop
/goals
```

### 3. Test persona + goal integration
```
SP4_CORE → aký je môj cieľ?
Popiči → nakopni ma k dokončeniu cieľa
Glitchoslav → aký je zmysel môjho cieľa?
```

### 4. Test /trinity with goal
```
/trinity ako dokončím SP4_CORE_AGENT do konca mesiaca?
```

---

## Expected Behavior

### /debug_modes
- ✅ Shows current mode
- ✅ Shows auto-detected mode
- ✅ Shows context lock strength
- ✅ Shows validator status

### /debug_memory
- ✅ Shows last 5 memory events
- ✅ Shows totals (raw log, summaries, chapters, seeds, goals)

### /debug_engines
- ✅ Shows model registry
- ✅ Shows active integrations
- ✅ Shows fallback chain

### /goal workflow
```
/goal → "Žiadny aktívny cieľ"
/goal <text> → "🎯 Nový cieľ nastavený: <text>"
/goals → shows active + history
/goal done → "✅ Cieľ dokončený: <text>"
/goal drop → "🗑️ Cieľ dropnutý: <text>"
```

---

*Test in terminal: `npm start` → paste commands one by one*
