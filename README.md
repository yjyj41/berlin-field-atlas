# Berlin Field Atlas

[Open the interactive map](https://yjyj41.github.io/berlin-field-atlas/)

Explore Berlin in an isometric 3D map. No account or installation is required.

- 112 architectural stops with credited photographs and approximate exterior material studies.
- Five art spaces and four clubs, with location markers and official visitor links.
- 77 km² of central Berlin, using official LoD2 building geometry.
- Toggle neighbourhood colours, rail corridors, streets, parks and water; filter by place type or search.
- Mark places visited. Architecture reveals exterior colours; venue markers record a visit without changing their host building.
- Download 77 source building tiles as Rhino 6/7 mesh files.

There are no decorative people or trees. Visit records, styles and layer preferences are saved only in your browser. Records from an older website address do not automatically transfer here.

## Run locally

Install Node.js, clone this repository and run:

```sh
node serve.cjs
```

Open http://127.0.0.1:4186/ in a current browser with WebGL and gzip stream support. No package installation or build step is needed. Opening `index.html` directly from disk will not work.

The HTML, CSS and JavaScript in this repository are the editable runtime source. `field-app.js` is the entry point and `scene.js` renders the map. GitHub Pages publishes the root of `main`; push reviewed changes to that branch to update the website. `.nojekyll` preserves static assets.

## Geometry and downloads

One model unit is one metre. The common origin is [390000, 5820000, 20] in EPSG:25833 / DHHN2016. Keep this origin when combining downloaded models.

The overview uses simplified official footprints and flat roofs; zooming loads the official LoD2 roof surfaces. Detailed regions load within a memory budget and offscreen regions are released. Photographs load when selected. Rhino downloads are separate and are not fetched during normal browsing.

This is an architecture guide, not a measured survey or BIM model. Ground elevations are inferred. Three landmarks have additional interpretive display details. Most buildings retain generalized LoD2 massing. Visited materials are colour/pattern studies, not photographic facade textures.

Rhino downloads contain original source building meshes only, without ground, custom display refinements or visited materials. Venue cards do not contain dedicated building models or photographs. Transport overlays represent physical corridors, not live services or route itineraries. Check the linked venue/operator for current visitor information.

## Attribution

Official 3D building data: Geoportal Berlin, DL-DE-Zero 2.0. Ground and city layers: © OpenStreetMap contributors, ODbL 1.0. Each photograph retains its own licence and credits, displayed in its card and recorded in `photo-credits.json`.

See [ATTRIBUTION.md](ATTRIBUTION.md) and the bundled library licence. Public availability does not replace the separate licences of data, photographs and software dependencies.

[London Field Atlas](https://yjyj41.github.io/london-field-atlas/)
