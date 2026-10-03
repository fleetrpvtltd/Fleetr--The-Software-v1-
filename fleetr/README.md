# Fleetr — B2B Freight Logistics & Supply Chain SaaS Platform

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)
[![React Version](https://img.shields.io/badge/react-19.0.0-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/typescript-5.8.2-blue.svg)](https://www.typescriptlang.org/)
[![Database](https://img.shields.io/badge/database-Google%20Cloud%20Firestore-orange.svg)](https://firebase.google.com/docs/firestore)
[![Deployment](https://img.shields.io/badge/deployment-Render-46E3B7.svg)](https://fleetr.onrender.com)
[![License](https://img.shields.io/badge/license-Apache--2.0-lightgrey.svg)](LICENSE)

**Fleetr** is a production-ready, full-stack B2B logistics and freight orchestration SaaS platform customized for Indian road transit corridors, multi-district warehouse hubs, carrier fleet registries, regulatory compliance verification, and administrative dispatch supervision.

Deployed live on Render: [https://fleetr.onrender.com](https://fleetr.onrender.com)

---

## 🏗️ Architecture & Technology Stack

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FLEETR CLIENT (SPA)                             │
│  React 19 • Vite • Tailwind CSS v4 • Lucide Icons • Recharts           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS / REST (Firebase Bearer JWT)
┌───────────────────────────────────▼────────────────────────────────────┐
│                    EXPRESS BACKEND (Node.js 20)                        │
│  Strict RBAC • Highway Routing Engine • Tariff Calculator               │
│  ULIP Regulatory Verification • B2B Dispute Desk • Atomic Transactions  │
└───────────────────┬───────────────────────────────┬────────────────────┘
                    │                               │
┌───────────────────▼──────────────┐   ┌────────────▼────────────────────┐
│      GOOGLE CLOUD FIRESTORE      │   │     FIREBASE AUTHENTICATION     │
│  ACID Transactions (Zero-Lock)   │   │  Cryptographic JWT Validation   │
│  TTL Caching (<10% Free Quota)   │   │  Role-Scoped Access Claims      │
└──────────────────────────────────┘   └─────────────────────────────────┘
```

- **Frontend Application**: React 19 single-page application built with Vite, Tailwind CSS v4, Lucide React icons, and Recharts visualization.
- **Backend Application**: Express.js server in TypeScript, bundled with `esbuild` for instant container cold starts.
- **Authentication & Security**: Firebase Authentication with cryptographic JWT verification (`adminAuth.verifyIdToken`) and strict per-request Role-Based Access Control (RBAC).
- **Database & Storage**: Google Cloud Firestore with native ACID multi-document transactions, zero-polling optimizations, and hardened security rules.
- **Containerization & Hosting**: Multi-stage Docker container deployed as a Web Service on Render.

---

## 👥 Core Portals & Workstation Separation

Fleetr enforces strict data isolation across four distinct logistics stakeholders. Portals are isolated, and only the Master Administrator has supervisory authority across workspaces.

### 1. 🏢 Business Owner (Shipper / Consignor)
- **Consignment Booking**: Book FTL/LTL freight with volumetric weight calculation (`L × W × H / 5000`), declared cargo valuation, goods categorization, and GSTIN verification.
- **Dynamic Tariff & Highway Routing**: Automatically calculates highway distance, fuel surcharges, toll plaza fees, GST (18%), and TDS deductions (2%).
- **E-Way Bill Generation**: Validates intrastate and interstate thresholds and assigns compliant E-Way Bill numbers.
- **Consignment Tracking**: Real-time status tracker from `REQUESTED` ➔ `CONFIRMED` ➔ `DISPATCHED` ➔ `IN_TRANSIT` ➔ `DELIVERED`.
- **Invoicing & LR Receipts**: One-click download of legally formatted Lorry Receipts (LR) and freight bills.
- **Customer Support & Dispute Desk**: Raise disputes linked directly to specific consignments (delays, damages, settlement issues) with priority tagging (`LOW` to `CRITICAL`).

### 2. 🚛 Truck Owner (Carrier / Fleet Operator)
- **Fleet Registry**: Enlist commercial vehicles (LCV, ICV, HCV, Multi-Axle, Trailers, Refrigerated) with chassis and engine credentials.
- **Driver Roster**: Manage commercial driver profiles with SARATHI licensing data and commercial transport endorsement (`TRANS`) tracking.
- **ULIP Compliance Integration**:
  - **VAHAN**: Real-time audit of vehicle RC status, fitness validity, and commercial third-party insurance.
  - **SARATHI**: DL status validation and verification of heavy transport endorsement.
  - **FASTag**: Real-time NETC toll tag status, wallet balance tracking, and 72-hour toll waypoint history.
  - **E-Challan**: Judicial court referral checks and traffic violation monitoring.
- **Trip Assignments**: Review corridor freight routes assigned to fleet trucks.

### 3. 🏭 Godown Owner (Warehouse Facility Manager)
- **Storage Hub Directory**: Register and manage spatial facilities (Dry Storage, Cold Storage, Hazmat Vaults, Bonded Warehouses).
- **Live Capacity Board**: Dynamic tracking of total versus available capacity (in Kilograms / CFT) with visual Recharts gauges.
- **Staging & Cargo Inbound**: Verify incoming freight manifests and confirm physical receipt (`AT_GODOWN`) before final corridor dispatch.
- **Automatic Recalculation**: Recalculates occupied storage footprint across active cargo consignments.

### 4. 🛡️ Master Administrator Command Center
- **Executive Console**: Global platform overview tracking total turnover, active users, assigned consignments, and open inquiries.
- **Corridor Dispatch (Fleetr-Mind)**: Algorithmic vehicle and godown matching engine that scores candidates based on payload fit, location, and compliance clearance.
- **One-Click Dispatch / Override**: Approve AI-ranked truck and warehouse assignments or provide mandatory audit justification for manual overrides.
- **Compliance Anomaly Radar**: Real-time alarm feed highlighting expired fitness certificates, low FASTag balances, overloading risks, and missing transport endorsements.
- **User Management**: Monitor registered accounts, activate/suspend access, or execute permanent account cascades.
- **Dispute Resolution Docket**: Review B2B support tickets, inspect linked consignment transit logs, and submit official administrator resolution notes.
- **Audit Logs**: Immutable, append-only event trail recording every status change, assignment, verification, and authentication event with client IP attribution.

---

## ⚡ Key Engineering & Free-Tier Optimizations

This codebase is specifically engineered to operate within **100% Free-Tier constraints** (Google Cloud Firestore Spark Plan & Render Free Web Service) while maintaining enterprise reliability:

| Capability | Implementation | Benefit |
| :--- | :--- | :--- |
| **Zero Polling Leaks** | Eliminated all continuous `setInterval` polling loops across all four dashboards. Replaced with window `focus` listeners and manual sync buttons with a 10s cooldown. | Reduces Firestore read usage from **~92,000 reads/day** down to **<3,500 reads/day** (<7% of the 50,000/day free quota). |
| **Atomic Transactions** | Firestore multi-document ACID transactions (`assignDeliveryTruckTx`, `assignGodownCapacityTx`, `completeDeliveryTx`). | Guarantees **zero double-booking** of trucks or warehouse space under concurrent assignment attempts. |
| **Server-Side Aggregates** | Dashboard metrics cached in memory with a 60-second TTL at `/api/stats/dashboard`. | Replaces expensive full-collection scans with a single cached read per minute. |
| **Strict Security Rules** | Eliminated catch-all wildcards in `firestore.rules`. Enforced user document ownership checks, append-only `auditLogs`, and immutable `invoices`. | Prevents unauthorized cross-tenant data access, tampering, or financial record deletion. |
| **Cryptographic Auth** | Firebase Admin SDK verification (`adminAuth.verifyIdToken`). Removed unverified base64 unpack fallbacks and raw token bypasses. | Prevents account impersonation and ensures token authenticity. |

---

## ⚙️ Environment Variables

Create a `.env` file in the `fleetr/` directory (or configure these in your Render Dashboard):

```env
# Server Configuration
PORT=3000
NODE_ENV=production

# Admin Credentials
ADMIN_PASSWORD=your_secure_admin_password_here

# Firebase Admin SDK Configuration
# Option A: Path to service account JSON file
FIREBASE_SERVICE_ACCOUNT_KEY=./serviceAccountKey.json

# Option B: Raw or base64-encoded Service Account JSON (Recommended for Render)
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...","private_key":"..."}

# Optional Integrations
GEMINI_API_KEY=your_gemini_api_key_here
ULIP_USERNAME=your_ulip_username
ULIP_PASSWORD=your_ulip_password
```

---

## 🚀 Local Development Quickstart

### Prerequisites
- Node.js >= 20.0.0
- npm >= 10.0.0

### Steps

1. **Clone Repository**:
   ```bash
   git clone https://github.com/fleetrpvtltd/Fleetr--The-Software-v1-.git
   cd Fleetr--The-Software-v1-/fleetr
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Start Development Server**:
   ```bash
   npm run dev
   ```
   The application will start on `http://localhost:3000` with hot-module replacement (HMR).

4. **Run TypeScript Lint Verification**:
   ```bash
   npm run lint
   ```

5. **Build for Production**:
   ```bash
   npm run build
   ```

6. **Start Production Server Locally**:
   ```bash
   npm start
   ```

---

## 🐳 Docker & Render Deployment

The repository includes a multi-stage `Dockerfile` configured for zero-downtime containerized builds on Render:

- **Stage 1 (Builder)**: Installs dev dependencies, builds the Vite frontend bundle to `dist/`, and compiles `server.ts` to `dist/server.cjs` via `esbuild`.
- **Stage 2 (Runner)**: Minimal Node 20 Alpine environment running as non-root user `nodejs`, installing production-only dependencies and exposing port `10000`.
- **Healthcheck**: Automated healthcheck hitting `http://localhost:${PORT}/api/health`.

### Deploying on Render:
1. Connect your GitHub repository to [Render](https://render.com).
2. Choose **Web Service** and select **Docker** as the Environment.
3. Set the Root Directory to `.` (repository root).
4. Add your Environment Variables (`FIREBASE_SERVICE_ACCOUNT_JSON`, `ADMIN_PASSWORD`, etc.).
5. Render will automatically build and deploy the container.

---

## 📁 Repository Structure

```
Fleetr--The-Software-v1-/
├── Dockerfile                  # Multi-stage production container build
├── .dockerignore               # Docker build exclusions
├── README.md                   # Project documentation
├── fleetr/                     # Core application source
│   ├── src/
│   │   ├── backend/            # Express API, services & business logic
│   │   │   ├── apiRoutes.ts    # Secure REST API endpoints & RBAC middleware
│   │   │   ├── dbService.ts    # Firestore service with ACID transactions & TTL caching
│   │   │   ├── firebaseAdmin.ts# Firebase Admin SDK initialization
│   │   │   ├── aiServices.ts   # Fleetr-Mind algorithmic matching & anomalies
│   │   │   ├── ulipServices.ts # VAHAN, SARATHI, FASTag, E-Challan verification
│   │   │   └── routingEngine.ts# Highway corridor distance, tariff & toll calculation
│   │   ├── pages/              # Role-specific workstation views
│   │   │   ├── AdminDashboard.tsx      # Master Admin workstation & support desk
│   │   │   ├── BusinessDashboard.tsx   # Shipper consignment & dispute desk
│   │   │   ├── TruckOwnerDashboard.tsx # Carrier fleet registry & compliance
│   │   │   ├── GodownDashboard.tsx     # Warehouse facility management
│   │   │   └── AuthPage.tsx            # Firebase email/password & Google sign-in
│   │   ├── components/         # Shared UI components (Header, ErrorBoundary, Skeleton)
│   │   ├── lib/firebase.ts     # Firebase client SDK initialization
│   │   ├── types.ts            # TypeScript data models & interfaces
│   │   ├── App.tsx             # Root router with session observer
│   │   └── main.tsx            # React application entry with ErrorBoundary
│   ├── server.ts               # Express server with Vite/static middleware
│   ├── firestore.rules         # Hardened Firestore security rules
│   ├── package.json            # Application dependencies and scripts
│   ├── tsconfig.json           # TypeScript compiler configuration
│   └── vite.config.ts          # Vite build configuration
```

---

## 📄 License

This project is licensed under the Apache License 2.0. See [LICENSE](LICENSE) for details.
