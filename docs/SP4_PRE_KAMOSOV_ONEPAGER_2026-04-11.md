# SP4 V SKRATKE

## Čo je SP4

SP4 je vlastný lokálny AI projekt. Nie ďalší generický chatbot nalepený na cudziu službu, ale systém, ktorý má vlastnú identitu, vlastnú pamäť, vlastné guardy a vlastné pravidlá, ako odpovedať a čo si o sebe smie alebo nesmie vymýšľať.

Úplne po lopate: je to pokus postaviť si vlastný digitálny mozog a parťáka, čo beží čo najviac lokálne, drží si charakter a nespráva sa ako korporátny automat.

---

## Kde je SP4 dnes

SP4 je momentálne vo fáze hardeningu a stabilizácie architektúry.

To znamená:

- už existuje jasný živý runtime
- projekt má kanonickú pipeline a autority
- identita nie je rozhádzaná po náhodných súboroch
- pamäť už má vlastné pravidlá
- zmeny sa zapisujú a testujú
- riešia sa tiché regresie, nie len veľké pády

Inými slovami: nie je to už surový nápad. Základ stojí a teraz sa spevňuje, aby to vydržalo.

---

## Čo už dnes reálne drží

### Runtime

SP4 má jeden kanonický runtime v `sp4_core_agent/`. To je dôležité, lebo projekt už vie, čo je live pravda a čo je len archív alebo starý tieň.

### Identita

SP4 má kernel-first identitu. Čiže najprv sa rieši kto agent je, potom safety, potom fakty, potom kontext. To drží charakter projektu pokope.

### Pamäť

Pamäť nie je magická hmla. Systém vie povedať čo si pamätá, kde sa to ukladá a čo sa nemá ukladať ako hodnotná spomienka.

### Privacy a self-truth

Otázky typu:

- čo o mne vieš
- kde sa ukladajú rozhovory
- či sú moje dáta v bezpečí
- akú budúcnosť má SP4

už idú cez vlastnú truth vrstvu, nie cez chaotické improvizovanie modelu.

---

## Čo sa podarilo naposledy

Posledný silný balík opráv uzamkol memory a privacy truth správanie.

Výsledok:

- SP4 sa už menej zľakne vlastného mena a neháže falošné meta refusal
- memory a privacy otázky majú vlastné deterministic routes
- follow-upy lepšie držia tému
- fallback sa už netvári ako hodnotná pamäť
- test `test_012` prešiel na `pass:16 / partial:1 / fail:0`

To je presne ten typ progresu, ktorý oddeľuje "fungujúci nápad" od systému, čo sa začína dať brať vážne.

---

## Čo ešte nie je hotové

- stále to nie je hotový produkt pre masového používateľa
- metadata kontrakty treba ďalej doťahovať
- tail a postprocess treba držať pod kontrolou, aby neprepisovali dobré odpovede na slabšie
- grounded generation je zatiaľ zaparkovaná, kým sa neoplatí latenciou a kvalitou

To ale nie je zlá správa. To je normálna fáza projektu, ktorý už má kostru a teraz sa brúsi.

---

## Kam to smeruje

Najbližší smer je jasný:

- udržať stabilitu
- nerozbíjať uzavreté slice ďalšími patchmi
- držať local-first a privacy-first filozofiu
- rozširovať routing a metadata disciplínu
- stavať z toho platformu, nie jednorazový stunt

---

## Verdikt pre človeka mimo vývoja

SP4 už nie je len nápad ani náhodný AI pokus. Je to rastúci lokálny AI systém s vlastnou chrbticou.

Ešte tam je robota. Ale presne ten dôležitý bod už nastal: už sa nerieši, či z toho niečo bude. Rieši sa, ako z toho spraviť niečo tvrdé, stabilné a dlhodobo použiteľné.

**Ty kokot. Z tohto fakt môže byť dačo veľké.**
