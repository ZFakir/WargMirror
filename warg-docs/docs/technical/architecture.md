---
sidebar_position: 1
---

# Architecture & Technology Stack

The system operates using a client-server architecture built on a microservices model.

| Layer | Technology | Role |
|---|---|---|
| Backend | Node.js + Express | Routing, HTTP API endpoints |
| Database | MySQL (SRID 4326 / WGS 84) | Relational data with spatial extensions for `POINT` geometry waypoints |
| ORM | Sequelize | Safe, scalable, structured data querying |
| Maps | Leaflet | Geolocation via `navigator.watchPosition()` |
| Auth | Google OAuth | External identity provider |
| Scanning | html5-QRCode | Barcode & QR asset tagging |
| Testing | Jest + CI/CD | Unit tests and automated pipelines |
| VCS | Git (Git-E) | Version control and collaboration |

## Deployment

The platform is hosted across three managed services:

| Layer | Service | Purpose |
|---|---|---|
| Database | [Aiven for MySQL](https://aiven.io) | Managed MySQL with spatial extensions & SSL |
| Backend | [Render](https://render.com) | Node.js / Express API server |
| Frontend | [Vercel](https://vercel.com) | Static HTML/CSS/JS client delivery |

Full production setup steps (Aiven connection, Render config, Vercel rewrites, environment variables) are covered in the repository's `DEPLOYMENT.md`.

## Core Technology Choices

- **Backend:** Express middleware backend to handle routing and API requests.
- **Database:** MySQL to manage relational data, including creators, geographic points of interest, and real-time player states.
- **ORM layer:** Sequelize sits between the backend and database for safe data querying.
- **Frontend Geolocation:** Leaflet map interfacing directly with the device's native geolocation API.

See [Minigames & Support Systems](./minigames) for how this stack is used to implement individual gameplay mechanics.
