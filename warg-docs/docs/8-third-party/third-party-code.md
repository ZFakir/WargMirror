# Third-Party Code Documentation

This document outlines the third-party libraries, APIs, and external assets utilized within the WARG platform. Documenting these dependencies and the motivation behind their usage fulfills the **Third-Party Code Documentation** requirement for Sprint 2.

## Client-Side Dependencies

### 1. Leaflet.js (v1.9.4)
- **Usage**: Dynamically loaded via CDN in `scripts/components/MapModal.js` (`leaflet.min.js` and `leaflet.min.css`).
- **Purpose**: Provides the core interactive map interface for creating, editing, and playing WARGs. Used for rendering the map, placing waypoint markers, and drawing connection paths between them.
- **Motivation**: Leaflet is a lightweight, open-source JavaScript library for mobile-friendly interactive maps. It was chosen over heavier alternatives (like Google Maps SDK) because it is free, easy to integrate without complex API key management, and perfectly suited for the geographical requirements of a campus exploration game.

### 2. OpenStreetMap (OSM) Tiles
- **Usage**: Configured as the tile layer for the Leaflet map in `MapModal.js` (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`).
- **Purpose**: Serves the actual map imagery/tiles that Leaflet displays.
- **Motivation**: OpenStreetMap is a free, crowdsourced map of the world. Using OSM tiles avoids the usage limits and billing complexities of proprietary mapping services, ensuring the platform remains cost-effective and accessible during development and deployment.

### 3. DiceBear Avatars API (v9)
- **Usage**: Used extensively across HTML templates (`home.html`, `user-profile.html`, etc.) and JavaScript components (`user-profile.js`, `signup.js`, `game.js`).
- **Purpose**: Generates procedural profile pictures (e.g., `identicon` or `pixel-art` styles) using a seed (like the user's name).
- **Motivation**: Improves the user experience by immediately providing a visually distinct and personalized avatar upon account creation. It removes the immediate burden of implementing a custom avatar image upload pipeline for MVP, while keeping the UI vibrant.

### 4. Google Fonts
- **Usage**: Preconnected and loaded in the `<head>` of all HTML files (`fonts.googleapis.com` and `fonts.gstatic.com`).
- **Purpose**: Provides modern typography for the platform's UI.
- **Motivation**: System fonts can look inconsistent across different operating systems. Google Fonts ensures a unified, modern, and polished aesthetic across all devices, directly contributing to the "Aesthetics" and "Design" rubric categories.

### 5. Lorem Picsum (picsum.photos)
- **Usage**: Used as placeholder source URLs for hero banners in `create_warg.html` and `edit_warg.html`.
- **Purpose**: Provides randomized, high-quality placeholder images.
- **Motivation**: Ensures the UI layout remains structurally sound and visually representative of the final product even when users haven't uploaded their own custom WARG banner images yet.

## Server-Side Dependencies (Node.js/Express)

### 1. Express.js (`express`)
- **Usage**: The core web framework running the Node.js backend (`server.js`).
- **Purpose**: Handles HTTP routing, middleware processing, and API endpoint definitions.
- **Motivation**: Express is the industry standard for Node.js REST APIs. It provides a robust, minimalist feature set that perfectly aligns with our non-monolithic architectural requirement, allowing us to easily build an API-only backend.

### 2. Sequelize ORM (`sequelize`, `mysql2`)
- **Usage**: Database interaction layer configured in `server/src/models/index.js`.
- **Purpose**: Maps relational database tables to JavaScript objects, handles queries, relationships (Associations), and data validation.
- **Motivation**: Sequelize abstracts complex SQL queries into readable JavaScript, preventing SQL injection vulnerabilities. It makes managing relationships (e.g., WARGs to Waypoints) much more maintainable than writing raw SQL, improving developer velocity.

### 3. Passport.js (`passport`, `passport-local`, `passport-google-oauth20`)
- **Usage**: Authentication middleware used in `server/src/routes/authRoutes.js`.
- **Purpose**: Handles user sign-up, local login (email/password), and OAuth (Google Sign-In).
- **Motivation**: Writing a custom authentication system is insecure and error-prone. Passport provides a modular, battle-tested standard for authenticating users. Integrating Google OAuth also fulfills the rubric requirement of using established practices for Authentication & Security.

### 4. Bcrypt.js (`bcryptjs`)
- **Usage**: Used in `server/src/models/User.js`.
- **Purpose**: Cryptographically hashes and salts user passwords before saving them to the database.
- **Motivation**: Storing plain-text passwords is a critical security flaw. Bcrypt is the standard cryptographic hash function designed to be computationally expensive, protecting against brute-force attacks.

### 5. Express Session (`express-session`, `express-mysql-session`)
- **Usage**: Configured in `server.js` to manage user sessions.
- **Purpose**: Maintains stateful login sessions between the stateless frontend and backend by storing session IDs in cookies and session data in the MySQL database.
- **Motivation**: Storing sessions in memory causes data loss when the server restarts. Using `express-mysql-session` ensures persistent, scalable sessions that survive deployment restarts.

### 6. Multer (`multer`)
- **Usage**: Used in routes that require file uploads (e.g., `server/src/routes/minigameRoutes.js`).
- **Purpose**: Parses `multipart/form-data` requests, allowing users to upload images (like WARG banners or minigame reference photos).
- **Motivation**: Express cannot parse file uploads natively. Multer efficiently buffers and saves incoming files to the server's disk, which is essential for our camera/photo-based minigames.

### 7. Socket.io (`socket.io`)
- **Usage**: Mounted on the HTTP server in `server.js`.
- **Purpose**: Enables real-time, bidirectional communication between the client and server.
- **Motivation**: Used to push live updates to the frontend (e.g., multiplayer state or notifications) without requiring the client to constantly poll the API, improving performance and user experience.

### 8. Dotenv (`dotenv`)
- **Usage**: Loaded at the top of `server.js`.
- **Purpose**: Loads environment variables from the `.env` file into `process.env`.
- **Motivation**: A crucial security practice to keep sensitive credentials (database passwords, OAuth secrets, session secrets) out of source control.

## AI Engine Dependencies (Python/FastAPI)

### 1. FastAPI (`fastapi`)
- **Usage**: Core web framework for the `ai-engine/main.py` microservice.
- **Purpose**: Defines the REST API endpoints that the Node.js server calls to evaluate minigame attempts.
- **Motivation**: FastAPI is extremely fast and natively supports asynchronous endpoints. It is the modern standard for deploying Python-based Machine Learning models as APIs, providing automatic validation and documentation out of the box.

### 2. Uvicorn (`uvicorn`)
- **Usage**: ASGI web server running the FastAPI application.
- **Purpose**: Serves the AI engine on `localhost:8000`.
- **Motivation**: FastAPI requires an ASGI server to function. Uvicorn is lightweight, highly performant, and perfectly complements FastAPI for serving ML predictions efficiently.

### 3. MobileSAM (`git+https://github.com/ChaoningZhang/MobileSAM.git`)
- **Usage**: Imported in `ai-engine/vision/sam_extractor.py`.
- **Purpose**: Performs zero-shot image segmentation to extract shapes from the minigame reference and attempt photos.
- **Motivation**: The "Colour Match" minigame requires understanding the shape of objects in photos. MobileSAM provides state-of-the-art Segment Anything capabilities but is optimized to be lightweight and fast enough to run on standard hardware, fitting the project constraints.

### 4. PyTorch (`torch`, `torchvision`)
- **Usage**: Core machine learning framework required by MobileSAM.
- **Purpose**: Loads the model weights and executes the neural network inferences.
- **Motivation**: The de-facto standard for modern deep learning research. MobileSAM relies on PyTorch to function.

### 5. OpenCV (`opencv-python`) & NumPy (`numpy`)
- **Usage**: Used throughout the `ai-engine/vision/` module.
- **Purpose**: Handles image decoding, color space conversions (e.g., RGB to HSV), and array manipulations.
- **Motivation**: Standard libraries for computer vision tasks. They are highly optimized (written in C/C++) for processing pixel data quickly before passing it to the ML models.

### 6. Pillow (`Pillow`)
- **Usage**: Image loading and formatting.
- **Purpose**: Converts incoming multipart form images into RGB formats suitable for processing.
- **Motivation**: Standard Python imaging library used for basic image manipulation and loading.

### 7. Python Multipart (`python-multipart`)
- **Usage**: Used by FastAPI implicitly for file uploads.
- **Purpose**: Parses `multipart/form-data` requests sent from the Node.js server containing the reference and attempt images.
- **Motivation**: Required by FastAPI to securely and efficiently accept image files via HTTP POST requests.
