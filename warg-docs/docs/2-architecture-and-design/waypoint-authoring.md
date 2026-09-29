---
sidebar_position: 5
---

# Waypoint Authoring System

The Creator Studio allows authors to construct ARGs by placing and linking waypoints. Under the hood, an ARG is represented as a **Directed Graph**, where Waypoints are **Nodes** and the navigational paths between them are **Edges**.

The WARG platform's authoring and game progression systems are intentionally permissive to allow for a variety of game types, from linear scavenger hunts to open-world exploration.

## 1. Graph Structure

- **Nodes (Waypoints)**: Individual challenges, locations, or story beats.
- **Edges (Connections)**: The sequential flow from one waypoint to the next, which can optionally include branching logic (triggers based on pass/fail outcomes).

## 2. Detecting the Beginning

The game engine dynamically determines the starting point(s) of an ARG when a player begins a session, based entirely on the graph's edges:

- **Root Nodes (In-degree of 0)**: Any waypoint that has no edges pointing *to* it is considered a starting node. 
- **Multiple Starting Nodes**: If the graph has multiple nodes with an in-degree of 0, **all of them** are unlocked simultaneously when the player starts the game. This allows creators to build non-linear or "choose your own path" starting areas.
- **Disconnected Graphs / No Edges**: If the creator provides no edges at all, the engine treats every waypoint as a root node, unlocking all waypoints immediately. This is ideal for "open world" collection games.
- **Closed Loops**: If every node in the graph has an incoming edge (i.e. a massive closed cycle with no distinct beginning), the engine falls back to treating **all waypoints in the ARG** as root nodes, unlocking everything at the start.

## 3. End of the Graph and Game Completion

There is no explicitly designated "End Node". The game engine dynamically evaluates game completion after every minigame submission.

- **Completion State**: The game is considered complete when a player has completed waypoints, and the system can find **no further unlocked waypoints** to proceed to. 
- If a player reaches a node with an out-degree of 0 (no outgoing edges), completing it will naturally conclude the game (provided no other branches are still active).

## 4. Cycle Detection (Directed Acyclic Graphs)

While the backend game engine is technically permissive, the **Creator Studio** explicitly enforces a Directed Acyclic Graph (DAG) structure to prevent broken puzzle flows and infinite loops.

- **Cycle Validation (Frontend)**: When an author attempts to draw a new edge between two waypoints, the Studio's canvas runs a Breadth-First Search (BFS) pathfinding algorithm (`hasPath`).
- If the BFS discovers that a path already exists from the target node back to the source node, creating the edge would form a closed loop.
- **Outcome**: The UI immediately blocks the edge creation and alerts the author: "Cannot connect waypoints: This would create a cyclic loop. WARGs must be a directed acyclic graph (DAG)." 

## 5. Storage

The graph is stored relationally in MySQL without any complex serialization:
- `waypoints` table stores the node geometries and metadata.
- `waypoint_edges` table (a joining table) stores `from_waypoint_id`, `to_waypoint_id`, and `conditions_json` to represent the directed graph and branching logic.
