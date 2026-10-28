# Data and asset attribution

## 3D building data

Official Berlin LoD2 building data from [Geoportal Berlin](https://gdi.berlin.de/data/a_lod2/atom/), under [Datenlizenz Deutschland – Zero – Version 2.0](https://www.govdata.de/dl-de/zero-2-0). `data/catalog.json` records source tile URLs, hashes, coordinate systems, source object assignments and modelling limitations.

Runtime geometry is transformed into the shared local metre coordinate system. Some landmark details are interpretations. Overview meshes use simplified footprints and flat roofs. Rhino downloads retain source building geometry, without added display details.

## Ground and city layers

© [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), under [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/). Geographic extracts were obtained from [Geofabrik](https://download.geofabrik.de/europe/germany/berlin.html). Roads, parks, water, district boundaries and station/venue points use this data. Keep attribution and follow the applicable database licence when redistributing or adapting it. Ground heights and road widths are inferred.

## Photographs

Individual authors, source pages and licence links are recorded in `photo-credits.json` and each stop's `photo` record in `data/catalog.json`. Each image retains its own licence. The website displays the credits and modification notice beneath the image. Photographs were resized/compressed; preserve their credits and comply with the linked licences on reuse.

Venue card illustrations are category artwork, not photographs of the premises.

## Software

Three.js: MIT licence; see `vendor/LICENSE` and the source headers. Third-party licences remain in effect independently of the atlas application. No blanket licence is granted over third-party material.
