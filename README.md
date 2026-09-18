# 🌾 Need in a Haystack

A small 3D game about the world's least efficient search problem. You are a
farmhand in a barn full of hay. A needle is buried in **one** of the piles. Walk
over, dig it out one shovel-load at a time, sift it at the cart, and keep going
until the needle turns up — then move to a bigger barn.

Built with [three.js](https://threejs.org) (vendored, MIT). No build step, no
network calls, no dependencies to install.

**▶ Play it: https://polite-carrot.github.io/Need-In-A-Haystack/**

## How to play

| | Desktop | Touch |
| --- | --- | --- |
| Move | `W A S D` / arrow keys | left stick |
| Dig / sift | hold `Space` or `E` | hold the action button |
| Look around | drag the scene | drag the scene |
| Pause | `Esc` | ⏸ button |

1. Walk to a hay pile and **hold to dig** until your shovel is full.
2. Carry the load to the **sifter** by the doors and dump it. Sifted hay pays coins.
3. The needle sits at a hidden depth inside one pile — sift that pile deep enough
   and it turns up. Digging the wrong pile is never wasted; it still pays.
4. Spend coins on shovels and gear between barns. Bigger shovels unlock as you
   clear barns, so the farm opens up gradually rather than all at once.

## What's in it

- **A barn you walk around** — procedural low-poly barn interior and exterior,
  lanterns, dust in the light shafts, a farmhand with a hand-animated walk,
  dig and dump cycle.
- **A walk-in cutscene** for every barn: the doors swing open, the camera
  follows you inside, and the barn number lands on screen. Skippable.
- **Spatial search, not tapping.** Each barn has labelled piles (A, B, C…) and
  exactly one holds the needle. The pile card shows how deeply you have searched
  the pile you're standing at.
- **Needle Sense** — a detector that tells you how close you are, then which pile
  you're standing at, then marks the pile outright at level 3.
- **8 shovels and 4 pieces of gear**: work boots, sifting screen, farmhands who
  keep digging while you walk, and the detector.
- **My Farmer** — a wardrobe you spend barn coins in, with a turntable preview:
  13 outfits (camo, flags, hi-vis, one very loud pink), 13 hats (caps, cowboy,
  top hat, viking helm, a bunny head, a traffic cone, a crown, and the Polite
  Carrot mascot itself, smile and all) and 9 shovel skins (gold, trident,
  giant spoon, candy cane, diamond). Cosmetic only —
  every dig stat still comes from the shop. Patterns are drawn procedurally at
  runtime, so there are still no image assets in the repo.
- Main menu, pause menu, first-person / follow camera toggle, synthesised sound
  effects (no audio files), and autosave to `localStorage`.
- The shared **Polite Carrot boot lockup** on startup, ported from Color Match &
  Merge and Tide Runner so every title opens the same way. It holds for the house
  beat, waits for the barn to finish building, and hard-caps at 4s.

## Balance

Each barn has more piles and bigger piles than the last (`×1.5` hay), and pays
`×1.85` per hay. Shovels are gated behind barn levels as well as price, so
clearing barns — not grinding one — is what opens the next tier.

## Running it

Open `index.html` in a browser, or serve the folder:

```sh
npx serve .     # or: python3 -m http.server
```

Progress is saved in `localStorage` under `niah.save.v2`; **Erase save** on the
main menu clears it.

## Hosting on GitHub Pages

The site is the repository root on `main` — static files, relative paths, so it
serves from a project subpath. `.nojekyll` stops Pages running it through Jekyll.

**Settings → Pages → Build and deployment → Source: Deploy from a branch**, then
pick **`main`** and **`/ (root)`**.

## Layout

| Path | What it does |
| --- | --- |
| `index.html` | Canvas plus every UI overlay (menu, HUD, shop, cutscene, modals) |
| `css/style.css` | Barn-themed UI, responsive down to small phones |
| `js/world.js` | Renderer, barn geometry, hay piles, sifter, particles |
| `js/player.js` | Farmhand mesh, walk/dig animation, movement, camera rig |
| `js/game.js` | State, economy, barn flow, digging, input, save/load |
| `js/ui.js` | Screens, HUD, shop and wardrobe rendering |
| `js/cosmetics.js` | Outfits, hats, shovel skins and their procedural textures |
| `js/wardrobe.js` | The My Farmer preview scene and its auto-framing |
| `js/audio.js` | WebAudio sound effects |
| `assets/` | Polite Carrot logo and wordmark for the boot lockup |
| `vendor/three.min.js` | three.js r160 (MIT, see `vendor/three.LICENSE`) |

The original 2D tap version lives in this repo's git history, before the 3D rework.
