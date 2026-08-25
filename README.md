<div align="center">

# 🎯 WARG Platform

**Turn your campus into the game.**

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8+-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9-199900?logo=leaflet&logoColor=white)](https://leafletjs.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](#license)

</div>

---

## About the Project

WARG Platform is a location-based Alternate Reality Game (ARG) and interactive scavenger hunt system designed for the Wits University campus. It allows members of the university to create and participate in custom, location-based ARGs and interactive scavenger hunts with and against others. It solves the lack of whimsical fun and shortage of adventure on campus by providing a platform that empowers users to create their own game logic and plot geospatial data.

---

## ✨ Features

The platform's features are categorized into three development tiers:

<details>
<summary><strong>🟢 Basic Tier</strong></summary>

*   **Geospatial Core & Validation:** Interactive map displaying key points of interest. Player location is verified by the server when interacting with events.
*   **Gameplay Engine & State Management:** Server-side evaluation of puzzles and inputs to ensure secure progress tracking.
*   **Authoring Console:** Basic creator studio to plot geographic nodes, write clues, and define puzzle answers.
*   **Access & Roles:** Standardized user authentication separating Player capabilities from Administrator oversight.

</details>

<details>
<summary><strong>🟡 Intermediate Tier</strong></summary>

*   **Offline Resilience:** Client caching of active puzzles for network dead-zones on campus, with local storage and delayed server validation.
*   **Heuristic Anti-Spoofing:** Location checks analyzing player movement over time, detecting impossible journeys or excessive speeds.
*   **Branching Logic:** Enhanced creator studio supporting branching narrative trees and multimedia clue uploads.
*   **Curation:** Pipeline for drafting, reviewing, scheduling, and retiring ARGs.
*   **Meta-Progression:** Linking events into rigid, sequential trails.
*   **Social & Rating Subsystem:** Player profiles, social following, automated leaderboards, flagging content, and an interactive commenting system for hints and feedback.

</details>

<details>
<summary><strong>🔴 Advanced Tier</strong></summary>

*   **Live Synchronization (Co-op Puzzles):** Live-play mechanics allowing multiple players in collaborative or competitive ARG instances using WebSockets (e.g., socket.io).
*   **Augmented Reality (AR) & Environmental Mechanics:** Canvas-based minigames, AR overlay viewports, Shape Matching (via python API with Jaccard index), and Colour Matching (HSV colour-space with Bhattacharyya distance).
*   **Behavioral Trust Profiles:** Anti-spoofing mechanism utilizing drift detection, pedometer integration, and speed detection to build trust scores and flag suspicious accounts.
*   **Algorithmic Routing:** Assistance for creators to ensure accessible walking paths, avoid unsafe clustering, and balance geographic spread.
*   **Creator Analytics:** Performance dashboards with deep engagement metrics.
*   **Push Notification Subsystem:** Alerts for players when followed creators publish new ARGs.

</details>

---

## 🏗️ Architecture & Technology Stack

The system operates using a client-server architecture built on a microservices model.

| Layer | Technology | Role |
|-------|-----------|------|
| **Backend** | Node.js + Express | Routing, HTTP API endpoints |
| **Database** | MySQL (SRID 4326 / WGS 84) | Relational data with spatial extensions for `POINT` geometry waypoints |
| **ORM** | Sequelize | Safe, scalable, structured data querying |
| **Maps** | Leaflet | Geolocation via `navigator.watchPosition()` |
| **Auth** | Google OAuth | External identity provider |
| **Scanning** | html5-QRCode | Barcode & QR asset tagging |
| **Testing** | Jest + CI/CD | Unit tests and automated pipelines |
| **VCS** | Git (Git-E) | Version control and collaboration |

---

## 🚀 Quick Start

```bash
# 1. Clone the repository
git clone <repo-url> && cd WARG-Platform

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env    # then fill in your DB and OAuth credentials

# 4. Start the dev server
npm run dev
```

> See [DEPLOYMENT.md](./DEPLOYMENT.md) for full production setup instructions.

---

## ☁️ Deployment

The platform is hosted across three managed services:

| Layer | Service | Purpose |
|-------|---------|---------| 
| **Database** | [Aiven for MySQL](https://aiven.io) | Managed MySQL with spatial extensions & SSL |
| **Backend** | [Render](https://render.com) | Node.js / Express API server |
| **Frontend** | [Vercel](https://vercel.com) | Static HTML/CSS/JS client delivery |

---

## 🎨 Design System (VJB System)

The WARG platform's visual language is built on the **VJB System**, which follows these core principles:

1.  **Exploration First:** Encourage curiosity and discovery through clear navigation.
2.  **Clarity Over Decoration:** Prioritize usability and readability before visual complexity.
3.  **Consistency Builds Trust:** Prefer reusable patterns over unique solutions.
4.  **Gameplay Comes First:** The interface should support the game, not distract from it.
5.  **Design for Growth:** The system should remain scalable as new features are introduced.

### Colour Palette

| Swatch | Name | Hex |
|--------|------|-----|
| ![#99ACFF](https://via.placeholder.com/12/99ACFF/99ACFF.png) | P4 Phosphor Tint (Primary Accent) | `#99ACFF` |
| ![#33FF33](https://via.placeholder.com/12/33FF33/33FF33.png) | P1 Phosphor (Secondary Accent) | `#33FF33` |
| ![#C0B89B](https://via.placeholder.com/12/C0B89B/C0B89B.png) | Computational Beige (Brand Primary) | `#C0B89B` |
| ![#12100E](https://via.placeholder.com/12/12100E/12100E.png) | Console Black (UI Background) | `#12100E` |

### Typography & Spacing

*   **Typeface:** Inter (optimised specifically for mobile).
*   **Layout Grid:** 4 columns, 24px margin, 16px gutter.
*   **Spacing System:** 8-point system (4, 8, 16, 24, 32, 48, 64px).
*   **Border Radius:** 12px for buttons/inputs, 16px for cards/images.

### Colour System Guidelines

*   Limit palette to 3 main colors.
*   Use accent colors sparingly.
*   Group content by color coding and use color to guide action.
*   Ensure text contrast meets WCAG.

---

## 🤝 Contributions
This project is the work of Luc & Friends. Special thanks to the team - Zaeem, Yami, and Chris.

> See [METHODOLOGY.md](./METHODOLOGY.md) for our day-to-day development process, [MEETINGS.md](./MEETINGS.md) for our stakeholder meeting notes, and [WARG_GIT_Policy.pdf](./MiscellaneousDocumentation/WARG_GIT_Policy.pdf) for our version control conventions.

---

## 📄 License

This project is developed as part of the Software Design Project at the University of the Witwatersrand.