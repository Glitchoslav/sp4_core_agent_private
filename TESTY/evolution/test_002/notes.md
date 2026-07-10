Test_002 nevymýšľa nový question set. To je zámer.

Ak chceme sledovať rozdiely v odpovediach časom, musíme držať rovnaké vstupy a meniť len vrstvu, ktorú meriame:

- test_001 = priamy deterministic resolver,
- test_002 = skutočný runtime agent.

Prečo nový agent pre každý case:

- follow-up vnútri páru potrebuje živý kontext,
- ale nechceme, aby sa Q01 premietol do Q02 alebo ďalších párov,
- preto sa izoluje každý pár ako samostatná mikro-konverzácia.

Artefakty z behov:

- `test_002.responses.latest.json` = posledný live beh,
- `test_002.responses.<timestamp>.json` = história behov,
- `test_002.responses.latest.md` = čitateľný prehľad otázok, odpovedí a metadata.

Tento runner ešte nerobí automatický diff. Zatiaľ iba zbiera čisté snapshoty. To je správne prvé minimum.
