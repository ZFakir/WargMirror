---
sidebar_position: 3
---

# Minigame Implementations

This page outlines the technical implementation approach for each of WARG's location-based minigames.

## Scannable Asset Tags (Barcode Integration)

Creators link barcodes to puzzles within their creator studio using `html5-qrcode`, which captures barcode data and triggers a callback with the decoded value. Players scan barcodes, which are then validated against the data set up by the author.

## AR and Environmental Mechanics (Shape Matching)

- **AR overlay viewport:** basic 2D minigames overlay silhouettes and cutouts using the HTML5 `canvas` object.
- **Shape matching engine:** implemented as a lightweight Python inference microservice (FastAPI/Flask), since Express is single-threaded and cannot run a Segment Anything Model directly. Matching is fuzzy, using the Jaccard index against a threshold.
- **Colour-matching engine:** relies on HSV colour-space encoding. Uploads are tested against a reference colour histogram using the Bhattacharyya distance.
- **Basic canvas games:** simple minigames built directly on the HTML5 `canvas` API.

## Texture Matching

Players photograph a surface (brick, concrete, cladding, cobblestone) matching a creator-set reference material.

- **Descriptor extraction:** a Local Binary Pattern (LBP) histogram is extracted from the greyscale-converted upload — a lightweight, rotation-invariant texture descriptor, computed client-side via WebAssembly or on the shared Python inference microservice.
- **Matching:** the extracted descriptor is compared to the reference using a chi-squared distance metric. This may later be upgraded to embedding-based similarity (e.g. cosine distance between MobileNet feature vectors) without changing the client-facing API.

## Shadow Tracing

Players must be physically present at a waypoint at a specific time of day and trace the shadow currently cast by a building or structure.

- **Expected shadow computation:** each waypoint stores a building footprint polygon and approximate height in MySQL. The client computes solar azimuth/elevation for the waypoint's coordinates and current timestamp (e.g. via SunCalc.js), projecting an expected shadow polygon onto the ground plane.
- **Capture and validation:** the player's traced polygon is submitted alongside the device timestamp and geofenced location, and compared against the server-computed expected shadow using the same Jaccard index engine as shape matching.
- **Time-gating:** since the correct answer changes throughout the day and seasons, this puzzle type is excluded from offline caching.

## Plaque and Inscription Hunt

Creators attach trivia questions to a waypoint at a statue, plaque, or dedication stone.

- **Data model:** each waypoint stores one or more question/answer pairs (short-text or multiple-choice) via a foreign key, allowing randomised or sequential presentation to reduce answer-sharing between players.
- **Validation:** answers are validated server-side (never client-side) to prevent inspection via browser dev tools. Free-text answers are normalised (case-folding, whitespace trimming, small edit-distance tolerance) to tolerate typos.
- **Offline support:** question payloads are cacheable, with answer validation queued for submission once connectivity is restored.

## Sign Hunt

A scavenger-hunt variant reusing the shape- and colour-matching engines, applied to campus wayfinding signage.

- **Checklist structure:** modelled as a creator-defined checklist — a set of waypoints tagged with a reference sign image, tracked per player per waypoint.
- **Matching:** uploads are matched via the Jaccard-index shape match, with colour matching as a secondary check where signage uses consistent brand colours. The hunt completes once all checklist items are found.

## Shortest Path Finder

Players identify or walk the shortest real-world route between two campus landmarks.

- **Canonical path storage:** the walkable path network is pre-computed by creators (or derived from OpenStreetMap campus data) and stored as a MySQL `LINESTRING` per route.
- **Two capture modes:** *Drawn* — the player sketches a route on the Leaflet map. *Walked* — the route is recorded as a breadcrumb trail via `watchPosition()` as the player physically walks it.
- **Validation:** the submitted path is compared to the canonical `LINESTRING` using a discrete Fréchet distance calculation (Turf.js client-side for immediate feedback, server-side recomputation for authoritative validation). Walked-mode submissions are additionally subject to the anti-spoofing checks.

## Height Guesser

Players estimate the height of a building, statue, or landmark using an in-AR measuring tool.

- **AR measurement:** uses the device's AR hit-testing (WebXR Device API where available) to place two anchor points and triangulate real-world distance between them.
- **Fallback:** on devices without WebXR hit-testing, the player places a virtual reference object of known height and adjusts a scale slider until it visually matches, inferring height proportionally.
- **Validation:** the estimate is compared to the true height stored against the waypoint, marked solved within a configurable tolerance (e.g. ±10%).

## Then-and-Now AR Overlay

Creators upload an archival photograph from a fixed vantage point; players must stand at that vantage point and align their live camera feed with the historical image.

- **Vantage point and pose data:** each waypoint stores the geofenced standing location, target compass heading, and the archival image. Compass heading is compared against the device orientation API to guide the player.
- **Alignment overlay:** the archival image is rendered as a semi-transparent canvas layer once the player is within the geofence and facing approximately the correct heading.
- **Capture validation:** the live frame is sent to the Python inference microservice, where ORB/SIFT keypoint matching compares it to the archival photo — more robust than raw pixel similarity across years of lighting/wear differences.

## Symmetry Finder

Players identify an axis of symmetry in a symmetrical architectural feature and trace it on the live camera feed.

- **Axis capture:** the player draws a line on the canvas overlay over a captured frame.
- **Validation:** the frame is mirrored about the drawn axis, and the mirrored half compared against the opposite half using a structural similarity index (SSIM), computed by the same Python inference microservice. The threshold is deliberately generous to account for camera skew and imperfect real-world symmetry.

## PvP and Social Minigames

These build on the [Synchronisation infrastructure](./synchronisation) and the Social and Rating Subsystem for team formation and moderation.

### Point Domination

Contested campus zones (courtyards, quads, plazas) are modelled as MySQL `POLYGON` geometries, each associated with a controlling faction.

- **Capture logic:** while a team's players are physically present in a zone, capture-progress accrues per tick. Contested captures (opposing teams present simultaneously) pause or reverse progress to discourage camping.
- **Live-play integration:** uses the tick-based live-play model with Socket.io broadcasting updated zone-ownership state, with clients interpolating between broadcasts for smooth UI.
- **Persistence:** zone ownership and capture history are written on ownership change, not every tick, to avoid excessive write load.

### Landmark Relay

A team-based hunt where each member is assigned a different waypoint; visiting it yields a fragment (partial code, image tile, puzzle piece).

- **Turn/coordination model:** implemented as a turn-based game, with the Express server holding authoritative relay state and validating each fragment collection server-side.
- **Assembly:** once all fragments for a team are collected, the server assembles and unlocks the combined result, broadcasting completion via WebSocket.
- **Offline caveat:** excluded from offline caching, since fragment state must stay synchronised across teammates in real time.

### AR Photo-Bombs

A player or creator places a virtual object/mascot at a specific real-world pose; other players must locate it in AR and reproduce a matching "photo."

- **Placement data:** the placing player's device pose (WebXR/ARCore tracking) is stored alongside the waypoint, since the challenge involves vantage point as well as location.
- **Discovery and validation:** primarily compares the finding player's device pose against the stored placement pose within a tolerance — more robust and less compute-intensive than keypoint matching at scale. The in-AR screenshot is still captured and stored as user-generated content.
- **Moderation:** captured images surface through the Social and Rating Subsystem for rating, flagging, and creator moderation of seeded challenges.
