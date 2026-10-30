# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Leraar fysica (en informatica) op de beamer**: demonstreert en bespreekt een simulatie klassikaal tijdens de les. Alles moet van achteraan in het lokaal leesbaar zijn.
- **Leerlingen van het 5de en 6de jaar secundair in de klas**: werken zelfstandig of in duo's op een Chromebook of laptop aan een opdracht of practicum, met de simulatie als meetinstrument.
- **Dezelfde leerlingen thuis**: herhalen, oefenen of werken opdrachten af buiten de les.

## Product Purpose

Een verzameling interactieve natuurkunde- en informatica-simulaties ("applets") die abstracte fysica zichtbaar en meetbaar maken: elektriciteit, elektromagnetisme, kernfysica, mechanica, trillingen en golven, en informatica. Leerlingen kunnen parameters variëren, waarnemen, meten en verbanden ontdekken; de leraar kan hetzelfde klassikaal tonen. Succes betekent dat een leerling na het gebruik het fysische verband begrijpt en het in een verslag of oefening kan toepassen.

## Positioning

Zelfgemaakt door de eigen leraar, op maat van het Vlaamse leerplan van het 5de en 6de jaar (o.a. 5BCW/6BCW). Notatie, terminologie, symbolen en voorbeelden sluiten aan bij wat in de les gebruikt wordt (bv. F<sub>z</sub>, U = R·I, halveringsdikte), in het Nederlands, zonder de ruis van generieke internationale simulatiesites.

## Operating Context

- Gehost via GitHub Pages vanuit de repository `VLOT-WESSA/FysicaApplets`, vooral voor de eigen klassen van VLOT.
- Wordt ook lokaal geopend (bv. vanuit OneDrive) via `file://`, zonder webserver.
- Gebruikt naast het practicumsjabloon (`Practicumtemplate6BCW.docx`) en een voorbeeldrekenblad (`Voorbeeldgrafiek.xlsx`), die op de overzichtspagina te downloaden zijn.
- De Python-notebook hoort bij de informaticalessen van het 5de en 6de jaar (`notebooks/`).

## Capabilities and Constraints

- Een overzichtspagina (`index.html`) met onderwerpen, zoeken en een kaart per applet; 48 applets als losse `*.dc.html`-pagina's.
- Applets draaien op een eigen runtime (`support.js`, niet handmatig bewerken), met gedeelde helpers in `applet-core.js` en een gedeelde stijl in `applet.css`.
- Typische functies: parameters via schuifregelaars, start/reset van animaties, meten (chronometer, meetpunten, tabellen), grafieken, videoanalyse met eigen video, geluid opnemen via de microfoon, Python uitvoeren in de browser.
- **Moet werken via `file://`**: geen afhankelijkheid van een server, build-stap of back-end.
- **Leerplan is bindend**: inhoud, terminologie en notatie volgen het Vlaamse leerplan van het 5de en 6de jaar.
- Taal: Nederlands (Vlaanderen).
- Gegevens die bewaard worden (bv. notebooks, gekozen onderwerp) blijven in de browser van de gebruiker.
- Kleuren die een fysische grootheid voorstellen (krachten, snelheid, velden, stroom) dragen betekenis en moeten consequent blijven tussen legenda en tekening.

## Brand Commitments

- Naam op de site: "Natuurkunde simulaties".
- Zes onderwerpen met elk een vaste onderwerpkleur, gebruikt op de overzichtspagina en als accentkleur in de applets.
- Elke applet heeft een eigen pictogram (`icons/*.svg`), ook als tabbladicoon.

## Evidence on Hand

- 48 werkende applets, Python-notebookopgaven voor het 5de en 6de jaar (`notebooks/*.ipynb`), het practicumsjabloon en het voorbeeldrekenblad.
- Geen getuigenissen, gebruikscijfers of evaluaties van leerlingen of collega's; die mogen niet verzonnen worden.

## Product Principles

1. **Fysica eerst**: elke visuele keuze dient het zichtbaar maken van een verband; betekenisvolle kleuren, legenda's en eenheden kloppen altijd.
2. **Leesbaar van achteraan in de klas**: wat op de beamer belangrijk is, is groot genoeg en heeft voldoende contrast.
3. **Meten, niet alleen kijken**: leerlingen kunnen zelf waarden aflezen, noteren en vergelijken, zoals in een practicum.
4. **Eén vertrouwd systeem**: alle applets bedienen zich op dezelfde manier, zodat de leerling de fysica leert en niet de interface.
5. **Werkt overal, zonder drempel**: geen login, geen installatie, ook offline vanuit een map.

## Accessibility & Inclusion

- Beamergebruik vraagt groot genoeg lettertype en hoog contrast; tekst haalt minstens WCAG AA.
- Bediening met het toetsenbord en een zichtbare focus, en toegankelijke namen voor knoppen met alleen een symbool.
- Betekenis wordt niet alleen met kleur overgebracht wanneer dat te vermijden is (legenda's, labels, aan/uit-tekst).
