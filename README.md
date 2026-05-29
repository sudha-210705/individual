# 🌌 AETHER DISPATCH - Hyperlocal AI Delivery Dispatcher Platform

AETHER DISPATCH is a production-ready, full-stack logistics coordination and routing dispatcher platform designed with a high-fidelity cyberpunk visual aesthetic. The system orchestrates orders, delivery riders, AI route solvers, and real-time operations grids.

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: React + Vite + Tailwind CSS + Framer Motion + React Three Fiber (Three.js 3D canvas visuals) + Recharts.
- **Backend**: Node.js + Express.js + Mongoose (MongoDB).
- **Real-time Synchronization**: Socket.io duplex channel connectivity for coordinates updates and active dashboards syncs.
- **AI dispatch core**: Simulated modules for nearest-rider calculation, weather/traffic delay factor metrics, TSP optimized paths solver, and OpenAI assistant simulator.

---

## 🚀 Getting Started

### 🐳 Option A: Launch with Docker Compose (Recommended)

1. Make sure you have Docker Desktop running.
2. From the root directory, run:
   ```bash
   docker-compose up --build
   ```
3. Access the platform interfaces:
   - **Frontend UI**: [http://localhost](http://localhost)
   - **Backend API Server**: [http://localhost:5000](http://localhost:5000)

---

### 💻 Option B: Local Manual Setup

#### 1. Setup Backend
1. Go to the `backend/` directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables in `.env`.
4. Start the backend developer node:
   ```bash
   npm run dev
   ```

*Note: If local MongoDB is not detected, the server automatically starts in a graceful **MOCK-SANDBOX mode** so you can develop UI components instantly.*

#### 2. Setup Frontend
1. Go to the `frontend/` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start Vite dev server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🎮 How to Test and Run Simulations

The platform contains a dedicated **Simulation Controller** on both the **Admin Dashboard** and **Rider Dashboard**. Here is how to run an end-to-end simulation flow:

1. **Register Accounts**:
   - Create a **Customer** profile.
   - Create a **Rider** profile.
   - Create an **Admin** profile.
2. **Activate Rider Node**:
   - Login to the Rider panel and toggle **Connect Deck Online**.
3. **Trigger Surge Weather Conditions (Admin)**:
   - Login to the Admin panel and trigger the **Storm** or **Rain** environment simulators. The operational ticker logs the event, and active surge sectors scale pricing in real-time.
4. **Place a Multi-stop Order**:
   - In the Customer dashboard, add 2-3 stops, choose the weather condition, and press **Run Fare Optimization**.
   - Press **Initiate Automated Dispatch**.
5. **AI Dispatch Loop & Live Path Simulation**:
   - The AI engine will compute costs and match the online rider.
   - Once assigned, the rider is locked, and a coordinate interpolation loop starts.
   - The rider's vehicle dot shifts along the street grids in real-time on both Customer, Rider, and Admin maps.
   - Order timeline records update triggers (`pickup_arrived` -> `picked_up` -> `delivered`).
   - The rider's wallet receives 70% of the calculated optimized fare.
