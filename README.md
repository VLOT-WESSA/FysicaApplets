# FysicaApplets

Interactieve natuurkunde-applets voor het secundair onderwijs (NL). Vanille HTML/JS met canvas,
geen build en geen dependencies buiten React/Babel die `support.js` bij het openen ophaalt.

Start bij `index.html` (portaal). Elke applet is één bestand.

## Repo-indeling

- `index.html` — portaal, startpagina
- `<slug>.dc.html` — één applet per bestand: tegelijk bron en uitgeleverde pagina
- `applet-core.js` — gedeelde canvas-/schaalhelper (resolutie, meeschalen, resize)
- `support.js` — runtime die de pagina's rendert; niet handmatig aanpassen
- `nuclide-data.js` — datatabel voor de nuclidenkaart
- `CLAUDE.md` — conventies, canvasregel en werkwijze bij wijzigingen

## Publiceren

Pushen is publiceren: er zijn geen kopieën en geen bouwstap. GitHub Pages levert `index.html`
als startpagina uit; `support.js`, `applet-core.js`, `nuclide-data.js` en het icoon moeten in
dezelfde map staan.

## Wijzigingen

Lees eerst `CLAUDE.md`. De canvasregel daarin is niet optioneel: hij bepaalt of de tekeningen
scherp blijven op hoge-resolutieschermen.
