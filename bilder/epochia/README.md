# Epochia – Bild-Prompts

Von Claude geschrieben, Emin erzeugt die Bilder. Fertige Bilder hier in `bilder/epochia/` ablegen (PNG oder JPG,
mindestens 1024 px, Dateiname wie angegeben). Claude schneidet zu, stellt frei und baut sie ein.
Jeder Kasten ist ein **kompletter Prompt** – einfach ganz kopieren. Erledigtes mit [x] abhaken.

**Wichtig, damit alles zusammenpasst:** Erst Gruppe A erzeugen und Claude zeigen. Wenn Blickwinkel, Farben und
Grundstück stimmen, nehmen wir das beste Bild als **Stil-Vorlage** (bei den meisten Bild-KIs kann man ein
Referenzbild mitgeben) und erzeugen alle weiteren damit.

**Stand 2026-10-28:** Gruppe A, Startseite, Ladebild, App-Icon, Fellzelt, Jägerlager, Mammutjägerlager, Holzsammler, Steinsammler, Höhlenmaler, Feuerplatz, Fischerplatz und Fellmacherin sind fertig und eingebaut – Stil, Blickwinkel und Grasplatte mit
Erdsockel passen. Lagerfeuer, Wohnhöhle und Sammlerin sind die **Stil-Vorlage** für alle weiteren Gebäude. Dateinamen sind egal
(Claude benennt um); die Originale liegen danach in `quelle/`, das Spiel nutzt die verkleinerten `.webp`
(`python3 neu/tools/bild-einbauen.py …`). Fehlt ein Bild, zeigt das Spiel einen einfachen Platzhalter.

Größen der Grundstücke: 2×2 = klein, 3×3 = mittel, 4×4 = groß. Alle Gebäudebilder quadratisch.

## Gruppe A – zuerst (Stil festlegen)

- [x] ~~**Lagerfeuer (3×3)**~~ → `1-lagerfeuer.png`

```
Stone age, prehistoric, everything made of wood, stone, bones, leather and furs, no metal. A cozy prehistoric camp center: a big crackling campfire in a ring of stones, logs to sit on around it, a wooden drying rack with furs, baskets with berries, a small pile of firewood, medium-size plot (3x3). Style: bright cheerful cartoon mobile game asset, cozy and friendly, soft warm sunny colors, clean dark brown outlines, gentle soft shading, isometric view from the front-right at a classic 2:1 isometric angle, sunlight from top left, the building stands on a diamond-shaped plot of grass that fills the full width of the image, plot and building fully visible and centered, plain pure white background, no text, no letters, no border, no shadow outside the plot, highly detailed, consistent style across all assets, square 1:1 format
```

- [x] ~~**Wohnhöhle (2×2)**~~ → `1-wohnhoehle.png`

```
Stone age, prehistoric, everything made of wood, stone, bones, leather and furs, no metal. A small cozy cave dwelling: a rocky overhang of grey boulders with a leather curtain at the entrance, a small fire glowing inside, a few furs and a stone bowl in front, grass and tiny flowers around, small plot (2x2). Style: bright cheerful cartoon mobile game asset, cozy and friendly, soft warm sunny colors, clean dark brown outlines, gentle soft shading, isometric view from the front-right at a classic 2:1 isometric angle, sunlight from top left, the building stands on a diamond-shaped plot of grass that fills the full width of the image, plot and building fully visible and centered, plain pure white background, no text, no letters, no border, no shadow outside the plot, highly detailed, consistent style across all assets, square 1:1 format
```

- [x] ~~**Sammlerin (2×2)**~~ → `1-sammlerin.png`

```
Stone age, prehistoric, everything made of wood, stone, bones, leather and furs, no metal. A gatherer's spot: a small lean-to shelter of branches and leaves, woven baskets full of red berries and mushrooms, a few berry bushes, small plot (2x2). Style: bright cheerful cartoon mobile game asset, cozy and friendly, soft warm sunny colors, clean dark brown outlines, gentle soft shading, isometric view from the front-right at a classic 2:1 isometric angle, sunlight from top left, the building stands on a diamond-shaped plot of grass that fills the full width of the image, plot and building fully visible and centered, plain pure white background, no text, no letters, no border, no shadow outside the plot, highly detailed, consistent style across all assets, square 1:1 format
```

## Gruppe B – Spielfiguren und Startseite

- [x] ~~**Startseite (16:9 quer)**~~ → `start.png`

```
A wide bright cheerful landscape for the title screen of a cozy city building game about the ages of humanity: a sunny green valley with a river; on the left a stone age camp with a campfire and furs tents, in the middle an ancient village and a medieval castle on a hill, on the far right horizon a modern city skyline; soft clouds, birds, warm morning light, cartoon mobile game art style, soft warm colors, clean outlines, lots of empty sky at the top for a logo and calm empty meadow in the lower middle for buttons, no text, no letters, 16:9 wide format, 1920x1080
```

- [x] ~~**Ladefenster (16:9 quer)**~~ → `ladebild.png`

```
A calm cheerful loading screen illustration: a single campfire at dusk on a green hill, behind it a soft gradient sky from warm orange to light blue, faint silhouettes of a pyramid, a castle and a modern tower far away in the sky like a dream, cartoon mobile game art style, soft warm colors, large empty space in the center for a logo and a loading bar, no text, no letters, 16:9 wide format, 1920x1080
```

- [x] ~~**App-Icon (1024×1024)**~~ → `icon.png`

```
App icon for a cozy city building game about the ages of humanity: a cheerful round emblem with a small campfire and a stone age hut in front, behind them a castle tower and a modern skyscraper rising like steps toward a bright sun, green hill, blue sky, bright cheerful cartoon style, soft warm colors, clean outlines, all important parts inside the central 70 percent, the sky background color fills the whole square to all edges, no text, no letters, no border, square 1:1, 1024x1024
```

- [ ] **Stammesältester (Steinzeit, für den Einstieg)** → `aeltester-1.png`

```
Character portrait for a cozy mobile game: a friendly old stone age tribal elder, long grey beard, warm smile, kind eyes, fur cloak, necklace of bone and wooden beads, holding a wooden staff with feathers, waving one hand, upper body, facing the viewer slightly turned, bright cheerful cartoon style, soft warm colors, clean dark brown outlines, plain pure white background, no text, square 1:1
```

Später (gleicher Mann, älter gekleidet je Epoche): Häuptling (Bronze-/Eisenzeit) → Ratsherr (Antike) → Vogt (Mittelalter) →
Bürgermeister (Neuzeit). Prompts dafür kommen mit der jeweiligen Epoche – mit `aeltester-1.png` als Vorlage, damit er gleich aussieht.

## Gruppe C – Gebäude Altsteinzeit

- [x] ~~**Fellzelt (2×2)**~~ → `1-fellzelt.png`

```
Stone age, prehistoric, everything made of wood, stone, bones, leather and furs, no metal. A cozy tent made of wooden poles covered with sewn animal furs, smoke hole at the top, a small fire pit and a drying fur in front, small plot (2x2). Style: bright cheerful cartoon mobile game asset, cozy and friendly, soft warm sunny colors, clean dark brown outlines, gentle soft shading, isometric view from the front-right at a classic 2:1 isometric angle, sunlight from top left, the building stands on a diamond-shaped plot of grass that fills the full width of the image, plot and building fully visible and centered, plain pure white background, no text, no letters, no border, no shadow outside the plot, highly detailed, consistent style across all assets, square 1:1 format
```

- [x] ~~**Jägerlager (3×3)**~~ → `1-jaegerlager.png`

```
Stone age, prehistoric, everything made of wood, stone, bones, leather and furs, no metal. A hunters' camp: two small fur tents, spears leaning on a wooden rack, antlers on a post, a deer hide stretched on a frame, a meat drying rack, medium plot (3x3). Style: bright cheerful cartoon mobile game asset, cozy and friendly, soft warm sunny colors, clean dark brown outlines, gentle soft shading, isometric view from the front-right at a classic 2:1 isometric angle, sunlight from top left, the building stands on a diamond-shaped plot of grass that fills the full width of the image, plot and building fully visible and centered, plain pure white background, no text, no letters, no border, no shadow outside the plot, highly detailed, consistent style across all assets, square 1:1 format
```

- [x] ~~**Mammutjägerlager (3×3)**~~ → `1-mammutjaegerlager.png`

```
Stone age, prehistoric, everything made of wood, stone, bones, leather and furs, no metal. A bigger hunters' camp with a large hut built from mammoth tusks and bones covered with furs, long spears on racks, a huge mammoth fur drying, medium plot (3x3). Style: bright cheerful cartoon mobile game asset, cozy and friendly, soft warm sunny colors, clean dark brown outlines, gentle soft shading, isometric view from the front-right at a classic 2:1 isometric angle, sunlight from top left, the building stands on a diamond-shaped plot of grass that fills the full width of the image, plot and building fully visible and centered, plain pure white background, no text, no letters, no border, no shadow outside the plot, highly detailed, consistent style across all assets, square 1:1 format
```

- [x] ~~**Holzsammler (2×2)**~~ → `1-holzsammler.png`

```
Stone age, prehistoric, everything made of wood, stone, bones, leather and furs, no metal. A woodgatherer's spot: a stack of branches and logs, a stone axe stuck in a tree stump, a small shelter of branches, small plot (2x2). Style: bright cheerful cartoon mobile game asset, cozy and friendly, soft warm sunny colors, clean dark brown outlines, gentle soft shading, isometric view from the front-right at a classic 2:1 isometric angle, sunlight from top left, the building stands on a diamond-shaped plot of grass that fills the full width of the image, plot and building fully visible and centered, plain pure white background, no text, no letters, no border, no shadow outside the plot, highly detailed, consistent style across all assets, square 1:1 format
```

- [x] ~~**Steinsammler (2×2)**~~ → `1-steinsammler.png`

```
Stone age, prehistoric, everything made of wood, stone, bones, leather and furs, no metal. A stone gatherer's spot: piles of grey stones and flint, a wooden sled with stones, a stone hammer, a few boulders, small plot (2x2). Style: bright cheerful cartoon mobile game asset, cozy and friendly, soft warm sunny colors, clean dark brown outlines, gentle soft shading, isometric view from the front-right at a classic 2:1 isometric angle, sunlight from top left, the building stands on a diamond-shaped plot of grass that fills the full width of the image, plot and building fully visible and centered, plain pure white background, no text, no letters, no border, no shadow outside the plot, highly detailed, consistent style across all assets, square 1:1 format
```

- [x] ~~**Höhlenmaler (2×2)**~~ → `1-hoehlenmaler.png`

```
Stone age, prehistoric, everything made of wood, stone, bones, leather and furs, no metal. A rock wall with colorful cave paintings of animals and hand prints, pots of red and ochre paint, a small fire for light, small plot (2x2). Style: bright cheerful cartoon mobile game asset, cozy and friendly, soft warm sunny colors, clean dark brown outlines, gentle soft shading, isometric view from the front-right at a classic 2:1 isometric angle, sunlight from top left, the building stands on a diamond-shaped plot of grass that fills the full width of the image, plot and building fully visible and centered, plain pure white background, no text, no letters, no border, no shadow outside the plot, highly detailed, consistent style across all assets, square 1:1 format
```

- [x] ~~**Feuerplatz (2×2)**~~ → `1-feuerplatz.png`

```
Stone age, prehistoric, everything made of wood, stone, bones, leather and furs, no metal. A small fire place: a little campfire in a stone ring, two log benches, a pot hanging over the fire, small plot (2x2). Style: bright cheerful cartoon mobile game asset, cozy and friendly, soft warm sunny colors, clean dark brown outlines, gentle soft shading, isometric view from the front-right at a classic 2:1 isometric angle, sunlight from top left, the building stands on a diamond-shaped plot of grass that fills the full width of the image, plot and building fully visible and centered, plain pure white background, no text, no letters, no border, no shadow outside the plot, highly detailed, consistent style across all assets, square 1:1 format
```

## Gruppe D – Gebäude Mittelsteinzeit

- [x] ~~**Fischerplatz mit Einbaum (2×2, am Wasser)**~~ → `1-fischerplatz.png`

```
Stone age, prehistoric, everything made of wood, stone, bones, leather and furs, no metal. A fishing spot at a river bank: a dugout canoe made from a tree trunk, fishing spears and woven fish traps, fish drying on a rack; the back half of the plot is blue water, the front half grass, small plot (2x2). Style: bright cheerful cartoon mobile game asset, cozy and friendly, soft warm sunny colors, clean dark brown outlines, gentle soft shading, isometric view from the front-right at a classic 2:1 isometric angle, sunlight from top left, the building stands on a diamond-shaped plot of grass that fills the full width of the image, plot and building fully visible and centered, plain pure white background, no text, no letters, no border, no shadow outside the plot, highly detailed, consistent style across all assets, square 1:1 format
```

- [x] ~~**Fellmacherin (2×2)**~~ → `1-fellmacherin.png`

```
Stone age, prehistoric, everything made of wood, stone, bones, leather and furs, no metal. A fur workshop: furs stretched on wooden frames, a small hut with a fur roof, bone needles and fur clothes hanging on a line, small plot (2x2). Style: bright cheerful cartoon mobile game asset, cozy and friendly, soft warm sunny colors, clean dark brown outlines, gentle soft shading, isometric view from the front-right at a classic 2:1 isometric angle, sunlight from top left, the building stands on a diamond-shaped plot of grass that fills the full width of the image, plot and building fully visible and centered, plain pure white background, no text, no letters, no border, no shadow outside the plot, highly detailed, consistent style across all assets, square 1:1 format
```

- [ ] **Steinschläger (2×2)** → `1-steinschlaeger.png`

```
Stone age, prehistoric, everything made of wood, stone, bones, leather and furs, no metal. A flint knapper's workplace: a big flat stone as workbench, stone axes, knives and arrowheads laid out, a basket of flint, a small roof of branches, small plot (2x2). Style: bright cheerful cartoon mobile game asset, cozy and friendly, soft warm sunny colors, clean dark brown outlines, gentle soft shading, isometric view from the front-right at a classic 2:1 isometric angle, sunlight from top left, the building stands on a diamond-shaped plot of grass that fills the full width of the image, plot and building fully visible and centered, plain pure white background, no text, no letters, no border, no shadow outside the plot, highly detailed, consistent style across all assets, square 1:1 format
```

- [ ] **Grubenhaus (2×2)** → `1-grubenhaus.png`

```
Stone age, prehistoric, everything made of wood, stone, bones, leather and furs, no metal. A small pit house half sunk into the ground with a steep thatched roof of reeds reaching the ground, a small wooden door, firewood beside it, small plot (2x2). Style: bright cheerful cartoon mobile game asset, cozy and friendly, soft warm sunny colors, clean dark brown outlines, gentle soft shading, isometric view from the front-right at a classic 2:1 isometric angle, sunlight from top left, the building stands on a diamond-shaped plot of grass that fills the full width of the image, plot and building fully visible and centered, plain pure white background, no text, no letters, no border, no shadow outside the plot, highly detailed, consistent style across all assets, square 1:1 format
```

- [ ] **Ahnenplatz (3×3)** → `1-ahnenplatz.png`

```
Stone age, prehistoric, everything made of wood, stone, bones, leather and furs, no metal. A peaceful ancestors' place in nature: carved wooden totem poles with friendly faces, a circle of small standing stones, flowers and offerings of fruit, a small fire bowl, medium plot (3x3). Style: bright cheerful cartoon mobile game asset, cozy and friendly, soft warm sunny colors, clean dark brown outlines, gentle soft shading, isometric view from the front-right at a classic 2:1 isometric angle, sunlight from top left, the building stands on a diamond-shaped plot of grass that fills the full width of the image, plot and building fully visible and centered, plain pure white background, no text, no letters, no border, no shadow outside the plot, highly detailed, consistent style across all assets, square 1:1 format
```

## Gruppe E – Gebäude Jungsteinzeit

- [ ] **Acker (3×3)** → `1-acker.png`

```
Neolithic, early farmers, wood, clay, thatch and stone, no metal. A small early field with rows of golden wheat and some green plants, a low wattle fence, a wooden digging stick and a basket, medium plot (3x3). Style: bright cheerful cartoon mobile game asset, cozy and friendly, soft warm sunny colors, clean dark brown outlines, gentle soft shading, isometric view from the front-right at a classic 2:1 isometric angle, sunlight from top left, the building stands on a diamond-shaped plot of grass that fills the full width of the image, plot and building fully visible and centered, plain pure white background, no text, no letters, no border, no shadow outside the plot, highly detailed, consistent style across all assets, square 1:1 format
```

- [ ] **Ziegengehege (3×3)** → `1-ziegengehege.png`

```
Neolithic, early farmers, wood, clay, thatch and stone, no metal. A goat pen with a woven wattle fence, three cute goats, a small shelter with a thatched roof, a water trough made of a hollow log, medium plot (3x3). Style: bright cheerful cartoon mobile game asset, cozy and friendly, soft warm sunny colors, clean dark brown outlines, gentle soft shading, isometric view from the front-right at a classic 2:1 isometric angle, sunlight from top left, the building stands on a diamond-shaped plot of grass that fills the full width of the image, plot and building fully visible and centered, plain pure white background, no text, no letters, no border, no shadow outside the plot, highly detailed, consistent style across all assets, square 1:1 format
```

- [ ] **Tongrube (2×2, am Wasser)** → `1-tongrube.png`

```
Neolithic, early farmers, wood, clay, thatch and stone, no metal. A clay pit at a river bank: a muddy brown pit with lumps of clay, wooden buckets and baskets; the back of the plot is blue water, small plot (2x2). Style: bright cheerful cartoon mobile game asset, cozy and friendly, soft warm sunny colors, clean dark brown outlines, gentle soft shading, isometric view from the front-right at a classic 2:1 isometric angle, sunlight from top left, the building stands on a diamond-shaped plot of grass that fills the full width of the image, plot and building fully visible and centered, plain pure white background, no text, no letters, no border, no shadow outside the plot, highly detailed, consistent style across all assets, square 1:1 format
```

- [ ] **Töpferei (2×2)** → `1-toepferei.png`

```
Neolithic, early farmers, wood, clay, thatch and stone, no metal. A small pottery workshop: a hut with a thatched roof, clay pots and bowls with simple patterns drying on shelves, a small clay kiln with smoke, small plot (2x2). Style: bright cheerful cartoon mobile game asset, cozy and friendly, soft warm sunny colors, clean dark brown outlines, gentle soft shading, isometric view from the front-right at a classic 2:1 isometric angle, sunlight from top left, the building stands on a diamond-shaped plot of grass that fills the full width of the image, plot and building fully visible and centered, plain pure white background, no text, no letters, no border, no shadow outside the plot, highly detailed, consistent style across all assets, square 1:1 format
```

- [ ] **Langhaus (3×3)** → `1-langhaus.png`

```
Neolithic, early farmers, wood, clay, thatch and stone, no metal. A big neolithic longhouse with wattle and daub walls, a long thatched roof, a wooden door, smoke from the roof, a small garden and firewood stack, medium plot (3x3). Style: bright cheerful cartoon mobile game asset, cozy and friendly, soft warm sunny colors, clean dark brown outlines, gentle soft shading, isometric view from the front-right at a classic 2:1 isometric angle, sunlight from top left, the building stands on a diamond-shaped plot of grass that fills the full width of the image, plot and building fully visible and centered, plain pure white background, no text, no letters, no border, no shadow outside the plot, highly detailed, consistent style across all assets, square 1:1 format
```

- [ ] **Pfahlbau (3×3, im Wasser)** → `1-pfahlbau.png`

```
Neolithic, early farmers, wood, clay, thatch and stone, no metal. Two lake dwellings: huts with thatched roofs standing on wooden stilts above blue lake water, a wooden walkway to the shore, a canoe tied to a pole; most of the plot is water, the front edge is grass shore, medium plot (3x3). Style: bright cheerful cartoon mobile game asset, cozy and friendly, soft warm sunny colors, clean dark brown outlines, gentle soft shading, isometric view from the front-right at a classic 2:1 isometric angle, sunlight from top left, the building stands on a diamond-shaped plot of grass that fills the full width of the image, plot and building fully visible and centered, plain pure white background, no text, no letters, no border, no shadow outside the plot, highly detailed, consistent style across all assets, square 1:1 format
```

- [ ] **Vorratsspeicher (3×3)** → `1-vorratsspeicher.png`

```
Neolithic, early farmers, wood, clay, thatch and stone, no metal. A storehouse on short wooden stilts with a thatched roof, a ladder, big clay pots and baskets of grain around it, medium plot (3x3). Style: bright cheerful cartoon mobile game asset, cozy and friendly, soft warm sunny colors, clean dark brown outlines, gentle soft shading, isometric view from the front-right at a classic 2:1 isometric angle, sunlight from top left, the building stands on a diamond-shaped plot of grass that fills the full width of the image, plot and building fully visible and centered, plain pure white background, no text, no letters, no border, no shadow outside the plot, highly detailed, consistent style across all assets, square 1:1 format
```

- [ ] **Steinkreis (4×4, Wahrzeichen)** → `1-steinkreis.png`

```
Neolithic, early farmers, wood, clay, thatch and stone, no metal. A majestic but friendly stone circle monument of tall grey standing stones with lintels on top, soft grass and flowers inside, a small fire bowl in the center, large plot (4x4). Style: bright cheerful cartoon mobile game asset, cozy and friendly, soft warm sunny colors, clean dark brown outlines, gentle soft shading, isometric view from the front-right at a classic 2:1 isometric angle, sunlight from top left, the building stands on a diamond-shaped plot of grass that fills the full width of the image, plot and building fully visible and centered, plain pure white background, no text, no letters, no border, no shadow outside the plot, highly detailed, consistent style across all assets, square 1:1 format
```

## Gruppe F – Baustellen (je Größe eine)

- [ ] **Baustelle 2×2** → `1-baustelle-2.png`

```
Stone age, prehistoric, everything made of wood, stone, bones, leather and furs, no metal. A construction site: a half-built wooden frame of poles tied with rope, piles of logs and stones, a basket with tools, small plot (2x2). Style: bright cheerful cartoon mobile game asset, cozy and friendly, soft warm sunny colors, clean dark brown outlines, gentle soft shading, isometric view from the front-right at a classic 2:1 isometric angle, sunlight from top left, the building stands on a diamond-shaped plot of grass that fills the full width of the image, plot and building fully visible and centered, plain pure white background, no text, no letters, no border, no shadow outside the plot, highly detailed, consistent style across all assets, square 1:1 format
```

- [ ] **Baustelle 3×3** → `1-baustelle-3.png`

```
Stone age, prehistoric, everything made of wood, stone, bones, leather and furs, no metal. A construction site: a half-built wooden frame of poles tied with rope, piles of logs and stones, a basket with tools, medium plot (3x3). Style: bright cheerful cartoon mobile game asset, cozy and friendly, soft warm sunny colors, clean dark brown outlines, gentle soft shading, isometric view from the front-right at a classic 2:1 isometric angle, sunlight from top left, the building stands on a diamond-shaped plot of grass that fills the full width of the image, plot and building fully visible and centered, plain pure white background, no text, no letters, no border, no shadow outside the plot, highly detailed, consistent style across all assets, square 1:1 format
```

- [ ] **Baustelle 4×4** → `1-baustelle-4.png`

```
Stone age, prehistoric, everything made of wood, stone, bones, leather and furs, no metal. A construction site: a half-built wooden frame of poles tied with rope, piles of logs and stones, a basket with tools, large plot (4x4). Style: bright cheerful cartoon mobile game asset, cozy and friendly, soft warm sunny colors, clean dark brown outlines, gentle soft shading, isometric view from the front-right at a classic 2:1 isometric angle, sunlight from top left, the building stands on a diamond-shaped plot of grass that fills the full width of the image, plot and building fully visible and centered, plain pure white background, no text, no letters, no border, no shadow outside the plot, highly detailed, consistent style across all assets, square 1:1 format
```

## Gruppe G – Gelände, Tiere

- [ ] **Wiese (nahtlos)** → `wiese.png`

```
Seamless tileable texture of short bright green grass seen from directly above, a few tiny lighter and darker patches, soft cheerful colors, flat cartoon game texture, no objects, no flowers, even lighting, square
```

- [ ] **Wasser (nahtlos)** → `wasser.png`

```
Seamless tileable texture of calm clear turquoise-blue water seen from directly above, small gentle cartoon wave lines and sparkles, soft cheerful colors, flat game texture, no objects, no shore, even lighting, square
```

- [ ] **Sand/Ufer (nahtlos)** → `sand.png`

```
Seamless tileable texture of light warm sand seen from directly above, a few tiny pebbles, soft cheerful colors, flat cartoon game texture, no objects, even lighting, square
```

- [ ] **Laubbaum** → `baum-laub.png`

```
A single round leafy tree with a full bright green crown and short brown trunk. Style: bright cheerful cartoon mobile game asset, soft warm sunny colors, clean dark brown outlines, gentle shading, isometric view from the front-right, sunlight from top left, single object fully visible and centered, plain pure white background, no ground, no shadow, no text, no border, consistent style, square 1:1 format
```

- [ ] **Tanne** → `baum-tanne.png`

```
A single tall pine tree, fresh green, cone shaped. Style: bright cheerful cartoon mobile game asset, soft warm sunny colors, clean dark brown outlines, gentle shading, isometric view from the front-right, sunlight from top left, single object fully visible and centered, plain pure white background, no ground, no shadow, no text, no border, consistent style, square 1:1 format
```

- [ ] **Birke** → `baum-birke.png`

```
A single small birch tree, white trunk with black marks, light green leaves. Style: bright cheerful cartoon mobile game asset, soft warm sunny colors, clean dark brown outlines, gentle shading, isometric view from the front-right, sunlight from top left, single object fully visible and centered, plain pure white background, no ground, no shadow, no text, no border, consistent style, square 1:1 format
```

- [ ] **Busch** → `busch.png`

```
A small round green bush with a few tiny pink and yellow flowers. Style: bright cheerful cartoon mobile game asset, soft warm sunny colors, clean dark brown outlines, gentle shading, isometric view from the front-right, sunlight from top left, single object fully visible and centered, plain pure white background, no ground, no shadow, no text, no border, consistent style, square 1:1 format
```

- [ ] **Großer Felsen** → `fels-gross.png`

```
A big friendly grey rocky hill with moss and a few small plants, wide base. Style: bright cheerful cartoon mobile game asset, soft warm sunny colors, clean dark brown outlines, gentle shading, isometric view from the front-right, sunlight from top left, single object fully visible and centered, plain pure white background, no ground, no shadow, no text, no border, consistent style, square 1:1 format
```

- [ ] **Kleine Felsen** → `fels-klein.png`

```
A small cluster of grey boulders with moss. Style: bright cheerful cartoon mobile game asset, soft warm sunny colors, clean dark brown outlines, gentle shading, isometric view from the front-right, sunlight from top left, single object fully visible and centered, plain pure white background, no ground, no shadow, no text, no border, consistent style, square 1:1 format
```

- [ ] **Blumen** → `blumen.png`

```
A small patch of colorful wild flowers in grass. Style: bright cheerful cartoon mobile game asset, soft warm sunny colors, clean dark brown outlines, gentle shading, isometric view from the front-right, sunlight from top left, single object fully visible and centered, plain pure white background, no ground, no shadow, no text, no border, consistent style, square 1:1 format
```

- [ ] **Mammut** → `mammut.png`

```
A cute woolly mammoth walking to the left, brown shaggy fur, curved white tusks. Style: bright cheerful cartoon mobile game asset, soft warm sunny colors, clean dark brown outlines, gentle shading, isometric view from the front-right, sunlight from top left, single object fully visible and centered, plain pure white background, no ground, no shadow, no text, no border, consistent style, square 1:1 format
```

- [ ] **Hirsch** → `hirsch.png`

```
A cute deer walking to the left. Style: bright cheerful cartoon mobile game asset, soft warm sunny colors, clean dark brown outlines, gentle shading, isometric view from the front-right, sunlight from top left, single object fully visible and centered, plain pure white background, no ground, no shadow, no text, no border, consistent style, square 1:1 format
```

- [ ] **Ziege** → `ziege.png`

```
A cute goat standing. Style: bright cheerful cartoon mobile game asset, soft warm sunny colors, clean dark brown outlines, gentle shading, isometric view from the front-right, sunlight from top left, single object fully visible and centered, plain pure white background, no ground, no shadow, no text, no border, consistent style, square 1:1 format
```

Herbst- und Winterbäume folgen, wenn die Sommerbäume passen. Der Trampelpfad wird im Spiel gezeichnet (kein Bild nötig).

## Gruppe H – Waren-Symbole (rund, klein)

- [ ] **Nahrung** → `ware-nahrung.png`

```
A bundle of food: roasted meat on a bone, red berries and a mushroom. Style: round game icon, bright cheerful cartoon style, soft warm colors, clean dark brown outline, gentle shading, object centered and large, plain pure white background, no text, no letters, no border, square 1:1 format
```

- [ ] **Holz** → `ware-holz.png`

```
Three stacked wooden logs. Style: round game icon, bright cheerful cartoon style, soft warm colors, clean dark brown outline, gentle shading, object centered and large, plain pure white background, no text, no letters, no border, square 1:1 format
```

- [ ] **Stein** → `ware-stein.png`

```
A small pile of grey stones. Style: round game icon, bright cheerful cartoon style, soft warm colors, clean dark brown outline, gentle shading, object centered and large, plain pure white background, no text, no letters, no border, square 1:1 format
```

- [ ] **Wissen** → `ware-wissen.png`

```
A glowing light bulb made of a small flame in a stone lamp. Style: round game icon, bright cheerful cartoon style, soft warm colors, clean dark brown outline, gentle shading, object centered and large, plain pure white background, no text, no letters, no border, square 1:1 format
```

- [ ] **Felle** → `ware-felle.png`

```
A folded brown animal fur. Style: round game icon, bright cheerful cartoon style, soft warm colors, clean dark brown outline, gentle shading, object centered and large, plain pure white background, no text, no letters, no border, square 1:1 format
```

- [ ] **Kleidung** → `ware-kleidung.png`

```
A simple stone age fur tunic. Style: round game icon, bright cheerful cartoon style, soft warm colors, clean dark brown outline, gentle shading, object centered and large, plain pure white background, no text, no letters, no border, square 1:1 format
```

- [ ] **Werkzeug** → `ware-werkzeug.png`

```
A stone axe and a flint knife crossed. Style: round game icon, bright cheerful cartoon style, soft warm colors, clean dark brown outline, gentle shading, object centered and large, plain pure white background, no text, no letters, no border, square 1:1 format
```

- [ ] **Ton** → `ware-ton.png`

```
A lump of brown wet clay. Style: round game icon, bright cheerful cartoon style, soft warm colors, clean dark brown outline, gentle shading, object centered and large, plain pure white background, no text, no letters, no border, square 1:1 format
```

- [ ] **Töpferwaren** → `ware-toepferwaren.png`

```
A clay pot with a simple painted pattern. Style: round game icon, bright cheerful cartoon style, soft warm colors, clean dark brown outline, gentle shading, object centered and large, plain pure white background, no text, no letters, no border, square 1:1 format
```

- [ ] **Truhe (tägliche Belohnung)** → `truhe.png`

```
A wooden treasure chest bound with leather straps, slightly open, glowing warm light, berries and furs peeking out. Style: round game icon, bright cheerful cartoon style, soft warm colors, clean dark brown outline, gentle shading, object centered and large, plain pure white background, no text, no letters, no border, square 1:1 format
```

## Gruppe I – Forschungs-Bildchen (rund)

- [ ] **Feuer hüten** → `f-feuer.png`

```
A small campfire with sparks. Style: round game icon, bright cheerful cartoon style, soft warm colors, clean dark brown outline, gentle shading, object centered and large, plain pure white background, no text, no letters, no border, square 1:1 format
```

- [ ] **Faustkeil** → `f-faustkeil.png`

```
A stone hand axe. Style: round game icon, bright cheerful cartoon style, soft warm colors, clean dark brown outline, gentle shading, object centered and large, plain pure white background, no text, no letters, no border, square 1:1 format
```

- [ ] **Flechtkörbe** → `f-koerbe.png`

```
A woven basket full of berries. Style: round game icon, bright cheerful cartoon style, soft warm colors, clean dark brown outline, gentle shading, object centered and large, plain pure white background, no text, no letters, no border, square 1:1 format
```

- [ ] **Speerspitzen** → `f-speer.png`

```
A wooden spear with a flint tip. Style: round game icon, bright cheerful cartoon style, soft warm colors, clean dark brown outline, gentle shading, object centered and large, plain pure white background, no text, no letters, no border, square 1:1 format
```

- [ ] **Fellzelte** → `f-fellzelte.png`

```
A small fur tent. Style: round game icon, bright cheerful cartoon style, soft warm colors, clean dark brown outline, gentle shading, object centered and large, plain pure white background, no text, no letters, no border, square 1:1 format
```

- [ ] **Höhlenmalerei** → `f-hoehlenmalerei.png`

```
A cave painting of a deer and a hand print. Style: round game icon, bright cheerful cartoon style, soft warm colors, clean dark brown outline, gentle shading, object centered and large, plain pure white background, no text, no letters, no border, square 1:1 format
```

- [ ] **Mammutjagd** → `f-mammutjagd.png`

```
A mammoth head with tusks and a spear. Style: round game icon, bright cheerful cartoon style, soft warm colors, clean dark brown outline, gentle shading, object centered and large, plain pure white background, no text, no letters, no border, square 1:1 format
```

- [ ] **Übergang Mittelsteinzeit** → `f-mittelsteinzeit.png`

```
A sunrise over a river with a canoe. Style: round game icon, bright cheerful cartoon style, soft warm colors, clean dark brown outline, gentle shading, object centered and large, plain pure white background, no text, no letters, no border, square 1:1 format
```

- [ ] **Pfeil und Bogen** → `f-bogen.png`

```
A wooden bow with an arrow. Style: round game icon, bright cheerful cartoon style, soft warm colors, clean dark brown outline, gentle shading, object centered and large, plain pure white background, no text, no letters, no border, square 1:1 format
```

- [ ] **Einbaum** → `f-einbaum.png`

```
A dugout canoe with a paddle. Style: round game icon, bright cheerful cartoon style, soft warm colors, clean dark brown outline, gentle shading, object centered and large, plain pure white background, no text, no letters, no border, square 1:1 format
```

- [ ] **Feine Klingen** → `f-klingen.png`

```
Small sharp flint blades. Style: round game icon, bright cheerful cartoon style, soft warm colors, clean dark brown outline, gentle shading, object centered and large, plain pure white background, no text, no letters, no border, square 1:1 format
```

- [ ] **Fellbearbeitung** → `f-fellbearbeitung.png`

```
A bone needle sewing fur. Style: round game icon, bright cheerful cartoon style, soft warm colors, clean dark brown outline, gentle shading, object centered and large, plain pure white background, no text, no letters, no border, square 1:1 format
```

- [ ] **Grubenhaus** → `f-grubenhaus.png`

```
A small pit house with a thatched roof. Style: round game icon, bright cheerful cartoon style, soft warm colors, clean dark brown outline, gentle shading, object centered and large, plain pure white background, no text, no letters, no border, square 1:1 format
```

- [ ] **Ahnenkult** → `f-ahnenkult.png`

```
A carved wooden totem pole. Style: round game icon, bright cheerful cartoon style, soft warm colors, clean dark brown outline, gentle shading, object centered and large, plain pure white background, no text, no letters, no border, square 1:1 format
```

- [ ] **Übergang Jungsteinzeit** → `f-jungsteinzeit.png`

```
A sunrise over a wheat field. Style: round game icon, bright cheerful cartoon style, soft warm colors, clean dark brown outline, gentle shading, object centered and large, plain pure white background, no text, no letters, no border, square 1:1 format
```

- [ ] **Ackerbau** → `f-ackerbau.png`

```
Wheat ears and a digging stick. Style: round game icon, bright cheerful cartoon style, soft warm colors, clean dark brown outline, gentle shading, object centered and large, plain pure white background, no text, no letters, no border, square 1:1 format
```

- [ ] **Sichel** → `f-sichel.png`

```
A stone sickle with wheat. Style: round game icon, bright cheerful cartoon style, soft warm colors, clean dark brown outline, gentle shading, object centered and large, plain pure white background, no text, no letters, no border, square 1:1 format
```

- [ ] **Viehzucht** → `f-viehzucht.png`

```
A cute goat head. Style: round game icon, bright cheerful cartoon style, soft warm colors, clean dark brown outline, gentle shading, object centered and large, plain pure white background, no text, no letters, no border, square 1:1 format
```

- [ ] **Töpfern** → `f-toepfern.png`

```
Hands shaping a clay pot. Style: round game icon, bright cheerful cartoon style, soft warm colors, clean dark brown outline, gentle shading, object centered and large, plain pure white background, no text, no letters, no border, square 1:1 format
```

- [ ] **Langhausbau** → `f-langhaus.png`

```
A neolithic longhouse. Style: round game icon, bright cheerful cartoon style, soft warm colors, clean dark brown outline, gentle shading, object centered and large, plain pure white background, no text, no letters, no border, square 1:1 format
```

- [ ] **Pfahlbauten** → `f-pfahlbauten.png`

```
A hut on stilts over water. Style: round game icon, bright cheerful cartoon style, soft warm colors, clean dark brown outline, gentle shading, object centered and large, plain pure white background, no text, no letters, no border, square 1:1 format
```

- [ ] **Vorratshaltung** → `f-vorrat.png`

```
Big clay storage pots with grain. Style: round game icon, bright cheerful cartoon style, soft warm colors, clean dark brown outline, gentle shading, object centered and large, plain pure white background, no text, no letters, no border, square 1:1 format
```

- [ ] **Sternenkunde** → `f-sterne.png`

```
A night sky with stars over a standing stone. Style: round game icon, bright cheerful cartoon style, soft warm colors, clean dark brown outline, gentle shading, object centered and large, plain pure white background, no text, no letters, no border, square 1:1 format
```

- [ ] **Kupferfund** → `f-kupfer.png`

```
A shiny orange copper nugget on a stone. Style: round game icon, bright cheerful cartoon style, soft warm colors, clean dark brown outline, gentle shading, object centered and large, plain pure white background, no text, no letters, no border, square 1:1 format
```

## Gruppe J – Schrift (Logo und Schriftband)

Bild-KIs verschreiben sich bei Text gern – bitte genau prüfen, dass **„Epochia“** richtig dasteht (7 Buchstaben).
Wenn ein Buchstabe falsch ist: einfach neu erzeugen. Weißer Hintergrund wird freigestellt.

- [ ] **Logo-Schriftzug (breit 3:1)** – für Startseite und Ladefenster → `logo.png`

```
Game logo for a cozy city building game, the single word "Epochia" written in big bold rounded cartoon letters, exactly these 7 letters E-p-o-c-h-i-a, correct spelling, letters look carved from warm golden sandstone with a thick dark brown outline and a soft 3D bevel, the letter "o" is a small glowing campfire inside a stone ring, a tiny green leaf sprouting from the dot of the "i", subtle hint of time passing from rough stone on the left to polished smooth on the right, cheerful bright mobile game title style, soft warm sunny colors, centered, wide horizontal format 3:1, plain pure white background, no other text, no extra letters, no border, no scenery
```

- [ ] **Leeres Schriftband (breit 4:1)** – das Spiel schreibt darauf z. B. „Neue Epoche!“, „Erforscht!“, „Bau fertig!“ → `band.png`

```
Decorative empty banner for a cozy mobile game: a wide ribbon made of tan leather stretched between two wooden sticks tied with rope, small bone and feather decorations at both ends, the middle of the ribbon is completely empty and flat for text to be added later, bright cheerful cartoon style, soft warm colors, clean dark brown outlines, gentle shading, centered, wide horizontal format 4:1, plain pure white background, no text, no letters, no symbols on the ribbon, no border
```

- [ ] **Logo rund (1:1)** – kleine Variante, z. B. für das Ladefenster am hochkant gehaltenen Handy → `logo-rund.png`

```
Small game logo badge for a loading screen: the word "Epochia" in big bold rounded golden sandstone cartoon letters with thick dark brown outline, exactly these 7 letters E-p-o-c-h-i-a, correct spelling, placed on a round stone tablet with a small campfire below the letters, cheerful bright mobile game style, soft warm colors, centered, square 1:1 format, plain pure white background, no other text, no border
```

Die Schrift für alle Texte im Spiel (Knöpfe, Fenster) ist eine echte Schriftart, kein Bild: ✅ **Fredoka**
(rund, fröhlich, frei nutzbar) – liegt seit Epochia Version 3 in `neu/fonts/` und funktioniert auch offline.
