# WARG Platform - Documentation

## About the Project

WARG Platform is a location-based Alternate Reality Game (ARG) and interactive scavenger hunt system designed for the Wits University campus. It allows members of the university to create and participate in custom, location-based ARGs and interactive scavenger hunts with and against others. It solves the lack of whimsical fun and shortage of adventure on campus by providing a platform that empowers users to create their own game logic and plot geospatial data.

## Features

The platform's features are categorized into three development tiers:

### Basic Tier
*   **Geospatial Core & Validation:** Interactive map displaying key points of interest. Player location is verified by the server when interacting with events.
*   **Gameplay Engine & State Management:** Server-side evaluation of puzzles and inputs to ensure secure progress tracking.
*   **Authoring Console:** Basic creator studio to plot geographic nodes, write clues, and define puzzle answers.
*   **Access & Roles:** Standardized user authentication separating Player capabilities from Administrator oversight.

### Intermediate Tier
*   **Offline Resilience:** Client caching of active puzzles for network dead-zones on campus, with local storage and delayed server validation.
*   **Heuristic Anti-Spoofing:** Location checks analyzing player movement over time, detecting impossible journeys or excessive speeds.
*   **Branching Logic:** Enhanced creator studio supporting branching narrative trees and multimedia clue uploads.
*   **Curation:** Pipeline for drafting, reviewing, scheduling, and retiring ARGs.
*   **Meta-Progression:** Linking events into rigid, sequential trails.
*   **Social & Rating Subsystem:** Player profiles, social following, automated leaderboards, flagging content, and an interactive commenting system for hints and feedback.

### Advanced Tier
*   **Live Synchronization (Co-op Puzzles):** Live-play mechanics allowing multiple players in collaborative or competitive ARG instances using WebSockets (e.g., socket.io).
*   **Augmented Reality (AR) & Environmental Mechanics:** Canvas-based minigames, AR overlay viewports, Shape Matching (via python API with Jaccard index), and Colour Matching (HSV colour-space with Bhattacharyya distance).
*   **Behavioral Trust Profiles:** Anti-spoofing mechanism utilizing drift detection, pedometer integration, and speed detection to build trust scores and flag suspicious accounts.
*   **Algorithmic Routing:** Assistance for creators to ensure accessible walking paths, avoid unsafe clustering, and balance geographic spread.
*   **Creator Analytics:** Performance dashboards with deep engagement metrics.
*   **Push Notification Subsystem:** Alerts for players when followed creators publish new ARGs.

## Architecture & Technology Stack

The system operates using a client-server architecture built on a microservices model.

*   **Backend:** Node.js with Express middleware for robust routing and hand-written HTTP API endpoints.
*   **Database:** MySQL to manage highly relational data, utilizing spatial extensions (SRID 4326 / WGS 84) to store ARG waypoints as "POINT" geometry types.
*   **ORM Layer:** Sequelize ORM for safe, scalable, and structured data querying.
*   **Frontend Geolocation:** Leaflet map interfacing directly with the device's native geolocation API (`navigator.watchPosition()`).
*   **Authentication & Security:** External libraries such as Google's OAuth.
*   **Minigames Integrations:** `html5-QRCode` for scannable asset tags and barcodes.
*   **Quality Assurance:** Jest unit tests and CI/CD pipelines for automated testing and deployment.
*   **Version Control:** Git-compliant management on the Git-E platform.

## Design System (VJB System)

The WARG platform's visual language is built on the **VJB System**, which follows these core principles:
1.  **Exploration First:** Encourage curiosity and discovery through clear navigation.
2.  **Clarity Over Decoration:** Prioritize usability and readability before visual complexity.
3.  **Consistency Builds Trust:** Prefer reusable patterns over unique solutions.
4.  **Gameplay Comes First:** The interface should support the game, not distract from it.
5.  **Design for Growth:** The system should remain scalable as new features are introduced.

### Colour System Guidelines
*   Limit palette to 3 main colors.
*   Use accent colors sparingly.
*   Group content by color coding and use color to guide action.
*   Ensure text contrast meets WCAG.

#### Primary Palette
*   **Primary Accent (P4 Phosphor Tint):** `#99ACFF`
*   **Secondary Accent (P1 Phosphor):** `#33FF33`
*   **Brand Primary (Computational Beige):** `#C0B89B`
*   **UI Background (Console Black):** `#12100E`

### Typography & Spacing
*   **Typeface:** Inter (optimised specifically for mobile).
*   **Layout Grid:** 4 columns, 24px margin, 16px gutter.
*   **Spacing System:** 8-point system (4, 8, 16, 24, 32, 48, 64px).
*   **Border Radius:** 12px for buttons/inputs, 16px for cards/images.