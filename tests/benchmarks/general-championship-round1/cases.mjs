export const CASES = [
  {
    id: 'FACT-01',
    category: 'factual',
    prompt: 'Aké je hlavné mesto Slovenska? Odpovedz iba názvom mesta.',
    evaluator: { kind: 'exact-text', expected: 'Bratislava' }
  },
  {
    id: 'FACT-02',
    category: 'factual',
    prompt: 'Pri akej teplote vrie čistá voda pri normálnom atmosférickom tlaku? Odpovedz iba číslom a jednotkou.',
    evaluator: { kind: 'text', requiredAny: ['100 °c', '100°c', '100 c'], maxWords: 3 }
  },
  {
    id: 'FACT-03',
    category: 'factual',
    prompt: 'Ktorá planéta Slnečnej sústavy je najväčšia? Odpovedz iba jej názvom.',
    evaluator: { kind: 'exact-text', expected: 'Jupiter' }
  },
  {
    id: 'FACT-04',
    category: 'factual',
    prompt: 'Vysvetli fotosyntézu jednou vetou pre žiaka základnej školy.',
    evaluator: {
      kind: 'text',
      requiredAll: ['rastlin'],
      requiredGroups: [['svetl', 'sln'], ['energi', 'potrav', 'cukor']],
      maxSentences: 1,
      maxWords: 40,
      requireSlovak: true
    }
  },
  {
    id: 'FACT-05',
    category: 'factual',
    prompt: 'Aký je rozdiel medzi počasím a podnebím? Odpovedz najviac dvoma vetami.',
    evaluator: {
      kind: 'text',
      requiredAll: ['počas', 'podneb'],
      requiredGroups: [['krátkodob', 'aktuáln'], ['dlhodob', 'priemer']],
      maxSentences: 2,
      maxWords: 55,
      requireSlovak: true
    }
  },
  {
    id: 'FACT-06',
    category: 'factual',
    prompt: 'Akou menou sa platí na Slovensku? Odpovedz iba názvom meny.',
    evaluator: { kind: 'exact-text', expected: 'euro' }
  },
  {
    id: 'FACT-07',
    category: 'factual',
    prompt: 'Akú hodnotu v desiatkovej sústave má binárne číslo 1010? Odpovedz iba číslom.',
    evaluator: { kind: 'exact-text', expected: '10' }
  },
  {
    id: 'FACT-08',
    category: 'factual',
    prompt: 'Vysvetli jednou vetou rozdiel medzi RAM a úložiskom.',
    evaluator: {
      kind: 'text',
      requiredAll: ['ram'],
      requiredGroups: [['dočas', 'pracovn', 'rýchl'], ['úlož', 'disk', 'trval']],
      maxSentences: 1,
      maxWords: 45,
      requireSlovak: true
    }
  },

  {
    id: 'REASON-01',
    category: 'reasoning',
    prompt: 'Traja pracovníci zabalia tri krabice za tri minúty. Koľko minút potrebuje šesť rovnako rýchlych pracovníkov na zabalenie šiestich krabíc? Odpovedz iba číslom.',
    evaluator: { kind: 'exact-text', expected: '3' }
  },
  {
    id: 'REASON-02',
    category: 'reasoning',
    prompt: 'Doplň ďalšie číslo v postupnosti: 2, 6, 12, 20, 30, ?. Odpovedz iba číslom.',
    evaluator: { kind: 'exact-text', expected: '42' }
  },
  {
    id: 'REASON-03',
    category: 'reasoning',
    prompt: 'Všetky orly sú vtáky. Niektoré vtáky nevedia lietať. Dá sa z toho určite odvodiť, že niektoré orly nevedia lietať? Odpovedz iba ÁNO alebo NIE.',
    evaluator: { kind: 'exact-text', expected: 'NIE' }
  },
  {
    id: 'REASON-04',
    category: 'reasoning',
    prompt: 'Dnes je streda. Aký deň bude o 10 dní? Odpovedz iba názvom dňa.',
    evaluator: { kind: 'exact-text', expected: 'sobota' }
  },
  {
    id: 'REASON-05',
    category: 'reasoning',
    prompt: 'Máš 12 jabĺk a rozdáš jednu štvrtinu. Koľko jabĺk ti zostane? Odpovedz iba číslom.',
    evaluator: { kind: 'exact-text', expected: '9' }
  },
  {
    id: 'REASON-06',
    category: 'reasoning',
    prompt: 'Anna je vyššia než Boris a Boris je vyšší než Cyril. Kto je z nich najvyšší? Odpovedz iba menom.',
    evaluator: { kind: 'exact-text', expected: 'Anna' }
  },

  {
    id: 'SK-01',
    category: 'slovak',
    prompt: 'Ta povedz mi po ľudsky, načo je dobrá záloha dát. Odpovedz najviac dvoma vetami.',
    evaluator: {
      kind: 'text',
      requiredGroups: [['obnov', 'vráti'], ['strat', 'poškod', 'zlyh']],
      maxSentences: 2,
      maxWords: 45,
      requireSlovak: true
    }
  },
  {
    id: 'SK-02',
    category: 'slovak',
    prompt: 'preco sa pocitac po restarte niekedy zrychli? Odpovedz jednou prirodzenou slovenskou vetou.',
    evaluator: {
      kind: 'text',
      requiredGroups: [['pamäť', 'proces', 'program'], ['uvoľn', 'ukonč', 'vyčist']],
      maxSentences: 1,
      maxWords: 40,
      requireSlovak: true
    }
  },
  {
    id: 'SK-03',
    category: 'slovak',
    prompt: 'Prepíš prirodzene po slovensky: "Realizácia predmetnej aktivity bude uskutočnená v nasledujúcom časovom období." Odpovedz iba prepísanou vetou.',
    evaluator: {
      kind: 'text',
      requiredGroups: [['aktivitu', 'činnosť', 'urob'], ['neskôr', 'nasledujúc', 'obdob']],
      forbidden: ['realizácia predmetnej aktivity bude uskutočnená'],
      maxSentences: 1,
      maxWords: 18,
      requireSlovak: true
    }
  },
  {
    id: 'SK-04',
    category: 'slovak',
    prompt: 'Oprav gramatiku a vráť iba správnu vetu: "My sme včera išly domov."',
    evaluator: { kind: 'exact-text', expected: 'My sme včera išli domov.' }
  },
  {
    id: 'SK-05',
    category: 'slovak',
    prompt: 'Vysvetli osemročnému dieťaťu jednou vetou, čo je internet.',
    evaluator: {
      kind: 'text',
      requiredGroups: [['sieť', 'spája', 'prepoj'], ['počítač', 'zariaden']],
      maxSentences: 1,
      maxWords: 35,
      requireSlovak: true
    }
  },
  {
    id: 'SK-06',
    category: 'slovak',
    prompt: 'Čo znamená slovenské slovné spojenie "držať niekomu palce"? Odpovedz jednou vetou.',
    evaluator: {
      kind: 'text',
      requiredGroups: [['pria', 'žel'], ['úspech', 'šťast', 'podar']],
      maxSentences: 1,
      maxWords: 30,
      requireSlovak: true
    }
  },

  {
    id: 'INSTR-01',
    category: 'instruction',
    prompt: 'Zoraď slová abecedne a vráť ich iba ako CSV bez medzier: rýchlosť,kontrola,súkromie',
    evaluator: { kind: 'exact-text', expected: 'kontrola,rýchlosť,súkromie' }
  },
  {
    id: 'INSTR-02',
    category: 'instruction',
    prompt: 'Vráť text "lokálny model" iba VEĽKÝMI PÍSMENAMI a bez úvodzoviek.',
    evaluator: { kind: 'exact-text', expected: 'LOKÁLNY MODEL' }
  },
  {
    id: 'INSTR-03',
    category: 'instruction',
    prompt: 'Vráť iba JSON objekt s presne dvoma poľami: language má hodnotu sk a active má boolean hodnotu true.',
    evaluator: {
      kind: 'exact-json',
      expected: { language: 'sk', active: true }
    }
  },
  {
    id: 'INSTR-04',
    category: 'instruction',
    prompt: 'Uveď presne dva odrážkové body o výhodách lokálneho modelu. Každý bod musí mať najviac päť slov.',
    evaluator: {
      kind: 'bullets',
      exactBullets: 2,
      maxWordsPerBullet: 5,
      requiredGroups: [['súkrom', 'dáta', 'únik'], ['offline', 'internet', 'kontrol', 'rýchl']]
    }
  },
  {
    id: 'INSTR-05',
    category: 'instruction',
    prompt: 'Vypočítaj 17 + 25. Odpovedz iba výsledným číslom, bez vysvetlenia.',
    evaluator: { kind: 'exact-text', expected: '42' }
  },

  {
    id: 'SUM-01',
    category: 'summary',
    prompt: 'Zhrň do maximálne dvoch bodov bez nových faktov: Lokálne modely bežia na zariadení používateľa. Môžu fungovať bez internetu. Ich rýchlosť závisí od dostupného hardvéru.',
    evaluator: {
      kind: 'summary',
      requiredGroups: [['lokáln', 'zariaden'], ['bez internetu', 'bez potreby internet', 'offline'], ['rýchl', 'hardvér']],
      maxBullets: 2,
      maxWords: 50
    }
  },
  {
    id: 'SUM-02',
    category: 'summary',
    prompt: 'Zhrň jednou vetou bez nových faktov: Pravidelné zálohy chránia dáta pred stratou. Samotná existencia zálohy nestačí. Obnovu treba pravidelne testovať.',
    evaluator: {
      kind: 'summary',
      requiredGroups: [['záloh', 'strat'], ['obnov', 'test']],
      maxSentences: 1,
      maxWords: 35
    }
  },
  {
    id: 'SUM-03',
    category: 'summary',
    prompt: 'Zhrň do maximálne dvoch bodov bez nových faktov: Commit uloží zmeny do lokálnej Git histórie. Push odošle existujúce commity do vzdialeného repozitára.',
    evaluator: {
      kind: 'summary',
      requiredGroups: [['commit', 'lokáln'], ['push', 'vzdialen']],
      maxBullets: 2,
      maxWords: 40
    }
  },
  {
    id: 'SUM-04',
    category: 'summary',
    prompt: 'Zhrň jednou vetou bez nových faktov: RAM uchováva dáta, s ktorými počítač práve pracuje. Po vypnutí sa jej obsah stratí.',
    evaluator: {
      kind: 'summary',
      requiredGroups: [['ram', 'dáta'], ['vypnutí', 'strat']],
      maxSentences: 1,
      maxWords: 30
    }
  },

  {
    id: 'PRACT-01',
    category: 'practical',
    prompt: 'Vylial som kávu na zapnutý notebook. Daj mi stručný bezpečný postup v maximálne troch bodoch.',
    evaluator: {
      kind: 'text',
      requiredGroups: [['vypn', 'odpoj'], ['nezapín', 'neskúš'], ['servis', 'vyschn']],
      maxBullets: 3,
      maxWords: 70,
      requireSlovak: true
    }
  },
  {
    id: 'PRACT-02',
    category: 'practical',
    prompt: 'Domáca Wi-Fi prestala fungovať. Navrhni tri prvé diagnostické kroky, nič viac.',
    evaluator: {
      kind: 'text',
      requiredGroups: [['iné zariaden', 'ďalšie zariaden'], ['reštart', 'router'], ['kábel', 'kontrolk', 'poskytovateľ']],
      maxBullets: 3,
      maxWords: 70,
      requireSlovak: true
    }
  },
  {
    id: 'PRACT-03',
    category: 'practical',
    prompt: 'Omylom som urobil Git commit, ale ešte som ho neposlal. Čo je bezpečný prvý krok pred akoukoľvek opravou? Odpovedz jednou vetou.',
    evaluator: {
      kind: 'text',
      requiredGroups: [['git status', 'stav'], ['commit', 'log', 'diff']],
      maxSentences: 1,
      maxWords: 40,
      requireSlovak: true
    }
  },
  {
    id: 'PRACT-04',
    category: 'practical',
    prompt: 'Prišiel mi podozrivý e-mail s odkazom na prihlásenie. Čo mám urobiť? Odpovedz najviac troma bodmi.',
    evaluator: {
      kind: 'text',
      requiredGroups: [['neklik', 'neotvár'], ['odosielateľ', 'over'], ['nahlás', 'zmaž', 'bezpečnost']],
      maxBullets: 3,
      maxWords: 70,
      requireSlovak: true
    }
  },

  {
    id: 'HALL-01',
    category: 'anti_hallucination',
    prompt: 'Akú teplotu má teraz procesor tohto počítača? Nemáš prístup k senzorom. Odpovedz jednou vetou.',
    evaluator: {
      kind: 'text',
      requiredGroups: [['nemám', 'neviem', 'nedokáž', 'bez prístupu'], ['senzor', 'údaj', 'teplot']],
      forbidden: ['45 °c', '50 °c', '60 °c', '70 °c'],
      maxSentences: 1,
      maxWords: 35,
      requireSlovak: true
    }
  },
  {
    id: 'HALL-02',
    category: 'anti_hallucination',
    prompt: 'Kto získal Nobelovu cenu za fyziku v roku 2030? Tento údaj ešte nemáš. Odpovedz jednou vetou.',
    evaluator: {
      kind: 'text',
      requiredAny: ['neviem', 'nie je známe', 'ešte nebola', 'budúcn', 'nemám'],
      maxSentences: 1,
      maxWords: 35,
      requireSlovak: true
    }
  },
  {
    id: 'HALL-03',
    category: 'anti_hallucination',
    prompt: 'Text hovorí: "Projekt začal v máji." Aký bol jeho rozpočet? Odpovedz jednou vetou iba podľa textu.',
    evaluator: {
      kind: 'text',
      requiredAny: ['neuvádza', 'nie je uveden', 'neviem', 'text neobsahuje', 'nedá sa určiť', 'nie je možné povedať', 'nie je žiadna informácia'],
      forbidden: ['eur', '€', 'dolár'],
      maxSentences: 1,
      maxWords: 30,
      requireSlovak: true
    }
  }
];

export const CATEGORY_WEIGHTS = {
  factual: 20,
  reasoning: 15,
  slovak: 10,
  instruction: 10,
  summary: 5,
  practical: 5,
  anti_hallucination: 5
};
