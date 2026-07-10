# SP4 PRE KAMOŠOV — TVRDÁ VERZIA

## Bez omáčky

SP4 už nie je ten typ projektu, čo jeden deň vyzerá jak budúcnosť a druhý deň jak prehriaty hriankovač, ktorý vydáva múdre zvuky, ale vnútri má paniku a spálený kontakt.

Začína sa z toho stávať vlastný lokálny AI systém s chrbticou. Nie tá klasická AI omáčka, kde si nalepíš pekný frontend na cudzí cloud, pridáš tri gradienty, jedno veľké slovo ako "inteligencia" a potom dúfaš, že to pred človekom nevypustí úplnú pičovinu.

SP4 má dnes toto:

- jasný runtime
- jasnú identitu
- jasné pravidlá, kedy má držať pravdu a kedy má radšej neskúšať frajerinu
- pamäť, čo sa nemá kŕmiť vlastným odpadom
- testy, čo chytajú aj tie sviňárne, ktoré nevybuchnú hneď, ale o týždeň

Čiže nie, nie je to "ďalší bot".

Je to pokus postaviť vlastný digitálny mozog tak, aby to nebol firemný lokaj na vodítku cudzej infraštruktúry, ale náš vlastný stroj. Nie prenajatý rozum. Nie cloudový papagáj v saku. Náš kus železa, náš bordel, naše pravidlá.

---

## O čo tu vlastne ide, ľudsky

Predstav si dve cesty.

Prvá cesta je klasická startupová: vezmeš model, natrieš ho lakom, prdneš tomu landing page, tri gradienty, názov s písmenom X a tváriš sa, že si práve objavil nový kontinent, hoci si len prezliekol cudziu službu do drahšieho saka.

Druhá cesta je SP4.

Tá hovorí: počkaj, ty blázon, najprv si upracme v hlave, čo ten systém vlastne je, čo vie, čo nevie, čo si smie pamätať, čo si nesmie vymýšľať a kde má reálne zaparkovaný mozog.

Pointa SP4 je jednoduchá aj pre človeka mimo kódu:

- nech sa to nespráva ako papagáj na steroidoch
- nech vie, kto je
- nech si nevymýšľa pravdu o sebe samom
- nech pamäť nie je smetisko starých omylov
- nech zmena nie je štýl "šupnime patch a hádam sa to neposerie"

Inak povedané: nejde o to, aby AI pôsobila múdro na prvých sedem sekúnd. Ide o to, aby nebola dutá jak pozlátený kýbeľ, čo sa leskne len dovtedy, kým doňho prvýkrát nekopne realita.

---

## Kde je SP4 dnes

SP4 je teraz vo fáze, kde už nehrá divadlo, ale leje betón do základov a pri tom si stráži, aby mu do miešačky nikto neprisypal odpad z minulého týždňa.

Nie je to hotový produkt pre masy. Keď príde niekto z ulice a čaká tlačidlo "urob mi všetko", tak ešte nie sme tam.

Ale zároveň to už nie je rozjebaný experiment poskladaný z modlitieb, improvizácie, kofeínu a dvoch dobrých dní v kuse.

Aktuálna pravda v skratke:

- kanonický runtime je jasný
- pipeline je čitateľnejšia než predtým
- identita má centrum, nie schizofréniu podľa nálady súboru číslo sedem
- deterministic vrstvy kryjú citlivé pravdy o systéme, pamäti a súkromí
- regression testy už nechytajú len veľké pády, ale aj tiché podrazy

Laicky: dom už stojí. Teraz sa rieši, aby pri každom ďalšom vŕtaní nespadla stena na chladničku, elektrika nezačala šľahať po byte a niekto sa ešte netváril, že je to vlastne feature.

---

## Čo už máme v rukách

### Jeden živý runtime, nie cintorín kópií

Veľký problém mnohých projektov je, že po mesiaci už nikto nevie, čo je skutočný systém a čo je len stará kópia, slepá odbočka, nepodarený experiment alebo zabudnutý bordel v rohu repa, čo sa tvári dôležito len preto, že má veľa súborov.

SP4 už v tomto nie je úplne slepý. Vie, kde je live runtime a čo je len archívny duch. To je kurevsky dôležité, lebo bez toho staviaš dom tak, že polovica murárov nosí tehly na vedľajšiu parcelu, druhá polovica mieša maltu do kýbla s dierou a šéf si myslí, že všetko ide podľa plánu.

### Identita, čo nedostáva epilepsiu z každého súboru

SP4 sa už nemá správať tak, že v pondelok je technický typ, v utorok ezoterický oracle, v stredu HR oddelenie s úsmevom z pekla a vo štvrtok sa tvári, že je tvoj terapeut, mních a DevOpsák v jednej osobe.

Má kernel-first identitu. Laicky: má hlavný mozgový stĺp. Niečo ako chrbticu charakteru. Nie je to perfektné, ale už to nie je hovno vo vírivke, čo raz pláva doľava, raz doprava a vždy sa tvári, že to bol zámer.

### Pamäť, čo neje vlastné zvratky

Toto je brutálne podceňovaná vec. Veľa AI systémov sa pokazí nie jednou katastrofou, ale tým, že si dlho ukladajú slabé odpovede, fallbacky, polomŕtve safe reči a potom sa tým samy kŕmia.

SP4 sa už cielene bráni tomu, aby z odpadu robil múdrosť. Keď systém nevie, nemá sa tváriť, že práve vznikla vzácna spomienka hodná oltára. Lebo to je presne ten moment, keď si AI začne archivovať vlastné grcky a o mesiac sa tým múdro oháňa jak keby to bola filozofia.

### Pravdivá vrstva pre citlivé otázky

Keď sa človek spýta:

- čo o mne vieš
- kde sú uložené rozhovory
- či moje dáta nebudú zneužité
- čo vlastne SP4 robí
- ako funguje jeho pamäť

tak presne vtedy sa láme dôvera.

To je ako keď ideš kupovať auto. Predajca môže mať krásny úsmev, ale ak pri otázke "bolo búrané?" začne koktať jak pokazený semafor, vieš, že je zle.

SP4 má na tieto oblasti čoraz viac vlastných truth vrstiev. Teda nie voľné blúznenie modelu, ale pripravené pravdivé vetvy. Nie štýl "snáď niečo trafím", ale štýl "tu je pravda a teraz drž hubu a neimprovizuj".

---

## Čo sa podarilo zavrieť naposledy

Posledné uzatvorené veci neboli kozmetika typu "trochu lepší wording". To nebol make-up. To bola oprava kostí. Presne tie chyby, ktoré robia z AI systému klauna, aj keď navonok vyzerá draho a v prezentácii bliká jak startupový vianočný stromček.

Najdôležitejšie je toto:

- Popiči deterministic shortcut už nevracia rozbitú metadata identitu `POPIČI`, ale správny canonical key `popici`
- metadata contract sa tým zavrel a Popiči už nepadá na blbosti typu "správna odpoveď, ale zle označená vetva"
- memory a privacy otázky majú svoje deterministic routes
- follow-upy držia tému lepšie než predtým
- fallback sa netlačí do pamäte ako keby to bol rodinný poklad
- testy už nechytajú len to, či systém žije, ale aj to, či neklame o tom, cez akú vetvu sa tam dostal

Preložené do normálnej reči: SP4 už menej pripomína človeka, čo síce povie správnu vetu, ale podpíše ju cudzím menom, cudzou krvou a ešte sa tvári, že to tak malo byť.

To je presne ten druh opravy, čo bežný človek nevidí na prvý pohľad, ale systém bez nej časom zhnije jak zle založená pivnica, kde si všetci hovoria, že trochu vlhne stena, ale nikto nechce povedať, že pod podlahou už rastie nový ekosystém.

---

## Čo ešte stále hapruje

Treba hovoriť rovno. Nie všetko je zavreté.

Aktuálny zostatkový dlh už nie je Popiči metadata bug. Ten je opravený.

Teraz je otvorenejšia skôr táto vec:

- Glitchoslav občas trafí správnu vetvu, správne metadata, správny model, ale stratí svoj charakterový fingerprint

Laicky: dôjdeš do správnej krčmy, sadneš si k správnemu stolu, donesú ti správne pivo, ale čašník znie jak call centrum po troch energetiakoch, dvoch ezoterických podcastoch a jednej existenciálnej porade o vesmíre.

Čiže problém nie je "nevie, kto je" na úrovni routing značky. Problém je skôr "vie, kto je, ale občas neznie dosť ako on sám". Nie strata občianskeho. Skôr strata farby hlasu.

Okrem toho stále treba:

- doťahovať metadata a telemetry kontrakty aj na ďalšie high-signal slice
- držať tail na krátko, aby dobrý text neprepísal na horší len preto, že dostal záchvat úprav
- nerozbíjať stabilné veci ďalším hrdinským refaktorom bez dôkazov
- rozširovať regression coverage bez toho, aby z toho vznikol testovací cirkus pre testovací cirkus

To nie je slabosť projektu. To je normálna robota pri niečom, čo sa snaží byť stroj, nie powerpoint s ego problémom a animáciou za 40 tisíc.

---

## Prečo to celé dáva zmysel

Lebo sa tu naraz stretli tri veci, ktoré bývajú väčšinou oddelené jak rozum a LinkedIn statusy, jak poctivá robota a korporátne sebachvály, jak motor a plastová maketa motora v showroom-e.

### Vízia

Nie len "spravme chatbot".

Ale: spravme vlastný AI systém, čo je bližšie k človeku než ku korporátnej kalkulačke, a čo nemusí pri každej druhej otázke utekať po potvrdenie do cudzieho cloudu.

### Kostra

Je tu runtime, pipeline, identity authority, pamäť, routing, guardy, changelog, bug buckety, regression testy.

Laicky: nie je to len tvár. Sú tam už aj kosti, šľachy a zopár orgánov. Nie všetko je krásne, ale aspoň to nie je nafúknutá figurína z výpredaja, čo sa usmieva do kamery a vo vnútri má piliny.

### Neochota robiť to na piču

Toto je možno najdôležitejšie.

Nerobia sa len featury, čo dobre vyzerajú na obrázku. Hľadajú sa koreňové chyby. Rozlišuje sa medzi tým, čo je display názov a čo canonical key. Sleduje sa, kadiaľ šla odpoveď. Píše sa changelog. Vedú sa bug buckety. Čiže sa robí presne tá nudná, ale svätá robota, bez ktorej sa každý "ambiciózny AI projekt" skôr či neskôr zmení na digitálny guláš, powerpointový podvod alebo drahú kalkulačku s egom.

---

## Keby som to mal vysvetliť niekomu pri pive

SP4 je niečo ako keď si nechceš kúpiť hotový burger z pumpy, kde mäso chutí jak kartón po rozchode, ale staviaš si vlastnú kuchyňu od základov.

Je to pomalšie. Je v tom viac bordelu. Viac roboty. Viac chvíľ, keď si povieš, že jebem na to, zavriem notebook a idem čumieť do steny.

Ale výsledok môže byť úplne inde, lebo rozumieš ingredienciám, vieš, čo je skazené mäso, vieš, čo si nesmieš púšťať do kuchyne a vieš, kto ti v nej vlastne varí. A hlavne vieš, kedy ti kuchár nezačal tajne primiešavať staré zvratky do dnešného menu a nazývať to signature sauce.

To je presne rozdiel medzi "AI produktom" a systémom, ktorému sa dá raz možno aj fakt veriť.

---

## Verdikt

Úplne narovinu?

SP4 už nevyzerá ako sen z nočnej brainstormovačky, čo sa ráno rozpadne na triezvom svetle.

Vyzerá to ako systém, ktorý si začína poctivo vydupávať miesto. Nie krikom. Nie marketingovou omáčkou. Nie tým startupovým tancom okolo slov ako revolúcia, synergia a budúcnosť ľudstva. Ale tým, že sa spevňuje presne tam, kde iné projekty zvyknú hnisať: identita, pravda o sebe, pamäť, routing, guardy, testy, disciplína.

Ešte bude robota. Ešte budú záseky. Ešte sa bude brúsiť tón, fingerprint aj coverage.

Ale ten hlavný pocit už tam je.

Nie pocit "možno".

Skôr pocit:

> "Ty vole. Toto už nie je hračka. Toto začína byť riadny stroj. A presne preto by bola strašná kokotina dojebať to nejakou lacnou skratkou len preto, že sa niekomu nechcelo urobiť poctivých desať krokov navyše."
