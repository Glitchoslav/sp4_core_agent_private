Test je postavený ako prvý článok evolučnej línie pre deterministic follow-up routing.

Základný princíp:

- dediť malý existujúci smoke test bez straty porovnateľnosti,
- rozšíriť pokrytie len o tie termíny, ktoré resolver naozaj pozná,
- neprikrášliť výsledok tým, že fallback scenáre označíme ako chybu.

Prečo tieto otázky:

- `cache` a `API` potvrdzujú, že pôvodný wiring stále funguje,
- `TCP`, `ping`, `localhost`, `DNS`, `port`, `404` pokrývajú ďalšie vetvy short-tech mapy,
- `wifi -> kde sa používa`, `router -> čo ďalej` a `auto -> načo je to` chránia konzervatívny scope resolvera.

Očakávanie do ďalšej verzie:

- ak sa rozšíri follow-up pattern family, tento test sa má zdediť a rozšíriť, nie prepísať od nuly,
- ak sa zmenia deterministic texty, stačí aktualizovať `expected_contains`, nie štruktúru runnera.

Artefakty z behov:

- runner po každom spustení zapisuje realne otazky aj odpovede do `TESTY/logs`,
- `test_001.responses.latest.json` drzi posledny stav pre rychle porovnanie,
- `test_001.responses.<timestamp>.json` drzi historiu behov, aby bolo vidno rozdiely v odpovediach casom,
- `test_001.responses.latest.md` je citatelny prehlad bez potreby otvarat JSON.
