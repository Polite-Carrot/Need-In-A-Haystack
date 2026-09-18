# 🌾 Need in a Haystack

A first-person idle/clicker game about the world's least efficient search problem:
finding a needle in a haystack, one shovelful at a time.

Pure HTML/CSS/JS — no build step, no dependencies. Open `index.html` and dig.

**▶ Play it: https://polite-carrot.github.io/Need-In-A-Haystack/**

## How to play

1. **Tap the haystack** to load hay into your shovel.
2. **Tap the search pit** to dump the load — sifted hay pays out coins.
3. **Spend coins in the shop** on bigger shovels and upgrades.
4. Somewhere in the stack is a needle. Keep digging until you turn it up, then
   move on to a haystack twice the size that pays twice as well.

Keyboard shortcuts: `Space` scoops, `Enter` dumps.

## What's in it

- **12 shovels**, from bare hands (5 hay a scoop) to the Hand of Harvest
  (a million). Each one is drawn in your hands, bigger and shinier than the last.
- **Upgrades** — Grip Gloves (more hay per scoop), Sifting Screen (more coins per
  hay), Farmhands (idle shovelling while you browse the shop), and a Metal
  Detector that starts clicking when the needle is close.
- **Haystacks** are the prestige loop: the needle sits at a random hidden depth,
  the stack visibly shrinks as you search it, and each new stack is 2.3× bigger
  and pays 2.2× better.
- Procedural straw rendering, hay particles, floating coin numbers, synthesised
  sound effects (WebAudio, no asset files), and autosave to `localStorage`.

## Running it

Just open `index.html` in a browser. To serve it locally instead:

```sh
npx serve .     # or: python3 -m http.server
```

## Hosting on GitHub Pages

The site is the repository root on `main` — plain static files, no build step, all
asset paths relative, so it works from a project subpath. `.nojekyll` keeps Pages
from running the files through Jekyll.

To turn it on: **Settings → Pages → Build and deployment → Source: Deploy from a
branch**, then pick **`main`** and **`/ (root)`** and save. The first build takes a
minute; after that every push to `main` redeploys automatically.

Progress is saved in `localStorage` under `needleInHaystack.save.v1`. The
**Reset everything** button in the stats panel (📊) wipes it.

## Layout

| File | What it does |
| --- | --- |
| `index.html` | Canvas, HUD, shop drawer, modals |
| `style.css` | Barn-themed UI, responsive down to small phones |
| `game.js` | Game state, economy, canvas scene, input, save/load |
