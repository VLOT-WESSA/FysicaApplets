---
name: Natuurkunde simulaties
description: Interactieve fysica-applets in de stijl van een labschrift op ruitjespapier.
colors:
  paper: "#f7f3ea"
  paper-grid: "#e9e2d2"
  card: "#fffdf7"
  stage: "#fbf8f1"
  ink: "#1d2a3a"
  ink-soft: "#3a4757"
  ink-muted: "#4f5b69"
  rule: "#cfc6b3"
  slider-track: "#d6cdb9"
  white: "#ffffff"
  topic-elektriciteit: "oklch(0.64 0.13 75)"
  topic-elektromagnetisme: "oklch(0.64 0.13 150)"
  topic-kernfysica: "oklch(0.64 0.13 28)"
  topic-mechanica: "oklch(0.64 0.13 255)"
  topic-golven: "oklch(0.64 0.13 195)"
  topic-informatica: "oklch(0.64 0.13 300)"
  accent: "oklch(0.50 0.12 var(--h))"
  accent-hover: "oklch(0.44 0.12 var(--h))"
  accent-deep: "oklch(0.48 0.12 var(--h))"
  accent-soft: "oklch(0.95 0.03 var(--h))"
typography:
  display:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "40px"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.2
  title:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.2
  applet-title:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "22px"
    fontWeight: 700
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Atkinson Hyperlegible, IBM Plex Sans, Helvetica, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.45
  body-small:
    fontFamily: "Atkinson Hyperlegible, IBM Plex Sans, Helvetica, Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "12px"
    fontWeight: 600
    letterSpacing: "0.01em"
  value:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "14px"
    fontWeight: 500
  code:
    fontFamily: "JetBrains Mono, IBM Plex Mono, monospace"
    fontSize: "13px"
    fontWeight: 400
rounded:
  mark: "2px"
  sm: "4px"
  track: "6px"
  pill: "999px"
  round: "50%"
spacing:
  xs: "6px"
  sm: "10px"
  md: "12px"
  lg: "14px"
  xl: "18px"
  page: "28px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.white}"
    rounded: "{rounded.sm}"
    height: "40px"
    typography: "{typography.body}"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-secondary:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    height: "40px"
  toggle-on:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.white}"
    rounded: "{rounded.sm}"
  toggle-off:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.sm}"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "14px 16px"
  stage:
    backgroundColor: "{colors.stage}"
    rounded: "{rounded.sm}"
    padding: "8px"
  topic-tab:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.sm}"
    padding: "9px 15px"
  topic-tab-active:
    backgroundColor: "{colors.accent-deep}"
    textColor: "{colors.white}"
  search-input:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    height: "42px"
    width: "300px"
  icon-tile:
    backgroundColor: "{colors.accent-soft}"
    rounded: "{rounded.sm}"
    size: "46px"
---

# Design System: Natuurkunde simulaties

## Overview

**Creative North Star: "Het labschrift"**

De site voelt als het schrift dat een leerling meebrengt naar het practicum: lichtgeel ruitjespapier, inktblauwe pen, figuren netjes omkaderd en elk meetresultaat in een vaste letter genoteerd. De simulatie is de figuur in dat schrift. Alles eromheen (kaarten, knoppen, legenda's) is opgebouwd uit dezelfde drie materialen: papier, inkt en één onderwerpkleur.

De bediening is tastbaar en stevig. Kaarten en knoppen hebben een duidelijke inktrand en een harde, schuine schaduw, zodat ze als echte voorwerpen op het papier liggen. Op de beamer blijft dat leesbaar van achteraan: hoog contrast, een letter die gemaakt is voor leesbaarheid, en geen subtiele grijstinten die op een projector verdwijnen.

De stijl wijst drie dingen uitdrukkelijk af: de generieke AI/SaaS-look (zachte vage schaduwen, grote afgeronde hoeken, beige zonder karakter, één standaard sans-serif), alles wat kinderachtig of cartoonesk aanvoelt voor leerlingen van 16 tot 18 jaar, en donkere neon- of gamingstijlen.

**Key Characteristics:**
- Ruitjespapier (raster van 16 px) als pagina-achtergrond.
- Inktblauw voor tekst, kaders én schaduw; geen zwart.
- Kleine hoeken (4 px), dunne inktrand, harde schaduw zonder vervaging.
- Fraunces voor titels, Atkinson Hyperlegible voor tekst, IBM Plex Mono voor waarden en labels.
- Eén onderwerpkleur per pagina als accent; fysische kleuren hebben vaste betekenis.

## Colors

Een warm papier met inktblauwe tekening, en per onderwerp één heldere kleur die als accent dient.

### Primary
- **Onderwerpaccent** (`accent`): de kleur van primaire knoppen, actieve schakelaars en het bolletje van de schuifregelaar. Wordt per applet afgeleid van de onderwerptint (`--h`), zodat een mechanica-applet blauw is en een elektriciteits-applet oker.
- **Onderwerpaccent, donker** (`accent-deep`): achtergrond van het actieve onderwerptabblad op de overzichtspagina; donker genoeg voor witte tekst.
- **Onderwerpaccent, zacht** (`accent-soft`): achtergrond van de pictogramtegels en van tekstselectie.

### Secondary
- **Onderwerpkleuren** (`topic-*`): de stip naast elk onderwerp en de basis van alle accenten. Elektriciteit oker (75), Elektromagnetisme groen (150), Kernfysica rood (28), Mechanica blauw (255), Trillingen & golven teal (195), Informatica paars (300).

### Neutral
- **Schriftpapier** (`paper`): pagina-achtergrond onder het raster.
- **Ruitjeslijn** (`paper-grid`): de lijnen van het raster van 16 px.
- **Bladwit** (`card`): achtergrond van kaarten en invoervelden.
- **Podiumpapier** (`stage`): achtergrond van het canvas en het kader eromheen, iets lichter dan de pagina zodat de simulatie oplicht.
- **Inktblauw** (`ink`): hoofdtekst, kaders van kaarten en de harde schaduw.
- **Verdunde inkt** (`ink-soft`): secundaire tekst en inactieve tabbladen.
- **Potloodgrijs** (`ink-muted`): hulptekst, labels en eenheden; het lichtste grijs dat voor tekst gebruikt mag worden.
- **Kantlijn** (`rule`): randen van secundaire knoppen, scheidingslijnen en invoervelden in een kaart.
- **Spoor** (`slider-track`): de baan van schuifregelaars.

### Named Rules
**De Inkt-is-geen-zwart-regel.** Tekst, kaders en schaduw zijn inktblauw (`ink`), nooit puur zwart of warm grijs.

**De Eén-onderwerp-regel.** Een pagina gebruikt maar één accentkleur: die van het eigen onderwerp. Andere onderwerpkleuren verschijnen alleen op de overzichtspagina.

**De Fysica-kleur-regel.** Kleuren op het canvas die een grootheid voorstellen (kracht, snelheid, veld, stroom, golftop/-dal) hebben vaste betekenis, staan in een legenda met exact dezelfde kleur, en worden nooit vervangen door de accentkleur. Ze vallen bewust buiten de tokens hierboven. Wordt zo'n kleur als tekst gebruikt (bv. "R = 100 Ω"), dan in een donkerder versie van dezelfde tint die minstens 4,5:1 haalt.

## Typography

**Display Font:** Fraunces (met Georgia, serif)
**Body Font:** Atkinson Hyperlegible (met IBM Plex Sans, Helvetica, Arial)
**Label/Mono Font:** IBM Plex Mono (met ui-monospace)

**Character:** Fraunces geeft titels de warmte van een gedrukte cursus; Atkinson Hyperlegible is gemaakt om letters zoals l, I en 1 onmiskenbaar te houden, wat op een beamer telt. De mono-letter maakt van elke waarde en elk label een meetnotitie.

### Hierarchy
- **Display** (700, 40px, 1.05): de titel "Natuurkunde simulaties" op de overzichtspagina.
- **Headline** (700, 24px, 1.2): onderwerptitels en "Documenten" op de overzichtspagina.
- **Applet-titel** (700, 22px): de titel bovenaan elke applet, naast "← Alle simulaties".
- **Title** (700, 16–18px, 1.2): namen op de appletkaarten (18px) en kaarttitels in het zijpaneel zoals "Chronometer" (16px). Lange samengestelde woorden krijgen zachte afbreekstreepjes op een logische grens.
- **Body** (400, 13–14px, 1.45): beschrijvingen, uitleg en knoptekst.
- **Label** (600, 12px, 0.01em, normale kast): sectiekoppen zoals "Weergave" en het aantal simulaties; in mono, nooit in hoofdletters.
- **Value** (500, 14–15px): gemeten en ingestelde waarden met eenheid, in mono, rechts uitgelijnd naast hun label.
- **Code** (400, 13px): Python-code in de notebook, in JetBrains Mono.

Kleinste tekst in de interface is 11,5 px (schaallabels); lopende tekst minstens 12 px. Cijfers zijn overal tabulair, zodat waarden niet verspringen terwijl ze veranderen.

### Named Rules
**De Meetnotitie-regel.** Elk getal met een eenheid staat in IBM Plex Mono; tekst eromheen staat in Atkinson.

**De Geen-hoofdletters-regel.** Labels en sectiekoppen staan in mono met normale kast, niet in brede hoofdletters.

## Layout

De overzichtspagina is een kolom van maximaal 1100 px met 28 px rand. Bovenaan staat de titel links en het zoekveld rechts; daaronder de onderwerptabbladen en een rooster van kaarten (`repeat(auto-fill, minmax(248px, 1fr))`, tussenruimte 14 px).

Een applet vult het scherm: een smalle kop met terugknop en titel, daaronder links het podium (canvas, met de legenda eronder) en rechts een zijpaneel van ongeveer 340 px met gestapelde kaarten (tussenruimte 12 px). De knoppen Start/Afspelen en Reset staan altijd als eerste rij bovenaan het zijpaneel. Onder 760 px schuift het zijpaneel onder het podium.

Ritme: tussenruimtes van 6, 10, 12, 14 en 18 px; kaarten hebben binnenmarge 14 × 16 px.

## Elevation & Depth

Diepte komt van één harde, onvervaagde schaduw in inktblauw, zoals een kaartje dat schuin op het papier ligt. Er zijn geen zachte of gelaagde schaduwen.

### Shadow Vocabulary
- **Rust** (`box-shadow: 2px 2px 0 #1d2a3a`): elke kaart, het podium en het zoekveld.
- **Opgetild** (`box-shadow: 4px 4px 0 #1d2a3a` met `translate(-2px, -2px)`): kaarten op de overzichtspagina bij aanwijzen.
- **Ingedrukt** (`box-shadow: 0 0 0` met `translate(2px, 2px)`): kaarten op de overzichtspagina bij klikken.

### Named Rules
**De Harde-schaduw-regel.** Een schaduw is altijd scherp, schuin naar rechtsonder en in inktblauw. Vervaging (`blur`) is verboden.

## Shapes

Hoeken zijn klein en overal gelijk (4 px): kaarten, knoppen, tabbladen, invoervelden en pictogramtegels. Het spoor van een schuifregelaar heeft 6 px en de kleurstaafjes in een legenda 2 px. Alleen statuspillen (999 px) en stippen of schuifbolletjes (50%) zijn rond. Kaarten hebben een inktrand van 1 px; secundaire knoppen en velden binnen een kaart een kantlijn van 1 px.

## Components

### Buttons
Tastbaar en stevig, zoals een schakelaar op een labotafel.
- **Shape:** kleine hoeken (4px), minstens 40px hoog in het zijpaneel.
- **Primary:** onderwerpaccent met witte tekst (600); één per groep, voor de hoofdactie zoals Start of Loslaten.
- **Secondary:** wit met kantlijn en inktblauwe tekst; voor Reset en nevenacties. De resetknop heet altijd "Reset".
- **Hover / Focus:** primair wordt donkerder (`accent-hover`); focus toont een inktblauwe omlijning van 2 px met 2 px afstand.

### Toggles (segmentknoppen)
- **Style:** knoppen met hoeken van 4px en kantlijn; uit is wit met potloodgrijze tekst, aan is gevuld (onderwerpaccent of de vaste fysica-kleur van de laag) met witte tekst en een vinkje.
- **State:** elke schakelaar zet `aria-pressed` vanuit zijn toestand; het vinkje komt uit `applet.css`. Moduskeuzes (zoals Satelliet/Kepler) zijn de enige uitzondering: actief in inkt.
- **Defaults:** alle optionele lagen (vectoren, veldlijnen, sporen, omhullenden …) starten uit.

### Legenda
- Een legenda toont alleen wat de huidige modus kan tekenen. Staat een laag uit, dan wordt alleen het kleurstaafje lichter en staat er "(uit)" bij; de tekst blijft leesbaar.
- Waar twee toestanden een kleur delen (stabiel/onstabiel), verschillen ze ook in vorm (stip/kruis).

### Cards / Containers
- **Corner Style:** 4px.
- **Background:** bladwit (`card`).
- **Shadow Strategy:** harde rustschaduw (zie Elevation & Depth).
- **Border:** 1px inktblauw.
- **Internal Padding:** 14px 16px.

### Inputs / Fields
- **Schuifregelaar:** spoor van 6 px in `slider-track`, wit bolletje van 18 px met een rand in het onderwerpaccent; label links, waarde in mono rechts erboven.
- **Zoekveld:** bladwit, inktrand en harde schaduw, vergrootglas-pictogram links, 42px hoog.
- **Focus:** inktblauwe omlijning van 2 px.

### Navigation
- **Onderwerptabbladen:** bladwitte knoppen met kantlijn en een gekleurde stip; het actieve tabblad is gevuld met de donkere onderwerptint, witte tekst en een witte stip.
- **Terugknop:** "← Alle simulaties" in potloodgrijs, links van de applet-titel.

### Appletkaart (signatuur)
Een kaart op de overzichtspagina met links een pictogramtegel van 46 px (zachte onderwerptint, dunne rand in de donkere tint, eigen lijnpictogram uit `icons/`), rechts de naam in Fraunces en eronder de beschrijving. Tilt op bij aanwijzen en drukt in bij klikken. Het pictogram is ook het tabbladicoon van de applet.

### Zijpaneel (gedeelde klassen)
`applet.css` levert de bouwstenen: `.action-row` (altijd eerste rij: Start/Loslaten + Reset), `.panel-card`, `.card-head` (Fraunces 16px), `.help` (uitleg zonder eigen kader), `.btn-accent`, `.btn-secondary` en `.toggle` (gevuld bij `aria-pressed="true"`). Nieuwe of herwerkte applets gebruiken deze klassen in plaats van losse inline stijlen. Een destructieve noodknop (zoals SCRAM) staat los onder de actierij in rood; Start gebruikt dan inkt, nooit dezelfde kleur als de noodknop.

### Podium en legenda (signatuur)
Het canvas staat op podiumpapier binnen een kaart met inktrand. De tekening vult het podium (geen klein figuurtje in een lege vlakte) en canvaslabels zijn minstens 13 px in ontwerpcoördinaten, zodat ze op de beamer leesbaar blijven. Direct eronder een smalle legendakaart met kleurstaafjes die exact overeenkomen met de kleuren op het canvas.

## Do's and Don'ts

### Do:
- **Do** gebruik `ink` (#1d2a3a) voor tekst, kaders en schaduw.
- **Do** geef elke kaart een inktrand van 1 px, hoeken van 4 px en de harde schaduw `2px 2px 0`.
- **Do** zet waarden met eenheid in IBM Plex Mono en titels in Fraunces.
- **Do** leid het accent af van de onderwerptint via `--h` in `applet.css`.
- **Do** houd elke legendakleur identiek aan de kleur op het canvas.
- **Do** houd tekst minstens op `ink-muted` (#4f5b69) voor voldoende contrast op de beamer.

### Don't:
- **Don't** gebruik zachte of vervaagde schaduwen, grote afgeronde hoeken of beige zonder raster: de generieke AI/SaaS-look.
- **Don't** maak de stijl kinderachtig of cartoonesk; het publiek is 16 tot 18 jaar.
- **Don't** gebruik donkere achtergronden met neonkleuren.
- **Don't** zet labels of sectiekoppen in hoofdletters met brede letterspatiëring.
- **Don't** gebruik de accentkleur voor een fysische grootheid op het canvas.
- **Don't** gebruik grijs lichter dan `ink-muted` voor tekst.
