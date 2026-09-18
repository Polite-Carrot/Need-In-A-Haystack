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
- Main menu, pause menu, first-person / follow camera toggle, synthesised sound
  effects (no audio files), and autosave to `localStorage`.

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
| `js/ui.js` | Screens, HUD, shop rendering |
| `js/audio.js` | WebAudio sound effects |
| `vendor/three.min.js` | three.js r160 (MIT, see `vendor/three.LICENSE`) |

The original 2D tap version lives in this repo's git history, before the 3D rework.
