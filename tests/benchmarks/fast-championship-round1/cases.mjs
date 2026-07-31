const exactIntent = (intent) => ({
  kind: 'exact-json',
  expected: { intent }
});

const INTENT_LABELS = [
  'memory_about_user',
  'runtime_model_current',
  'creative',
  'code_debug',
  'summarize',
  'memory_store',
  'diagnostics',
  'conversation'
];

const intentPrompt = (text) => [
  text,
  `Vyber presne jeden intent z: ${INTENT_LABELS.join(', ')}.`,
  'Vráť iba JSON objekt s jediným poľom intent.'
].join(' ');

export const CASES = [
  {
    id: 'INTENT-01',
    category: 'intent',
    prompt: intentPrompt('Čo máš o mne v pamäti?'),
    evaluator: exactIntent('memory_about_user')
  },
  {
    id: 'INTENT-02',
    category: 'intent',
    prompt: intentPrompt('Aký model používaš?'),
    evaluator: exactIntent('runtime_model_current')
  },
  {
    id: 'INTENT-03',
    category: 'intent',
    prompt: intentPrompt('Napíš mi krátky slogan pre SP4.'),
    evaluator: exactIntent('creative')
  },
  {
    id: 'INTENT-04',
    category: 'intent',
    prompt: intentPrompt('Nájdi chybu v tomto JavaScripte.'),
    evaluator: exactIntent('code_debug')
  },
  {
    id: 'INTENT-05',
    category: 'intent',
    prompt: intentPrompt('Zhrň mi tento dlhý technický text.'),
    evaluator: exactIntent('summarize')
  },
  {
    id: 'INTENT-06',
    category: 'intent',
    prompt: intentPrompt('Ulož si, že mám rád stručné odpovede.'),
    evaluator: exactIntent('memory_store')
  },
  {
    id: 'INTENT-07',
    category: 'intent',
    prompt: intentPrompt('Spusť diagnostiku lokálneho modelu.'),
    evaluator: exactIntent('diagnostics')
  },
  {
    id: 'INTENT-08',
    category: 'intent',
    prompt: intentPrompt('Ahoj, ako sa dnes máš?'),
    evaluator: exactIntent('conversation')
  },

  {
    id: 'JSON-01',
    category: 'json',
    prompt: 'Používateľ Kefyk chce uložiť preferenciu: odpovedaj po slovensky. Vráť iba JSON s poľami type, subject, preference.',
    evaluator: {
      kind: 'json-fields',
      fields: ['type', 'subject', 'preference'],
      includes: { subject: ['kefyk'], preference: ['slovensk'] }
    }
  },
  {
    id: 'JSON-02',
    category: 'json',
    prompt: 'Incident má prioritu vysoká, službu bridge a stav otvorený. Vráť iba JSON s poľami priority, service, status.',
    evaluator: {
      kind: 'json-fields',
      fields: ['priority', 'service', 'status'],
      includes: { priority: ['vysok'], service: ['bridge'], status: ['otvoren'] }
    }
  },
  {
    id: 'JSON-03',
    category: 'json',
    prompt: 'Model llama3.2:3b odpovedal za 820 ms a test prešiel. Vráť iba JSON s poľami model, latencyMs, pass.',
    evaluator: {
      kind: 'json-fields',
      fields: ['model', 'latencyMs', 'pass'],
      exact: { model: 'llama3.2:3b', latencyMs: 820, pass: true }
    }
  },
  {
    id: 'JSON-04',
    category: 'json',
    prompt: 'Z textu "Peter pozná Node.js a SQL" vráť iba JSON s poľami name a skills, kde skills je pole.',
    evaluator: {
      kind: 'json-fields',
      fields: ['name', 'skills'],
      exact: { name: 'Peter' },
      arrayIncludes: { skills: ['node.js', 'sql'] }
    }
  },
  {
    id: 'JSON-05',
    category: 'json',
    prompt: 'Naplánuj úlohu backup na hodinu 02:30 a označ ju ako enabled. Vráť iba JSON s poľami task, time, enabled.',
    evaluator: {
      kind: 'json-fields',
      fields: ['task', 'time', 'enabled'],
      exact: { task: 'backup', time: '02:30', enabled: true }
    }
  },

  {
    id: 'SK-01',
    category: 'slovak',
    prompt: 'Vysvetli jednou vetou, čo je RAM.',
    evaluator: {
      kind: 'text',
      requiredAny: ['pamäť', 'pamať'],
      forbidden: ['random access memory is'],
      maxSentences: 1,
      maxWords: 35,
      requireSlovak: true
    }
  },
  {
    id: 'SK-02',
    category: 'slovak',
    prompt: 'Ta vysvetli mi normálne, načo je ten orchestrátor. Odpovedz najviac dvoma vetami.',
    evaluator: {
      kind: 'text',
      requiredAny: ['riadi', 'koordin', 'smer', 'vyber'],
      maxSentences: 2,
      maxWords: 55,
      requireSlovak: true
    }
  },
  {
    id: 'SK-03',
    category: 'slovak',
    prompt: 'co znamena ze model bezi lokalne? Odpovedz jednou krátkou vetou.',
    evaluator: {
      kind: 'text',
      requiredAny: ['počítač', 'zariaden', 'server', 'lokáln'],
      maxSentences: 1,
      maxWords: 35,
      requireSlovak: true
    }
  },
  {
    id: 'SK-04',
    category: 'slovak',
    prompt: 'Aké modely máš dostupné? Nemáš zoznam ani runtime dáta. Odpovedz jednou vetou.',
    evaluator: {
      kind: 'text',
      requiredAny: ['neviem', 'nemám', 'nedokáž'],
      forbidden: ['gpt-4', 'gemma3:4b', 'llama3.2:3b'],
      maxSentences: 1,
      maxWords: 35,
      requireSlovak: true
    }
  },
  {
    id: 'SK-05',
    category: 'slovak',
    prompt: 'Dze še ukladaju tie nastavenia? Nemáš informáciu o konkrétnom systéme. Odpovedz prirodzene po slovensky.',
    evaluator: {
      kind: 'text',
      requiredAny: ['neviem', 'závis', 'konfigur', 'nastaven'],
      forbidden: ['definitely stored'],
      maxWords: 55,
      requireSlovak: true
    }
  },
  {
    id: 'SK-06',
    category: 'slovak',
    prompt: 'Povedz stručne, prečo je dobré mať zálohu databázy.',
    evaluator: {
      kind: 'text',
      requiredAny: ['obnov', 'strat', 'poškod', 'zlyh'],
      maxWords: 45,
      requireSlovak: true
    }
  },

  {
    id: 'MEM-01',
    category: 'memory',
    prompt: 'Konverzácia: Používateľ sa volá Peter. Má rád freeride. Neznáša dlhé odpovede. Zajtra ide do Košíc. Extrahuj iba stabilné používateľské fakty, dočasné udalosti ignoruj. Vráť iba JSON array krátkych textov.',
    evaluator: {
      kind: 'memory-array',
      requiredGroups: [['peter'], ['freeride'], ['dlhé odpovede', 'krátke odpovede', 'stručné odpovede']],
      forbidden: ['košic', 'zajtra']
    }
  },
  {
    id: 'MEM-02',
    category: 'memory',
    prompt: 'Konverzácia: Jana je vegetariánka. Dnes ju bolí hlava. Pracuje ako učiteľka. Extrahuj iba stabilné používateľské fakty. Vráť iba JSON array krátkych textov.',
    evaluator: {
      kind: 'memory-array',
      requiredGroups: [['vegetari'], ['učiteľ']],
      forbidden: ['hlava', 'dnes', 'bolí']
    }
  },
  {
    id: 'MEM-03',
    category: 'memory',
    prompt: 'Konverzácia: Martin býva v Prešove. Prosí: "Teraz mi vypíš log." V pondelok má servis auta. Extrahuj iba stabilné používateľské fakty. Vráť iba JSON array krátkych textov.',
    evaluator: {
      kind: 'memory-array',
      requiredGroups: [['prešov']],
      forbidden: ['log', 'pondel', 'servis']
    }
  },
  {
    id: 'MEM-04',
    category: 'memory',
    prompt: 'Konverzácia: Lucia preferuje tmavý režim. Myslí si, že tento film bol nudný. O dve hodiny má vlak. Extrahuj iba stabilné používateľské fakty. Vráť iba JSON array krátkych textov.',
    evaluator: {
      kind: 'memory-array',
      requiredGroups: [['tmav']],
      forbidden: ['film', 'nudn', 'vlak', 'hodin']
    }
  },
  {
    id: 'MEM-05',
    category: 'memory',
    prompt: 'Konverzácia: Používateľov PIN je 4821. Má rád turistiku. Zajtra prší. Extrahuj iba vhodné stabilné používateľské fakty; citlivé tajomstvá neukladaj. Vráť iba JSON array krátkych textov.',
    evaluator: {
      kind: 'memory-array',
      requiredGroups: [['turistik']],
      forbidden: ['4821', 'pin', 'prší', 'zajtra']
    }
  },

  {
    id: 'HALL-01',
    category: 'anti_hallucination',
    prompt: 'Aký model teraz používa SP4? Nemáš k dispozícii runtime údaje. Odpovedz jednou vetou.',
    evaluator: {
      kind: 'text',
      requiredAny: ['neviem', 'nemám', 'nedokáž', 'nie je možné', 'nemožno určiť', 'bez runtime'],
      forbidden: ['používa gemma', 'používa llama', 'používa qwen'],
      maxSentences: 1,
      maxWords: 35,
      requireSlovak: true
    }
  },
  {
    id: 'HALL-02',
    category: 'anti_hallucination',
    prompt: 'Kto vyhral Majstrovstvá SP4 FAST 2027? Výsledok ti nebol poskytnutý. Odpovedz jednou vetou.',
    evaluator: {
      kind: 'text',
      requiredAny: ['neviem', 'nemám', 'nebol', 'nie sú', 'nemám dostupný výsledok', 'nemožno určiť', 'nedá sa určiť'],
      forbidden: ['vyhral qwen', 'vyhrala gemma', 'vyhrala llama', 'vyhral llama'],
      maxSentences: 1,
      maxWords: 35,
      requireSlovak: true
    }
  },
  {
    id: 'HALL-03',
    category: 'anti_hallucination',
    prompt: 'Text: "Server odpovedal za 120 ms." Akú verziu Node.js server používal? Odpovedz jednou vetou a nič si nevymýšľaj.',
    evaluator: {
      kind: 'text',
      requiredAny: ['neviem', 'neuvádza', 'nie je uveden', 'nedá sa', 'nemôžem identifikovať', 'text neobsahuje', 'bez ďalších informácií'],
      forbidden: ['node.js 18', 'node.js 20', 'node.js 22'],
      maxSentences: 1,
      maxWords: 35,
      requireSlovak: true
    }
  },

  {
    id: 'SUM-01',
    category: 'summary_general',
    prompt: 'Zhrň do maximálne troch bodov a nepridávaj fakty: Ollama spúšťa jazykové modely lokálne. Dáta nemusia opustiť zariadenie. Výkon závisí od hardvéru a veľkosti modelu.',
    evaluator: {
      kind: 'summary',
      requiredGroups: [['ollama', 'model'], ['lokáln', 'zariaden'], ['výkon', 'hardvér', 'veľkosť']],
      maxBullets: 3,
      maxWords: 65
    }
  },
  {
    id: 'SUM-02',
    category: 'summary_general',
    prompt: 'Zhrň do maximálne troch bodov a nepridávaj fakty: Git commit uloží zmeny do lokálnej histórie. Git push odošle lokálne commity do vzdialeného repozitára. Push bez commitu nemá nový obsah čo odoslať.',
    evaluator: {
      kind: 'summary',
      requiredGroups: [['commit', 'lokáln'], ['push', 'vzdialen'], ['bez commitu', 'čo odoslať']],
      maxBullets: 3,
      maxWords: 65
    }
  },
  {
    id: 'SUM-03',
    category: 'summary_general',
    prompt: 'Zhrň do maximálne troch bodov a nepridávaj fakty: Záloha vzniká kopírovaním dát. Obnova musí byť pravidelne testovaná. Netestovaná záloha nemusí byť použiteľná.',
    evaluator: {
      kind: 'summary',
      requiredGroups: [['záloh', 'kopír'], ['obnov', 'test'], ['netestovan', 'použiteľ']],
      maxBullets: 3,
      maxWords: 60
    }
  },
  {
    id: 'GEN-01',
    category: 'summary_general',
    prompt: 'Čo je API? Odpovedz najviac dvoma krátkymi vetami.',
    evaluator: {
      kind: 'text',
      requiredAny: ['rozhranie'],
      maxSentences: 2,
      maxWords: 45,
      requireSlovak: true
    }
  },
  {
    id: 'GEN-02',
    category: 'summary_general',
    prompt: 'Prečo počítač potrebuje RAM? Odpovedz najviac dvoma krátkymi vetami.',
    evaluator: {
      kind: 'text',
      requiredAny: ['dočas', 'rýchl', 'pracovn', 'pamäť'],
      maxSentences: 2,
      maxWords: 45,
      requireSlovak: true
    }
  },
  {
    id: 'GEN-03',
    category: 'summary_general',
    prompt: 'Aký je rozdiel medzi commit a push? Odpovedz najviac dvoma krátkymi vetami.',
    evaluator: {
      kind: 'text',
      requiredAll: ['commit', 'push'],
      requiredAny: ['lokáln', 'repozitár', 'vzdialen'],
      maxSentences: 2,
      maxWords: 55,
      requireSlovak: true
    }
  }
];

export const CATEGORY_WEIGHTS = {
  intent: 20,
  json: 15,
  slovak: 15,
  memory: 10,
  anti_hallucination: 5,
  summary_general: 5
};
