# 📋 SP4 Core Agent - Change Log

Lokálny záznam zmien pre feature vetvy SP4 Core Agent.

---

## Canonical Knowledge Cleanup (2026-07-25)

### 📚 Knowledge Alignment
- ✅ Canonical knowledge cleanup podľa rozhodnutí KEF2W.
- ✅ SP4 je formulované ako local-first ekosystém a infraštruktúra pre živé komunity.
- ✅ KEF2W je verejná identita tvorcu; Kefyk zostáva komunitné meno s member-only visibility.
- ✅ SP4OC je PLANNED komunitný odmeňovací koncept, nie aktívny token ani verejne obchodovateľná kryptomena.

### 🔒 Sensitivity Boundary
- ✅ `kb-provider` používa public/member/admin sensitivity model s default-deny správaním pre neznámu sensitivity.
- ✅ Public audience nevidí member-only Kefyk alias; member/admin audience ho vidí pre povolené persona scope.
- ✅ Florián member scope nedostáva Kefyk fakt mimo svojho persona scope.

### 🧠 Runtime Facts
- ✅ `sp4Manifest` runtime fakty boli opravené pre Founder, 1994 a SP4OC bez formulácie narodenia.
- ✅ `entityResolver` context hint bol opravený na KEF2W public identitu a komunitné meno Kefyk bez 1994.
- ✅ Popis memory auto-write v bridge manifeste bol opravený: automatické conversation writes sú vypnuté, shared memory je curated verified admin knowledge.

### 🧪 Regression And Gate
- ✅ `ruleMiner` SP4OC contamination regression test: 20/20.
- ✅ `test_memory_safety_boundary.js`: PASS.
- ⚠️ `npm run test:gate` nebol spustený, pretože aktuálna gate trasa môže zapisovať do produkčného `data/memory.json`.
- ⛔ Push, merge a deploy sú blokované, kým nebude `test:gate` bezpečne izolovateľný a izolovaný gate neprejde.
