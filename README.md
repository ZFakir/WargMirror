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

## 📚 Documentation

**All project documentation has been migrated to our official Docusaurus site.**

To view the developer documentation, API references, deployment guides, and design principles:
1. Navigate to the `WARG-documentation` folder.
2. Run `npm install` and then `npm start`.
3. Visit `http://localhost:3000` in your browser.

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

# 2. Install backend dependencies
cd server
npm install

# 3. Configure environment
cp .env.example .env    # then fill in your DB and OAuth credentials

# 4. Start the dev server
npm run dev
```

---

## 🤝 Contributions
This project is the work of Luc & Friends. Special thanks to the team - Zaeem, Yami, and Chris.

---

## 📄 License

This project is developed as part of the Software Design Project at the University of the Witwatersrand.