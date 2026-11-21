# Doomsday Ready — Backend API

Backend service for the **Doomsday Ready** application, built for the Blinto Talent Accelerator 2027 Full Stack Developer Internship Assessment.

This service manages the Marvel Cinematic Universe (MCU) movie rewatch pipeline (including prerequisite dependency tracking and topological rewatch order generation) as well as the watch-party ticket booking engine with dynamic bundle size optimization.

---

## 1. Technology Stack

- **Runtime**: Node.js (ES Modules, `import/export`)
- **Web Framework**: Express.js
- **Database**: MongoDB (Official Native Driver `mongodb`)
- **Environment Management**: `dotenv`
- **Security & Cross-Origin**: `cors`
- **Development Tooling**: `nodemon`

---

## 2. Project Architecture & Folder Structure

```
DoomsDay-Server/
├── config/
│   └── db.js                 # Database connection logic
├── controllers/
│   ├── movieController.js    # Movie CRUD & rewatch order endpoint handlers
│   └── cinemaController.js   # Cinema CRUD & booking quote endpoint handlers
├── models/
│   ├── Movie.js              # Native MongoDB movie collection model & helpers
│   └── Cinema.js             # Native MongoDB cinema collection model & helpers
├── routes/
│   ├── movieRoutes.js        # Express routes for /api/movies
│   └── cinemaRoutes.js       # Express routes for /api/cinemas
├── utils/
│   ├── rewatchOrder.js       # DFS graph traversal & cycle detection
│   └── bookingCalculator.js  # Dynamic Programming coin-change bundle optimizer
├── .env                      # Environment variables (ignored in git)
├── .gitignore
├── index.js                  # Server entry point
├── package.json
└── README.md
```

