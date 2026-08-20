---
sidebar_position: 4
---

# Synchronisation (Co-op Puzzles)

Live-play mechanics allow multiple players to participate in collaborative or competitive ARG instances concurrently.

## Turn-Based Games and Puzzles

Servers act as the authority on game state and rules. The Express server represents game state as a JSON object and verifies player actions when a move is submitted. This is implemented over a WebSocket protocol for concurrent games. For every validated move, data is written to the database to persist state in the event of a lost or spotty connection.

## Live-Play Games and Puzzles

Using an appropriate tick speed, player inputs are transmitted and processed. At the end of each tick, a new game state is broadcast to players in the geofenced location, implemented using WebSockets (Socket.io) with dumb clients. To smooth the transition between game-ticks, rendering occurs at a higher refresh rate than the tick rate, with states interpolated between ticks.

These primitives underpin the [PvP and social minigames](./minigames#pvp-and-social-minigames) — Point Domination, Landmark Relay, and AR Photo-Bombs.

:::note AI Declaration
The source implementation-details document that this and the preceding technical pages are derived from was partially generated, reviewed, and edited with: Gemini Web [Gemini 3.1 Pro].
:::
