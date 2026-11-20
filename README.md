# Vice Panels — Cover Art Maker

![make.fun bounty](https://make.fun/badge/gta6-cover-art-01.svg)
![rank](https://make.fun/badge/gta6-cover-art-01/elangramsyah/gta6-cover-art/rank.svg)
![reward](https://make.fun/badge/gta6-cover-art-01/elangramsyah/gta6-cover-art/reward.svg)

Vice Panels is an offline web app that turns a person's own photos and a caption into bold
multi-panel cover art in the classic poster style — white-framed panels, a sunset or neon colour
grade, and big display lettering — exported as a PNG to share. It was built for the make.fun
bounty [Make GTA 6 Cover Art](https://make.fun/bounty/gta6-cover-art-01). All artwork, lettering
and code are original to this project; the display face is Anton, vendored under the SIL Open Font
License (see `app/fonts/OFL.txt`).

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. There is no build step and the app makes no
network requests: photos are read from your machine and never uploaded. You can equally serve the
`app/` folder with any static file server.

## What it does

- **Photos, yours or the samples** — add several photos by file picker or drag and drop, or start
  from the three bundled samples (a pier, a boulevard, a neon car). Click a panel on the cover to
  select it, then click a photo to place it; double-click a photo (or use *Fill all panels*) to run
  one photo through the whole cover. Drag on the cover to pan the selected panel's photo, scroll
  or use the slider to zoom it, and clear a panel at any time.
- **Five panel layouts** — Hero + Trio, Mosaic Six, Diagonal Slash, Duo Split and Quad Grid, all
  drawn with the chunky white frames of the poster style.
- **Six colour grades** — Vice Sunset, Neon Nights, Golden Hour, Noir, Pastel Vice and Clean,
  each a mix of canvas filtering and gradient washes with a vignette.
- **Caption lettering** — two big lines in the vendored Anton face with a solid, sunset-gradient
  or neon fill, an optional dark outline, a size slider, top or bottom placement, and a
  letterspaced subtitle with flanking rules.
- **Export** — one click renders the cover as a PNG at 1080 × 1080, 1080 × 1350 or 1920 × 1080;
  the on-screen preview can be switched to any of those sizes too.

## How the entry is put together

- `main.ts` (Node 22, standard library only) hands the entry in: it checks the entry's shape,
  copies `app/` and `screenshots/` to the output directory and writes `dossier.json` with the
  vendored make.fun library in `vendor/makefun-app.ts` (the kit's copy, unchanged).
- `app/` is the whole web app as static files: `index.html`, `style.css`, ES modules under
  `app/src/` (`layouts.js`, `grades.js`, `cover.js`, `main.js`, `shots.js`), the Anton font under
  `app/fonts/`, and sample photos under `app/samples/`.
- `screenshots/` holds the shots listed in `shots.json`; each is reproducible by serving the app
  and opening it with the shot's query string (for example `?shot=cover&layout=hero&photo=car`).
- `serve.ts` is a tiny static server for trying the app locally.

## License

MIT — see `LICENSE`. The Anton font is licensed separately under the SIL Open Font License 1.1
(`app/fonts/OFL.txt`).
