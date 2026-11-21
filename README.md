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

---

## 3. Installation and Setup

### Prerequisites
- Node.js (v18 or higher recommended)
- MongoDB database (local or MongoDB Atlas cluster)

### Steps
1. Navigate to the server folder:
   ```bash
   cd DoomsDay-Server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables:
   Create a `.env` file in the `DoomsDay-Server` root directory:
   ```env
   PORT=3000
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/doomsday?retryWrites=true&w=majority
   ```
4. Start the server:
   - **Development mode (with auto-reload)**:
     ```bash
     npm run dev
     ```
   - **Production mode**:
     ```bash
     npm start
     ```

The server initializes the MongoDB connection before listening for incoming HTTP requests on `http://localhost:3000`.

---

## 4. Database Models & Validation

### Movie (`models/Movie.js`)
- `title`: String, required, unique (enforced by MongoDB unique index), trimmed.
- `releaseYear`: Number, required, integer.
- `runtime`: Number, required, integer between 1 and 300 minutes.
- `prerequisites`: Array of `ObjectId` referencing `movies` collection, defaults to `[]`.
- `watched`: Boolean, defaults to `false`.
- `timestamps`: Automatically manages `createdAt` and `updatedAt`.

### Cinema (`models/Cinema.js`)
- `name`: String, required, unique (enforced by MongoDB unique index), trimmed.
- `bundleSizes`: Array of Numbers, required (1 to 10 unique integers, each between 1 and 500).
- `timestamps`: Automatically manages `createdAt` and `updatedAt`.

---

## 5. API Endpoints

### Movie Endpoints

#### 1. Create Movie
- **Method**: `POST`
- **URL**: `/api/movies`
- **Request Body**:
  ```json
  {
    "title": "Avengers: Infinity War",
    "releaseYear": 2018,
    "runtime": 149,
    "prerequisites": ["673dc1..."],
    "watched": false
  }
  ```
- **Response (`201 Created`)**:
  ```json
  {
    "_id": "673dc2...",
    "title": "Avengers: Infinity War",
    "releaseYear": 2018,
    "runtime": 149,
    "prerequisites": ["673dc1..."],
    "watched": false,
    "createdAt": "2026-11-20T...",
    "updatedAt": "2026-11-20T..."
  }
  ```

#### 2. Get All Movies
- **Method**: `GET`
- **URL**: `/api/movies`
- **Response (`200 OK`)**:
  ```json
  [
    {
      "_id": "673dc1...",
      "title": "Iron Man",
      "releaseYear": 2008,
      "runtime": 126,
      "prerequisites": [],
      "watched": true
    }
  ]
  ```

#### 3. Update Movie
- **Method**: `PATCH`
- **URL**: `/api/movies/:id`
- **Request Body** *(all fields optional)*:
  ```json
  {
    "watched": true,
    "prerequisites": ["673dc1..."]
  }
  ```
- **Response (`200 OK`)**: Returns updated movie document.
- **Cycle Conflict (`409 Conflict`)**:
  ```json
  {
    "code": "CIRCULAR_DEPENDENCY",
    "message": "This change would create a circular dependency."
  }
  ```

#### 4. Get Rewatch Order
- **Method**: `GET`
- **URL**: `/api/movies/:id/rewatch-order`
- **Response (`200 OK`)**:
  ```json
  {
    "targetMovie": {
      "id": "673dc5...",
      "title": "Avengers: Doomsday"
    },
    "movies": [
      {
        "_id": "673dc1...",
        "title": "Iron Man",
        "releaseYear": 2008,
        "runtime": 126,
        "watched": true
      },
      {
        "_id": "673dc2...",
        "title": "The Avengers",
        "releaseYear": 2012,
        "runtime": 143,
        "watched": false
      }
    ],
    "watchedCount": 1,
    "totalMovies": 2,
    "remainingRuntime": 143
  }
  ```

---

### Cinema & Booking Endpoints

#### 5. Create Cinema
- **Method**: `POST`
- **URL**: `/api/cinemas`
- **Request Body**:
  ```json
  {
    "name": "CineMax Dhaka",
    "bundleSizes": [2, 5]
  }
  ```
- **Response (`201 Created`)**:
  ```json
  {
    "_id": "673dc9...",
    "name": "CineMax Dhaka",
    "bundleSizes": [2, 5],
    "createdAt": "2026-11-20T..."
  }
  ```

#### 6. Get All Cinemas
- **Method**: `GET`
- **URL**: `/api/cinemas`
- **Response (`200 OK`)**: Returns array of all cinema records.

#### 7. Calculate Booking Quote
- **Method**: `GET`
- **URL**: `/api/cinemas/:id/booking?groupSize=11`
- **Response (`200 OK` - Match Found)**:
  ```json
  {
    "possible": true,
    "groupSize": 11,
    "totalBundles": 4,
    "bundles": [
      { "size": 5, "count": 1 },
      { "size": 2, "count": 3 }
    ]
  }
  ```
- **Response (`200 OK` - No Exact Match)**:
  ```json
  {
    "possible": false,
    "groupSize": 7,
    "message": "No exact bundle combination is possible."
  }
  ```

---

## 6. Algorithm Implementations

### 1. Cycle Detection (DFS)
- **Location**: `utils/rewatchOrder.js` (`hasCircularDependency`)
- **How it works**:
  1. Checks for immediate self-dependency (`targetId === prereqId`).
  2. Runs a recursive Depth-First Search (DFS) starting from each proposed prerequisite.
  3. If navigating through existing prerequisites in the database ever reaches the target movie ID, a cycle exists.
  4. Returns `true` and the API responds with `HTTP 409` (`code: "CIRCULAR_DEPENDENCY"`).

### 2. Rewatch Order Generation (Topological Sort / Post-order DFS)
- **Location**: `utils/rewatchOrder.js` (`calculateRewatchOrder`)
- **How it works**:
  1. Starts at the target movie's direct prerequisites.
  2. For each movie, recursively visits its prerequisites first before adding the movie to the list.
  3. Uses a `Set` (`visited`) to guarantee that movies are never processed more than once, naturally handling shared prerequisites (Diamond Dependency problem).
  4. The target movie itself is omitted.
  5. Computes statistics: `totalMovies`, `watchedCount`, and `remainingRuntime` (summing runtimes of only unwatched prerequisite movies).

### 3. Minimum Bundle Calculation (Dynamic Programming)
- **Location**: `utils/bookingCalculator.js` (`calculateBooking`)
- **How it works**:
  - Implements an exact-fit variation of the classic **Unbounded Knapsack / Coin Change Problem**.
  - `dp[s]` stores the minimum number of bundles required to seat exactly `s` people.
  - `parentBundle[s]` tracks which bundle size was used to achieve the optimal count for `s`, enabling reconstruction.
  - **Recurrence**:
    $$\text{dp}[s] = \min(\text{dp}[s], \text{dp}[s - \text{size}] + 1)$$
  - If `dp[groupSize] === Infinity`, no exact combination exists and `{ possible: false }` is returned.
  - Otherwise, backtracks through `parentBundle` to count the frequency of each bundle size, returning them sorted in descending order.

---

## 7. Error Handling & HTTP Status Codes

- `200 OK`: Successful retrieval, update, or calculation.
- `201 Created`: Resource successfully created.
- `400 Bad Request`: Validation failure (missing required fields, non-integer numbers, out-of-bounds runtime, non-existent prerequisite IDs).
- `404 Not Found`: Movie or Cinema ID not found.
- `409 Conflict`: Duplicate movie/cinema names or circular dependencies.
- `500 Internal Server Error`: Unexpected database or system errors.

---

## 8. AI Tool Usage Disclosure

As encouraged by the assessment instructions, AI assistance was used as a pair programmer for:
- Writing automated test suites for edge cases and boundary conditions.
- Drafting clean JSDoc comments and documentation.
- Designing the Dynamic Programming array reconstruction logic.

All business logic, database schemas, validation rules, and algorithms were verified manually and adhere strictly to standard JavaScript, Express.js, and native MongoDB patterns.
