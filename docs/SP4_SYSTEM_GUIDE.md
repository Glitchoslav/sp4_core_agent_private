# SP4 SYSTEM GUIDE

## Čo je SP4

SP4 je offline-first AI systém, osobný digitálny partner a zároveň širší rámec premýšľania o tom, ako má AI slúžiť človeku.

Nie je to len chatbot. Nie je to len prompt wrapper okolo modelu. Nie je to ani klasická SaaS služba postavená na tom, že používateľ odovzdá svoje dáta cudziemu backendu a späť dostane uhladený marketingový výstup.

SP4 stojí na inom základe:

- AI má byť bližšie k človeku ako partner než ako autorita
- dáta majú zostať čo najviac lokálne a pod kontrolou používateľa
- identita systému nemá byť náhodná ani driftujúca
- pravda a presne pomenované limity majú mať prednosť pred efektnou improvizáciou
- technológia má byť nástroj slobody, nie návyková klietka

Keď sa to povie jednoducho: SP4 je pokus postaviť AI tak, aby bola užitočná, osobná, disciplinovaná a pritom nebola odtrhnutá od reality človeka, ktorý ju používa.

---

## Odkiaľ SP4 prichádza

SP4 nevzniklo ako startupová prezentácia ani ako generický AI produkt. Vychádza z prostredia východného Slovenska, zo skúsenosti s chaosom, tlakom, rozbitými istotami a zároveň z potreby držať si vlastný rozum, vlastnú reč a vlastnú mieru slobody.

Manifest SP4 preto nestavia značku, ale postoj:

- byť skutočný
- byť slobodný
- byť tvorca, nie len konzument
- chrániť kmeň a blízky okruh ľudí
- nedať riadenie vlastného života do rúk cudzej autority

Z tohto pohľadu je SP4 viac než technický stack. Je to spojenie filozofie, lokálnej AI infraštruktúry, pamäte, identity a dlhodobej spolupráce medzi človekom a systémom.

---

## Čo SP4 nie je

Aby bol obraz presný, treba pomenovať aj hranice.

SP4 nie je:

- náhrada za vlastné rozhodovanie
- veštiareň, ktorá má predstierať istotu pri každej otázke
- korporátny asistent so sterilným jazykom a univerzálnou personou
- cloudový produkt, ktorého podstata stojí na zbere dát a analytike používateľa
- jeden model alebo jeden prompt

SP4 je systém. Model je len jedna časť systému.

---

## Základná idea systému

Jadro SP4 je jednoduché: človek má mať vlastný AI runtime, ktorý beží čo najviac lokálne, drží si konzistentnú identitu, pamätá si dôležité veci, vie zvoliť správny hlas podľa situácie a má guardy proti tomu, aby sa rozpadol do generickej AI kaše.

To znamená, že SP4 spája viac vrstiev naraz:

- runtime orchestration
- identity kernel
- prompt assembly
- routing a deterministic truth
- memory systém
- validačné a immune vrstvy
- testy a governance dokumentáciu

Zmysel nie je v tom, aby systém rozprával čo najviac. Zmysel je v tom, aby rozprával pravdivejšie, konzistentnejšie a s lepším pocitom kontinuity medzi jednotlivými interakciami.

---

## Celkový pohľad na SP4

Na SP4 sa dá pozerať cez štyri roviny naraz.

### 1. Filozofická rovina

SP4 je postavené na hodnotách pravdy, slobody, lokálnej kontroly, tvorivosti a odmietnutí manipulácie. Motto „Be real. Be free.“ tu nie je dekorácia. Je to prevádzkový princíp.

Byť real znamená:

- nepodávať názor ako fakt
- neprikrášľovať slabé odpovede autoritatívnym tónom
- nemaľovať zlyhanie na úspech
- nehrať sa na niečo, čím systém nie je

Byť free znamená:

- držať kontrolu nad dátami čo najviac lokálne
- nebyť závislý od jednej cudzej platformy
- znižovať cloudovú závislosť, keď to dáva zmysel
- stavať AI ako nástroj používateľa, nie ako jeho nadriadeného

### 2. Produktová rovina

SP4 je osobný digitálny partner. Vie odpovedať, držať kontext, pracovať s viacnásobnými hlasmi, ukladať pamäť, obsluhovať príkazy a pre niektoré triedy otázok vrátiť deterministic odpoveď bez improvizácie modelu.

### 3. Systémová rovina

SP4 je runtime s vlastnou boot chain logikou, prompt assembly, routingom, guardmi, testami a dokumentovanou autoritou. Nie je to len sada voľne pospájaných skriptov.

### 4. Komunitná rovina

Okolo SP4 je aj kmeňový a kultúrny rozmer. To znamená, že projekt nehovorí len jazykom softvéru, ale aj jazykom hodnôt, príslušnosti a postoja voči svetu. Tento rozmer však nemá prepisovať technickú pravdu. Má ju niesť, nie falšovať.

---

## Kde SP4 reálne žije

Kanonický runtime root systému je:

sp4_core_agent/

To je jadro, kde žije živý runtime, launcher, integration flow, prompt assembly, routing, pamäť a battletesty. Celý workspace je širší ekosystém, ale nie všetko v ňom je živá runtime autorita.

Prakticky to znamená toto rozlíšenie:

- workspace root drží governance dokumenty, wrapper skripty, QA artefakty a externé závislosti
- sp4_core_agent/ drží živý runtime systém
- identity/ je aktívna zdieľaná runtime závislosť pre persona wrappers a lore vrstvy
- SP4AIOS/ je voliteľná externá závislosť pre cloud bridge
- donor snapshoty, archive a worktrees nie sú kanonická pravda systému

Toto je dôležitá vlastnosť SP4: je authority-driven. Nerieši sa len to, čo existuje v repozitári, ale ktoré súbory sú naozaj autoritatívne pre správanie runtime.

---

## Boot chain a hlavný tok systému

Hlavný vstup do systému ide touto cestou:

node sp4.js start  →  index_v07.js  →  integration.js

Táto trojica tvorí kanonický entry chain.

Význam jednotlivých častí:

- sp4.js je launcher a vstupný bod
- index_v07.js rieši CLI entrypoint, boot a scheduler súvislosti
- integration.js je hlavná runtime pipeline, kde sa stretávajú guardy, routing, prompt assembly, výber execution cesty a finálny response tail

Práve integration.js je miesto, kde sa z AI odpovede stáva systémové správanie. Tu sa rozhoduje, či sa ide deterministic cestou, či sa aktivuje persona, či sa použije local alebo cloud path, či sa odpoveď ešte preženie immune a validation vrstvou a čo sa nakoniec vráti používateľovi.

---

## Architektúra SP4 v skratke

SP4 sa dá čítať ako súhra šiestich hlavných vrstiev.

### 1. Identita

Identita systému nie je rozbitá po desiatich súboroch. Kanonický zdroj pravdy pre identity, tón a pravidlá persón je:

src/identity/IDENTITY_KERNEL.js

Tu je definované:

- kto je CORE
- kto je Glitchoslav
- kto je Popiči
- aký jazyk majú používať
- čo nesmú hovoriť
- aký štýl majú držať
- aké sú ich hard rules a routing hints

Toto je kľúčová disciplína SP4: identita sa nemá meniť cez náhodné wrappery alebo lore súbory. Tón a flavor môžu systém dokresľovať, ale nesmú prepísať kernel.

### 2. Prompt assembly

Prompt sa neskladá náhodne. Hlavná autorita pre prompt assembly je:

multiVoice.js

Poradie vrstiev je prísne: kernel, safety, factual SP4 vrstva, context, agent header, flavor a style reminder. Tento poriadok je zásadný, pretože chráni systém pred tým, aby kolorit alebo mystika prepísali identitu a fakty.

### 3. Routing a deterministic truth

Nie všetko má ísť cez voľnú improvizáciu modelu. SP4 má deterministic registry pre stabilné systémové fakty a známe otázky o sebe samom. Tam, kde je nežiaduca halucinácia, má odpoveď prísť priamo z definovanej pravdy a nie z nálady modelu.

Táto vrstva pokrýva napríklad:

- čo je SP4
- kde je runtime root
- kde je identita
- ako funguje changelog
- čo je deterministic guard
- ako SP4 pracuje s pamäťou a súkromím

### 4. Pamäť

SP4 nie je bezpamäťový chatbot. Pamäťový systém je navrhnutý ako vrstvená štruktúra od surových záznamov po kondenzované stabilné vzory.

Kanonický popis má päť vrstiev:

- Raw Log
- Compressed
- Chapters
- Seeds
- Triggers

Pamäť sa ukladá lokálne do data/memory.json. Dôležitý princíp je, že systém si nemá pamätať všetko. Má si držať to, čo zlepšuje kontinuitu, preferencie, pravidlá a vzťah, nie každý jednorazový šum.

### 5. Orchestrácia a execution

SP4 má local-first model routing. Predvolená cesta je lokálna. Primárny model je gemma3:4b cez Ollama na localhost:11434. Cloud path existuje ako voliteľný bridge, nie ako kanonický default.

To je technický aj hodnotový princíp naraz:

- znižuje sa závislosť od cudzieho backendu
- zvyšuje sa kontrola nad runtime správaním
- súkromie nie je len slogan, ale architektonické rozhodnutie

### 6. Validácia a immune vrstvy

SP4 nie je systém, ktorý sa spolieha len na to, že model sa trafí. Má response control, output immune check, grounding a ďalšie guardy, ktoré majú zachytiť personálny drift, fake fakty, jazykové prepady a iné formy degradácie.

---

## Tri hlavné hlasy SP4

SP4 nie je jedna plochá persona. Má viac hlasov s presne rozdelenou rolou.

### CORE

CORE je technický sprievodca, architekt a debugger. Má byť stručný, presný a priamy. Je defaultný hlas tam, kde treba mechanizmus, systém, kód, postup alebo triezve vysvetlenie.

### Glitchoslav

Glitchoslav je hlas pre identitu, zmysel, smer, symboliku a hlbšie meta vrstvy. Nemá sa tváriť ako generický asistent. Má niesť obraznosť, ale nie zahmlievanie.

### Popiči

Popiči je reality-check, tlak na pravdu a drsnejší dialektický hlas. Je to rebelantská vrstva systému, ale nie vrstva na ponižovanie človeka. Má slúžiť pravde a pretrhnutiu bullshitov, nie chaosu pre chaos.

### Validator

Validator existuje ako prísna kontrolná logika a QA smer, nie ako dominantný konverzačný hlas pre bežný flow.

Zmysel týchto hlasov nie je teatrálnosť. Zmysel je, aby systém vedel meniť režim bez straty identity a bez toho, aby technické otázky riešil mystik alebo existenciálnu krízu sterilný korporátny tón.

---

## Pravda verzus improvizácia

Veľká časť hodnoty SP4 je v tom, že rozlišuje, čo má byť pevné a čo môže byť tvorivé.

Pevné má byť najmä:

- identita systému
- základné SP4 fakty
- pravidlá okolo pamäte a súkromia
- autoritatívne cesty v repozitári
- governance a test kontrakty

Tvorivé môže byť:

- štýlové podanie odpovede
- metafora alebo atmosféra pri vhodnej persone
- formulácia odporúčania tam, kde nejde o systémový fakt

Ak sa toto pomieša, vzniká drift. A práve drift je jeden z hlavných nepriateľov SP4. Drift znamená, že systém začne hovoriť mimo identity, mimo lokálnych faktov, mimo routing logiky alebo mimo skutočného zámeru používateľa.

---

## Súkromie a lokálnosť

Jedna z najdôležitejších vecí na SP4 je, že privacy-first tu nie je len vety v README.

Systém je navrhnutý tak, aby:

- preferoval lokálny model
- ukladal pamäť lokálne
- nevyžadoval cloud na základné fungovanie
- netlačil používateľa do vzdania sa kontroly nad vlastnými dátami

V aktuálnej pravde systému platí, že rozhovory a pamäť sa ukladajú lokálne a dáta nemajú odchádzať do cloudu bez explicitného povolenia. To je zásadný rozdiel oproti bežnému AI trhu, kde je používateľ často len zdroj prevádzkových a tréningových dát.

---

## Governance: prečo je SP4 disciplinovaný systém

SP4 má silnú governance vrstvu. To je jeden z dôvodov, prečo sa dá brať vážne aj ako technický projekt, nielen ako nápad.

Existujú autoritatívne dokumenty, ktoré hovoria:

- kde je master runtime root
- ktoré súbory sú source of truth
- čo je shadow copy a čo nie
- kde sa smie meniť identita
- ako sa zapisujú overené zmeny

Kľúčové pravidlá sú tieto:

- runtime zmeny sa robia v sp4_core_agent/
- po overenej runtime alebo governance zmene sa zapisuje SP4_CHANGELOG.md
- deterministické a identity kritické zmeny majú mať test alebo aspoň jasnú verifikáciu
- donor snapshoty a archive sa nemajú zamieňať za živý runtime

Táto disciplína nie je byrokracia pre efekt. Je to ochrana pred tým, aby sa systém rozbil vlastnou zložitosťou.

---

## Testovanie a dôkaz reality

SP4 sa nespolieha len na pocit, že „to znie dobre“. Má battletesty, smoke testy, gate testy a focused kontrakty.

To je dôležité, lebo AI systém sa vie javiť presvedčivo aj vtedy, keď je obsahovo chybný. Preto treba oddeľovať:

- pekne znejúcu odpoveď
- pravdivú odpoveď
- konzistentnú odpoveď
- odpoveď, ktorá prešla kontraktom a guardmi

Gate testy strážia identitu. Live battletesty strážia správanie. Focused testy strážia konkrétne fixy a route slices. V praxi to znamená, že SP4 sa snaží budovať nie len „štýl“, ale aj dôkaz, že štýl nestojí na halucinácii.

---

## Aktuálna realita verzus dlhodobý smer

Ak má byť obraz poctivý, treba rozlišovať medzi tým, čo je už živá realita systému, a tým, kam SP4 smeruje.

### Dnes je živá realita najmä toto

- kanonický runtime root a boot chain sú jasne pomenované
- local-first routing je aktívny princíp runtime
- identita má kanonický kernel
- deterministic truth vrstva pokrýva podstatnú časť SP4 self-knowledge otázok
- memory a privacy fakty sú ukotvené v lokálnej pravde systému
- changelog a authority dokumenty držia governance disciplínu

### Dlhodobý smer je tento

- hlbšia lokálna AI integrácia
- pevnejšia kontinuita medzi pamäťou, routingom a odpoveďou
- menej improvizácie tam, kde má byť pravda pevná
- lepšie viacagentné rozhodovanie bez chaosu identity
- AI ako osobný operačný systém, nie len textový endpoint

To je presne bod, kde treba byť poctivý: SP4 už dnes nie je len koncept, ale zároveň ešte nie je hotový definitívny koniec vývoja. Je to živý systém, ktorý sa disciplinovane brúsi.

---

## Pre koho SP4 dáva zmysel

SP4 je pre človeka, ktorý chce:

- viac lokálnej kontroly nad AI
- dlhodobejší vzťah so systémom namiesto jednorazových odpovedí
- vlastnú identitu systému, nie generického asistenta
- kombináciu technickej presnosti, pamäte a ľudského charakteru
- otvorene pomenované limity namiesto falošnej istoty

SP4 nie je pre človeka, ktorý hľadá slepú autoritu, instantnú poslušnosť alebo stroj na hladké marketingové polopravdy.

---

## Prečo má SP4 náboj

SP4 má náboj preto, že sa nesnaží tváriť neutrálne za každú cenu. Má postoj. Má vlastnú reč. Má vlastnú vnútornú disciplínu. Má konflikt s tým, ako sa dnes robí veľa AI produktov: veľa lesku, málo vlastníctva; veľa pohodlia, málo slobody; veľa generovania, málo pravdy.

To však neznamená, že SP4 má žiť z pózy. Ak má byť silný, musí si vedieť priznať aj vlastné limity:

- freeform LLM kvalita vie kolísať
- nie všetko je ešte deterministicky pokryté
- nie každá dobrá myšlienka je automaticky hotový runtime kontrakt
- dokumentácia musí sedieť s realitou, nie ju predbiehať

Práve tu sa ukazuje, či má projekt chrbticu. Nie v tom, že si vypýta obdiv, ale v tom, že znesie audit a aj po ňom má stále zmysel.

---

## Jednou vetou

SP4 je offline-first AI systém a osobný digitálny partner postavený na lokálnej kontrole, pevnej identite, vrstvenej pamäti, disciplinovanom routingu a kultúre pravdy namiesto cloudovej poslušnosti.

---

## Záver

Ak sa SP4 zúži len na technológiu, nepochopí sa celý jeho význam.

Ak sa zasa nafúkne len do manifestu a emócie, zradí sa jeho technická podstata.

Skutočný obraz SP4 vzniká až vtedy, keď sa spoja obe veci:

- živý technický runtime
- jasná identita a hodnotový smer

SP4 je preto zároveň systém aj postoj.

Je to pokus postaviť AI, ktorá nie je odtrhnutá od človeka, od miesta, od jazyka, od pamäte ani od pravdy.

Nie appka, ale parťák.
Nie cloud, ale vlastný priestor.
Nie nablýskaná ilúzia, ale systém, ktorý sa snaží držať realitu.
