# 🌾 Needle in a Haystack

A small 3D game about the world's least efficient search problem. You are a
farmhand in a barn full of hay. A needle is buried in **one** of the piles. Walk
over, dig it out one shovel-load at a time, sift it on the conveyor, and keep going
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
2. Carry the load to the **conveyor sifter** in the corner and tip it into the
   hopper. The belt carries it to the crate, and sifted hay pays coins.
3. The needle is buried at a hidden depth in one pile. Dig that pile down far
   enough and you will **see it** lying in what is left, glinting — walk over
   and grab it. Digging the wrong pile is never wasted; it still pays.
4. Spend coins on shovels and gear between barns. Bigger shovels unlock as you
   clear barns, so the farm opens up gradually rather than all at once.

## What's in it

- **A barn you walk around** — procedural low-poly barn interior and exterior,
  lanterns, dust in the light shafts, a farmhand with a hand-animated walk,
  dig and dump cycle, and a conveyor sifter running in the corner.
- **A walk-in cutscene** for every barn: the doors swing open, the camera
  follows you inside, and the barn number lands on screen. Skippable.
- **Spatial search, not tapping.** Each barn has labelled piles (A, B, C…) and
  exactly one holds the needle, at its own depth and its own spot inside the
  pile. The pile card shows how far down you have dug the pile you're standing
  at. The needle is a real object: uncover it and it lies there in the hay
  until you pick it up — your hired hands can dig it out for you, but only you
  can take it.
- **Needle Sense** — a detector that reads how far off the nearest *metal* is
  *from where you stand*, and never names the pile. One reading narrows it to a
  ring around you; walk somewhere else, take another, and the rings cross.
  Levels buy precision — warm/hot/burning, then metres to the nearest five,
  then metres — not the answer.
- **Odds and ends in the hay.** Horseshoes, a rusty key, a tin can, an old
  boot, a pocket watch, a wedding ring — buried at their own depths, worth
  coins, and dug out the same way the needle is. The metal ones are what the
  detector actually hears, so a promising reading can turn out to be a
  horseshoe; digging the scrap out is how you clear the noise.
- **8 shovels and 4 pieces of gear**: work boots, sifting screen, the detector,
  and farmhands — hired hands who actually walk the barn, each picking a pile,
  digging a load, carrying it to the conveyor and heading back for more.
- **My Farmer** — a wardrobe you spend barn coins in, with a turntable preview:
  55 outfits shelved under Colours, Flags (26 of them, named for the countries
  they belong to), Camo (woodland through digital, tiger stripe and one very
  loud pink) and Other (check, hi-vis, cow print, pinstripe, disco); 20 hats
  (caps, cowboy, sombrero, tricorn, wizard, hard hat, a bunny head, a pumpkin
  head, a traffic cone, a crown, and the Polite Carrot mascot worn as a full
  head); 15 facial expressions from Big Grin through Eyepatch and Monocle to a
  Full Beard; and 14 shovel skins (gold, trident, frying pan, umbrella, bone
  spade, candy cane, neon, diamond). The preview turns by itself and can be
  dragged round by hand.
  Cosmetic only — every dig stat still comes from the shop. Patterns are drawn procedurally at
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
| `js/cosmetics.js` | Outfits, hats, faces, shovel skins and their procedural textures |
| `js/wardrobe.js` | The My Farmer preview scene and its auto-framing |
| `js/helpers.js` | Hired farmhands: their round trip, steering and animation |
| `js/audio.js` | WebAudio sound effects |
| `assets/` | Polite Carrot logo and wordmark for the boot lockup |
| `vendor/three.min.js` | three.js r160 (MIT, see `vendor/three.LICENSE`) |

The original 2D tap version lives in this repo's git history, before the 3D rework.
