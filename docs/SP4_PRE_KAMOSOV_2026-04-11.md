# SP4 PRE KAMOŠOV

## Čo to vlastne je, úplne po lopate

SP4 už nie je iba nápad v hlave ani random chatovací experiment, čo raz trafí a raz si vymyslí pičovinu.

SP4 je vlastný lokálny AI systém. Nie cloudová hračka, nie ďalší generický wrapper na cudziu službu, ale reálny runtime, ktorý má:

- vlastnú identitu
- vlastné pravidlá správania
- vlastnú pamäť
- vlastný routing, čiže rozhodovanie, kadiaľ otázka pôjde
- guardy, ktoré strážia, aby nezačal tárať kokotiny
- testy, ktoré overujú, že sa to celé po ďalšom patchi nerozsype

Keď to poviem úplne sedliacky: SP4 je pokus postaviť si vlastný digitálny mozog a parťáka, čo beží čo najviac lokálne, drží si charakter, nepchá všetko do cloudu a vie sa časom zmeniť z "fungujúceho prototypu" na poriadny systém.

Nie je to startupová omáčka. Je to infra + mozog + osobnosť + disciplína nad tým.

---

## Prečo je to zaujímavé aj pre človeka, čo nečíta kód

Väčšina AI vecí dnes funguje takto:

Ty niečo napíšeš. To odíde niekam dopiče do cudzieho servera. Tam sa to pomelie. Naspäť ti príde odpoveď. Keď sa rozbije identita, pamäť alebo routing, si v piči, lebo tomu nerozumieš a ani to nevlastníš.

SP4 ide opačným smerom.

Myšlienka je:

- čo sa dá, to má bežať lokálne
- identita agenta nemá byť rozliata po desiatich súboroch, ale mať jasnú autoritu
- systém má vedieť povedať pravdu o sebe bez toho, aby z toho robil divadlo
- pamäť a súkromie nemajú byť marketingová veta, ale technické správanie
- každá väčšia zmena má mať test a zápis, aby sa projekt nehýbal ako slepé kurča

Čiže reálne nejde len o "AI odpovedač". Ide o budovanie vlastného lokálneho AI stacku s osobnosťou, smerom a disciplínou.

---

## Kde je SP4 dnes

Najpresnejšie pomenovanie dnešného stavu je toto:

**SP4 je vo fáze hardeningu a stabilizácie architektúry.**

To znamená:

- základ už stojí
- pipeline existuje a je kanonická
- identita, pamäť, routing a guardy už nie sú rozjebané vo voľnom priestore
- testy už nechytajú len veľké pády, ale aj tiché regresie
- projekt ešte nie je "hotový produkt pre masy", ale už to nie je ani garážový chaos bez kostry

Inak povedané: múry už stoja, strecha sa drží, elektrika ide. Teraz sa rieši, aby to nevybuchovalo pri každom novom kábli.

---

## Čo už dnes v SP4 reálne existuje

### 1. Jeden kanonický runtime

Projekt má dnes jasne určené, čo je živý mozog systému a čo je len archív, donor alebo tieňová kópia.

Hlavný runtime žije v:

`sp4_core_agent/`

To je dôležité, lebo keď projekt rastie, bez tejto disciplíny sa stane presne to, čo pozná každý: tri verzie pravdy, päť starých súborov, nikto nevie čo je live a všetko začne hniť.

SP4 toto už dnes rieši cez jasnú autoritu cesty, entrypointu a pipeline.

### 2. Reálna pipeline, nie improvizácia

Keď používateľ niečo napíše, SP4 nejde štýlom "nejako to pošlime modelu a uvidíme".

Má konkrétny tok:

- najprv sa vyhodnotí typ otázky
- potom sa skontrolujú early guardy a špeciálne vetvy
- poskladá sa prompt z identity, safety, factov a kontextu
- rozhodne sa, či to ide lokálne alebo inou vetvou
- po odpovedi ide text cez tail, guardy, language enforcement, grounded kontrolu a writeback

To je presne ten rozdiel medzi hračkou a systémom.

### 3. Identita má autoritu

SP4 nie je len "nejaký AI asistent".

Projekt už má uzamknuté, kde sa mení identita, kde sa mení tón, kde sa mení factual vrstva a kde sú len wrappery. Toto je brutálne dôležité, lebo bez toho začne agent po pár patchoch odpovedať raz ako technik, raz ako filozof, raz ako generický chatbot z korporátu.

SP4 už má kernel-first prístup. Čiže najprv identita, potom safety, potom fakty, potom kontext, potom flavor. Nie naopak.

### 4. Pamäť už nie je random bordel

Pamäť v SP4 nie je magická hmla. Má svoju vrstvu, svoju štruktúru a svoje pravidlá.

Projekt dnes vie povedať:

- čo si pamätá
- odkiaľ to vie
- kde sa to ukladá
- čo do pamäte nemá ísť ako hodnotná spomienka

Obzvlášť dôležité je, že fallbackové alebo guardové odpovede sa už nemajú tváriť ako kvalitná pamäť na ďalšie vyťahovanie. To je vec, ktorú veľa systémov pokašle a potom sa samy učia z vlastných omylov.

### 5. Privacy a self-truth už idú cez vlastnú pravdivú vrstvu

Toto je jedna z najsilnejších vecí poslednej fázy.

Keď sa SP4 pýtaš na veci typu:

- čo o mne vieš
- kde sa ukladajú rozhovory
- či sú moje dáta v bezpečí
- koľko ľudí používa SP4
- akú budúcnosť má SP4

tak to už nemá padať do chaotického voľného LLM flow. Má to ísť cez deterministic truth routes, čiže cez vlastnú grounded vrstvu faktov.

Preložené do ľudskej reči: SP4 už pri otázkach o sebe, pamäti a súkromí nemá panikáriť pred vlastným guardom, ale má odpovedať ako systém, ktorý vie čo robí.

---

## Čo sa podarilo uzamknúť v posledných patchoch

Posledné dni neboli o kozmetike. Boli o tom, aby sa zatvorili reálne trápne chyby, ktoré by v živom používaní pôsobili ako: "aha, takže celé je to len ďalší AI bordel".

Podarilo sa hlavne toto:

### SP4 sa už menej zľakne vlastného mena

Bol bug, kde prefix typu `SP4_CORE:` mohol spustiť falošný meta leak guard, akoby systém prezrádzal interné promptovanie. Výsledok bol, že legitímna odpoveď vedela dostať safe refusal, aj keď bola správna.

To je presne ten typ chyby, pri ktorej si človek povie: "ty kokot, veď sa bojíš vlastného tieňa".

Toto je opravené.

### Privacy a memory otázky už majú vlastné trasy

Namiesto toho, aby model improvizoval, pribudli konkrétne deterministic routes a facts pre:

- user profile
- privacy commitment
- memory location
- future direction
- user count

Čiže systém už nemá dôvod halucinovať okolo vlastných dát a vlastnej reality.

### Follow-upy lepšie držia tému

Keď sa niekto spýta niečo ako "a ako to myslíš?" po privacy alebo memory otázke, systém už vie nadviazať na predchádzajúcu tému, namiesto toho aby sa tváril, že padol z Marsu.

To je veľmi dôležité, lebo práve na follow-upoch sa oddeľuje demo od reálne použiteľného agenta.

### Fallback sa nehrá na múdru pamäť

Keď systém spadne do fallbacku alebo refusal, už sa to nemá zapisovať ako hodnotná vec na budúce vyťahovanie. Toto je tichá, ale brutálne dôležitá oprava.

Bez nej by si systém pomaly zanesol vlastnú pamäť odpadom.

---

## Aký je aktuálny progres, bez marketingu

Keby to mám zhrnúť brutálne úprimne, tak stav je asi takýto:

### Čo už je silné

- projekt má kanonický runtime a jasnú architektúru
- identita je oveľa stabilnejšia než predtým
- veľká časť deterministic truth odpovedí je uzamknutá testami
- smalltalk, offline/local-first, origin facts, memory phrasing a viac follow-up rodín je zavretých alebo stabilných
- privacy a memory truth slice prešiel cieleným regression testom
- changelog, authority mapy a bug buckety už nie sú len ozdoba, ale reálna prevádzková disciplína

### Čo ešte nie je finálny stav

- stále to nie je hotový masový produkt pre bežného človeka, čo klikne a ide
- tail a postprocess vrstva sú silné, ale treba ich ďalej držať na krátko, aby neprepisovali dobrý text na horší
- metadata kontrakty treba ešte rozširovať, aby sa vedelo chytiť aj to, keď je text síce dobrý, ale prišiel zlou vetvou
- grounded generation je zatiaľ zaparkovaná, lebo latencia a kvalita ešte nevracajú investovaný čas

Čiže pravda je takáto:

SP4 už nie je "či z toho niečo bude".

SP4 je teraz v bode "ako z toho spraviť niečo tvrdé, spoľahlivé a dlhodobo použiteľné".

To je úplne iný level problému. A to je dobrá správa.

---

## V akej fáze je projekt mentálne a technicky

Ak by som to mal pomenovať jednou vetou:

**SP4 je v prechode z odvážneho experimentu na disciplinovaný systém.**

To znamená, že už sa nerieši len:

- či vie odpovedať
- či má osobnosť
- či vôbec beží

Ale rieši sa:

- či vie držať pravdu o sebe
- či si nenaserie do vlastnej pamäte
- či sa nerozbije po ďalšom patchi
- či máš autoritu nad tým, čo sa kde mení
- či z toho vie vzniknúť niečo, na čom sa dá stavať roky

Presne toto je tá fáza, kde veľa projektov skapína, lebo ich prestane baviť disciplína.

SP4 sa práve tu začína lámať na niečo seriózne.

---

## Kam to smeruje

Budúcnosť SP4 dnes nie je o tom, že sa tam nalepí sto nových feature a bude sa hrať na sci-fi boha.

Najbližší rozumný smer je:

### 1. Udržať stabilitu

To znamená držať must-pass gate pack zelený a neotvárať uzavreté problémy len preto, že pribudne nový patch inde.

Inými slovami: čo už funguje, to sa nesmie rozjebať.

### 2. Doraziť metadata a routing kontrakty

Systém má vedieť nielen dať správnu odpoveď, ale aj vedieť preukázať, že na ňu išiel správnou cestou.

To je extrémne dôležité, ak z toho má byť dôveryhodný systém a nie len efektne hovoriaca krabička.

### 3. Držať local-first a privacy-first filozofiu

Toto je jedna z identít projektu. Nie ozdoba. Nie slogan. Ak SP4 pustí cloud, má to byť vedomé, kontrolované a nie automatická slabosť systému.

### 4. Zvyšovať použiteľnosť bez straty charakteru

SP4 má mať osobnosť, ale nesmie sa roztekať do teatrálnosti. Má byť živý, ostrý a vlastný, ale zároveň technicky spoľahlivý.

### 5. Postaviť z toho platformu, nie jednorazový stunt

Cieľ nie je len "pozri, aký zaujímavý bot".

Cieľ je mať vlastný systém, ktorý vie rásť cez ďalšie vrstvy: lepšia práca s pamäťou, lepšie kontextové rozhodovanie, lepšie guardy, lepšie vysvetľovanie, možno časom aj ďalšie rozumné režimy a rozhrania.

---

## Prečo z toho fakt môže byť niečo veľké

Lebo sú tu tri veci naraz, a to nebýva bežné:

### Vízia

Projekt nemá len technický cieľ, ale aj jasnú filozofiu: vlastný digitálny spojenec, čo je bližšie k človeku než ku korporátnemu dashboardu.

### Kostra

Nie je to už len text a sny. Je tu runtime, pipeline, testovanie, changelog, authority mapa, memory vrstva, deterministic truth routing, guardy a disciplína.

### Vôľa to nepodrbať lacno

Najväčší rozdiel nie je v tom, že SP4 už dnes vie všetko.

Najväčší rozdiel je v tom, že sa neopravuje len povrch. Hľadajú sa koreňové chyby. Zavádza sa autorita. Zapisujú sa zmeny. Merajú sa regresie. To je presne to, čo zo zaujímavej hračky robí základ systému.

---

## Brutálne úprimný záver

Ak by som to mal povedať tak, aby si to prečítal aj človek mimo vývoja a zacítil, že tu je energia, tak asi takto:

SP4 už nie je v stave, že sa pýta, či existuje.

SP4 je v stave, kde si začína vydupávať vlastný charakter, vlastné pravidlá a vlastnú technickú chrbticu.

Ešte to nie je finálny monšter stroj. Ešte tam je robota. Ešte bude kopec brúsenia, testov a uzatvárania slabých miest.

Ale už to má presne ten typ progresu, pri ktorom si normálny človek povie:

**"Ty kokot. Toto už nie je len nápad. Z tohto fakt môže byť dačo veľké."**

---

## Jedna veta na úplný koniec

SP4 je dnes živý, lokálny, čoraz disciplinovanejší AI projekt s vlastnou identitou a rastúcou technickou chrbticou — a najdôležitejšie je, že už nezačína od nuly, ale z bodu, kde sa dá reálne stavať ďalej.
