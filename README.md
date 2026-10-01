# Fleetr — Freight Management Platform

> High-compliance, FinTech-adjacent freight and intercity logistics platform for the Indian logistics market.

---

## 🏗 Monorepo Architecture

Fleetr is structured as an npm workspaces monorepo:

```
Fleetr/
├── backend/            # Express + TypeScript + Mongoose + BullMQ + Socket.IO
│   ├── src/
│   │   ├── config/     # MongoDB, Redis, Firebase Admin, BullMQ, Env (Zod)
│   │   ├── middleware/ # Auth (Firebase JWT + RBAC), Compliance, Error Handling
│   │   ├── models/     # 17 Mongoose schemas with strict validations & hooks
│   │   ├── modules/    # Auth, Consent, Fleet, Orders, Payments, Pricing, Admin
│   │   ├── realtime/   # Socket.IO event gateway
│   │   ├── utils/      # Circuit breaker, PII masking
│   │   └── workers/    # BullMQ repeatable workers (ULIP token, FASTag polling)
│   └── tests/          # Vitest test suite (78 tests, 100% pass)
│
├── fleetr/             # User-facing React 18 + Vite + Tailwind CSS dashboard
│   └── src/
│       ├── components/ # Header, MaintenanceMode, ConsentModal
│       ├── pages/      # AuthPage, BusinessDashboard, VehicleOwnerDashboard, WarehouseDashboard
│       ├── store/      # Zustand auth and app stores
│       └── services/   # Axios API client with token interceptor & 503 maintenance mode
│
├── admin-panel/        # Admin-only React 18 + Vite + Tailwind CSS dashboard
│   └── src/
│       ├── components/ # StateFilter, Header with Socket.IO status, MaintenanceMode
│       └── pages/      # AdminLoginPage, AdminDashboard (Warehouse, Fleet, Client operations)
│
├── docker-compose.yml  # MongoDB 7 & Redis 7 containers
├── package.json        # Monorepo workspaces & concurrent scripts
└── .env.example        # Environment variable definitions
```

---

## ⚡ Quick Start

### 1. Prerequisites
- **Node.js**: v20+
- **Docker**: For running MongoDB and Redis

### 2. Start Infrastructure
```bash
docker compose up -d
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Configure Environment
```bash
cp .env.example .env
# Edit .env with your Firebase, ULIP, Razorpay, and Mappls credentials
```

### 5. Seed Admin Account
```bash
npm run seed:admin
# Default Admin: emonpoddar01@gmail.com / emon@7890
```

### 6. Run All Applications
```bash
npm run dev
```

| Service | Port | Description |
|---|---|---|
| **Backend API** | `http://localhost:5000` | REST API & WebSocket server |
| **Fleetr User App** | `http://localhost:5173` | Business, Vehicle Owner & Warehouse dashboards |
| **Admin Panel** | `http://localhost:5174` | Segregated master control panel |

---

## 🧪 Testing

Run the automated test suite across all compliance, safety, and integration modules:

```bash
npm test
```

### Test Coverage Highlights:
- **TDS 194C / 206AB Engine**: Section 194C exemptions, 1%/2% rates, 20% penalty TDS for missing PAN.
- **Overloading Guard**: Motor Vehicles Act Section 194 fine calculation based on gross vehicle weight.
- **E-Way Bill Guard**: State-specific thresholds and interstate requirements.
- **Driver Endorsement**: SARATHI commercial license and TRANS endorsement checks.
- **Circuit Breaker**: Resilience against ULIP, Mappls, and SMS API outages.
- **DPDP Act 2023 Consent & PII Masking**: Role-based access control and sensitive data masking.
- **Order State Machine**: Strict 7-stage forward-only lifecycle enforcement.
- **Razorpay HMAC Webhooks**: Timing-safe signature validation.

---

## 📜 License
Private & Confidential — Fleetr Pvt Ltd. All rights reserved.
