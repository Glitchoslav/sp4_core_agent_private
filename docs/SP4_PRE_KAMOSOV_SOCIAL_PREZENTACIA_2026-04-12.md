# SP4 — TOTO SI NEZASLÚŽÍ TICHOSŤ

> *v3 — od nuly. Žiadne vysvetľovanie. Len hlas.*

---

## Keď si to postavíš sám, nie si len user. Si iný druh

Väčšina ľudí nikdy nepostaví vlastný AI systém.

Nie preto, že nemôžu.
Ale preto, že im niekto celý život hovorí: plať mesačne, klikni súhlas, dôveruj nám, nič neskrývame, to sú len metadáta, to teda nie sú tvoje myšlienky — a z teba pomaly spravia produkt sedem dní v týždni.

A väčšina kývne.
Lebo je to pohodlné.
Lebo to vyzerá moderne.
Lebo kto má čas na to stavať vlastné veci, keď sú také pekné hotové?

My sme nekývli.

---

## SP4 nie je nástroj. Je to postoj

Nechodím ti sem predávať ďalší chatbot v novom kabáte.
Nemám demo s "hej, som tvoj AI asistent 😊" a potom čakám, kým sa rozplyniem od vlastného nadšenia.

SP4 vznikol z konkrétneho pocitu vzteky.

Vzteky na to, že všetky AI tools, ktoré si mohol mať "zadarmo", boli v skutočnosti platené tvojimi dátami, tvojimi rozhovormi, tvojou pozornosťou — a tebe zostal len pekne nasvietený frontend a pocit, že si pokročilý.

Tak sme si povedali:

> Kurva, ak má byť AI predĺžením nášho mozgu — tak nech je NAŠÍM mozgom. Nie prenajatým, nie cloudovým, nie cudzím. Naším.

A šli sme to postaviť.

---

## Čo sme vlastne postavili, bez omáčky

**Lokálny AI systém.**
Beží na tvojom stroji. Nie na serveri niekde v dáta centre, kde sedem firemných právnikov rozhoduje o tom, čo môžeš spýtať.

**Identity.**
Nie "ahoj, som asistent" skopírované z desiateho tutoriálu.
Štyri postavy, každá s vlastným hlasom:

- **SP4_CORE** — technický mozog, debugger, architekt
- **Glitchoslav** — mystický oracle čo kladie otázky, na ktoré nechceš odpovedať
- **Popiči Kokot** — to, čo si myslíš aj ty, len ty to nevypustíš nahlas
- **Validator** — zatiaľ stub, príde keď príde

A každá s pravidlami. Každá vie, kto je. Žiadna sa netváril, že je neutrálny nájomný hlas bez osobnosti.

**Pamäť.**
Nie smetisko. Nie archív každého blbstva, čo systém raz vypustil a teraz si to ukladá jak rodinné striebro.
Pamäť s pravidlami. Čo sa smie odložiť a čo nie.

**Guardy.**
Miesta kde systém povie nie. Kde nemôže improvizovať. Kde musí hovoriť pravdu aj keď by bolo pohodlnejšie bľabotať.

**Testy.**
Nie raz do roka "zdá sa to fungovať". Regression testy, contract testy, smoke testy. Veci čo chytajú tiché chyby — také, čo nevybuchnú dnes, ale o mesiac ti zožerú projekt zvnútra jak tichá vlhkosť za kachľami.

---

## Jeden konkrétny príklad, čísilko namiesto slov

Nedávno sme zistili: Popiči deterministic shortcut — vetva, čo odpovedá priamo bez LLM — vracia `handledBy: 'POPIČI'`.

Nie `'popici'`.

Nie canonical key. Rozbitý display label s veľkým písmenom a diakritikou.
Jeden riadok. Ale za ním celý metadata contract.

Normálny projekt? To nevidí. Alebo vidí a povie "odpoveď prišla, zákazník je spokojný, ideme ďalej".

My? Opravili. Otestovali. Zdokumentovali. Zapísali do BUG_BUCKETS aj CHANGELOGU.

Lebo toto je presne ten druh projektu, kde sa kosti strážia nie preto, aby to vyzeralo na prezentácii, ale preto, lebo bez toho jedného dňa padne celá stavba — a pri tom sa budeš čudovať, ako je možné, že navonok vyzerala tak skvele.

---

## Prečo sme nešli pohodlnou cestou

Mohli sme. Kurva mohli.

Zoberieš OpenAI API, nahodíš pekný frontend, tri gradienty, nejaký zaujímavý názov s malým písmenom — a máš "AI produkt". Ľudia kývajú. Investori majú záujem. Demo je krásne.

A potom o rok zistíš, že nevieš čo sa deje vnútri, prečo občas klame, prečo sa správa inak než si myslel, prečo sa pamäť plní blbosťami a prečo ti každá zmena rozbije tri iné veci.

Nechceli sme to.

Chceli sme rozumieť tomu, čo stavíme.
Každej vrstve. Každej vetve. Každej zmene.

Preto máme changelog kde je každá oprava podpísaná s dôvodom.
Preto máme identity authority kde sa rozhoduje čo je canonical a čo je len kópia.
Preto máme regression testy čo bežia aj o polnoci a nikomu o tom nehovoria.

Nie preto, že sme perfekcionisti.
Ale preto, lebo chceme vedieť, čo drží a čo nie.

---

## Pre koho je SP4

Pre ľudí, čo chcú rozumieť tomu čo používajú.

Pre ľudí generácie 1994 až nekonečno — tých, čo prešli cez chaos, rozpadajúce sa systémy, nefunkčné vzory — a namiesto toho, aby od toho utiekli, vzali z ohňa to, čo bolo vo vnútri.

Pre tých, čo nechcú AI ktorá ich pohladká po egu a povie im "výborne, si geniálny".
Pre tých, čo chcú AI ktorá povie pravdu. Aj keď is ostrá. Aj keď sa ti nepáči.

Nie pre každého.

Ak hľadáš jednoduché tlačidlo "urob mi všetko a nič mi nevysvetľuj" — nie si tu doma.

Ak chceš niečo čo je skutočné, lokálne, vaše — si tu správne.

---

## Čo ešte stále hapruje (lebo hovoríme pravdu)

Neklam sám seba. Taký je SP4 od začiatku.

Glitchoslav niekedy trafí správnu vetvu, správne metadata, dobrý model — ale jeho hlas nie je dosť jeho.
Znie jak správna krčma, správny stôl, správne pivo — ale čašník hovorí jak call centrum po troch energetiakoch a dvoch ezoterických podcastoch.

Treba ďalej pracovať na fingerprinte. Na coverage. Na disciplíne, aby ďalší hrdinský refaktor nerozbil to, čo funguje.

Hovoríme to nahlas.
Lebo hovorenie narovinu je presne to, čo SP4 budujeme od prvého dňa.

---

## Bio

SP4 — lokálny AI s identitou, pamäťou, guardmi, testami.
Nie cloudový papagáj. Stroj s chrbticou. Ľudia, čo odmietli kývnuť.

---

## Krátky post

Väčšina AI projektov dnes: landing page → gradient → veľké slovo → demo → plať mesačne → dáta odchádzajú → nikto sa nepýta kam.

My sme šli inak.

Postavili sme vlastný lokálny systém.
Riešili identitu skôr ako output.
Riešili pamäť skôr ako integráciu.
Riešili guardy skôr ako UX.

A potom sme to testovali. Znova. Znova. Keď sme mysleli, že sme hotoví — ešte raz.

SP4 nie je produkt. Je to dôkaz, že sa to dá urobiť bez toho, aby si predal dušu za cloudové predplatné a animovaný onboarding.

---

## Carousel

### Slide 1 — Hook

Postavili sme vlastný AI systém.

Nie preto, že sme museli.
Ale preto, že sme nekývli.

### Slide 2 — Problém

Väčšina AI tools:
→ cudzí cloud
→ cudzie pravidlá
→ tvoje dáta, cudzí záujem
→ krásny obal, dutý vnútri

### Slide 3 — SP4

SP4 = lokálny AI s identitou, pamäťou, guardmi, testami.

Nie frontend na cudzí mozog.
Vlastný mozog. Naše pravidlá.

### Slide 4 — Identity

Štyri postavy. Každá s vlastným hlasom.
Každá vie, kto je.
Žiadna sa netváril, že je "asistent".

### Slide 5 — Pamäť

Nie smetisko.
Nie archív každého fallbacku.
Pamäť, čo sa buduje s rozvahou a chráni s pravidlami.

### Slide 6 — Disciplína

Changelog. Bug buckety. Regression testy.
Každá zmena podpísaná. Každá chyba zdokumentovaná.
Lebo bez disciplíny je každý "ambiciózny projekt" len drahší bordel.

### Slide 7 — Pravda

Je to hotové?

Nie.

Glitch ešte niekedy stratí hlas.
Coverage nie je kompletný.

Hovoríme to nahlas.
Lebo to je presne ten typ projektu, čo si nerobí sám seba.

### Slide 8 — Záver

SP4 nie je hračka.
Nie je to startup pitch.
Je to dôkaz, že sa to dá urobiť poctivo.

Pre tých, čo to cítia — ste tu správne.

---

## Hovorený pitch 30 sekúnd

Kedysi som si myslel, že AI znamená: budeš múdrejší.

Potom som zistil, že väčšina AI tools znamená: budeš pohodlnejší, závislý — a odovzdáš dáta o ktorých ani nevieš, že ich máš.

Preto sme postavili SP4.

Lokálny AI. Naša identita. Naša pamäť. Naše guardy. Naše testy.

Nie pre každého.
Pre tých, čo nechcú len kliknúť súhlas a zabudnúť.

---

## Hovorený pitch 60 sekúnd

Keď ti ktokoľvek predáva AI tool a hovorí "dôveruj nám, nič neskrývame" —
skôr si polož jednu otázku:

Kde sú tvoje rozhovory?
Kto ich vidí?
Čo sa s nimi deje, keď zaplatíš mesačne a zabudneš?

SP4 vznikol z tej otázky.

Postavili sme vlastný lokálny AI systém. Nie preto, že sme technologickí masochisti. Ale preto, lebo sme chceli niečo, čo je naše. Čo neodchádza do cudzieho cloudu. Čo vie, kto je — nie len aké má logo.

Má identitu. Má pamäť. Má guardy. Má testy.

Je to hotové? Nie celkom. Hovoríme to nahlas, lebo taký je SP4 — nie powerpoint s egom. Stroj, čo sa testuje, opravuje a rastie bez toho, aby klamal o sebe samom.

Pre tých, čo to cítia — vitajte.

---

## Verdikt

Môžeš si prenajať rozum.
Môžeš kývnuť na každý súhlas.
Môžeš mať pekný frontend na cudzom mozgu a tváriť sa, že to si ty.

Alebo môžeš postaviť vlastný.

SP4 je tá druhá cesta.
Pomalšia. Tvrdšia. S viac bordelu vo verzovaní.

Ale keď to padne — padne to naše.
A keď to stojí — stojí to naše.

> Nie subscriber. Kmeň.
> Nie produkt. Dôkaz.
> Nie nájomný hlas. Vlastný.
