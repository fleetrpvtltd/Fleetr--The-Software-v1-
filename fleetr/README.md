# GATI-NODE 2.0 Logistics Management Platform

GATI-NODE 2.0 is a production-ready, full-stack logistics management platform customized for Indian freight management, truck scheduling, warehouse cargo staging, compliance auditing, and administrative workstation delivery routing.

---

## 🚀 Key Highlights & Role Support

The platform integrates distinct dashboard operations of four distinct roles inside an interactive, unified workflow:

1. **BUSINESS_OWNER**
   - Book freight deliveries supplying description, weight, volumes, valuations, consignor GSTINs, and cargo categories.
   - Live ETA timeline trackers with toll plazas waypoint records.
   - Simulated Razorpay checkout flow with instant LR compliance invoice Generation & download.

2. **TRUCK_OWNER**
   - Register commercial heavy truck fleet assets & goods carriage drivers.
   - Sync real-time ULIP VAHAN & SARATHI checks directly from live mocked registries.
   - Visual FASTAG wallet balance trackers & eChallans judicial court anomalies auditing.

3. **GODOWN_OWNER**
   - Manage storage capacities (Dry Space, Cold Storage, Hazmat Vaults).
   - Dynamic cargo routing waypoint checklists (Confirm Inbound ➔ Depart Outbound).
   - Recharts visual capacity utilization bars.

4. **ADMIN (Master Warehouse Workstation)**
   - Unified console monitoring global turnovers, active fleets, and security alerts.
   - **GATI-MIND AI Optimizer**: Ranked recommended truck carriers & warehouse waypoints alongside score matching logic.
   - Accept recommended configurations with 1-click or override with required manual justification.
   - Suspend user profiles or audit central logs.

---

## 🛠️ ULIP & Anomaly Compliance Integrations (Seeded & Audited)

Direct matching with National Registry specifications:
- **VAHAN/04, 05, 06**: Alphanumeric format check (`^[A-Z0-9]{5,11}$`). Flags active RC registration indicators, valid commercial fitness limits, and valid commercial third-party insurance.
- **SARATHI/01**: Standard form check (`(([A-Z]{2}(-)[0-9]{2})|([A-Z]{2}[0-9]{2}))((19|20)[0-9][0-9])[0-9]{7}$`). Validates active DL statuses and flags missing heavy goods TRANS commercial endorsements.
- **FASTAG/01, 02**: Syncs toll plaza waypoints within the last 72 hours, tags commercial truck classification codes (`T`), and raises alarms for low balance parameters (threshold ₹100).
- **ECHALLAN/01**: Lists pending offense records and raises critical legal blocks if any challan was referred to Regular Court (`sent_to_reg_court: Yes`).
- **AAICLAS/01, 02**: Airway freight tracking integrations matching multimodal categories.

---

## ⚙️ Local Development Quickstart

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment Variables (.env)**
   Add API secrets inside `.env` referencing `.env.example`:
   ```env
   GEMINI_API_KEY="your_api_key_here"
   APP_URL="http://localhost:3000"
   ULIP_USERNAME="xxxx"
   ULIP_PASSWORD="xxxx@123"
   ```

3. **Launches Server in Development**
   Boot up both the Express API and Vite React middleware with HMR on port 3000:
   ```bash
   npm run dev
   ```

4. **Launches Production Build Compilation**
   Generates static React distribution assets and bundles server files using `esbuild` for container hot starts:
   ```bash
   npm run build
   npm run start
   ```

---

## 🧬 Seed Credentials (Review Desk)

You can swap role modes dynamically with the topbar "Role Mode" dropdown. To sign in using seeded profiles:

- **Master Administrator**:
  - Email: `emonpoddar01@gmail.com`
  - Password: `emon@7890`

- **Business Owner, Fleet Owner, Warehouse Operator**:
  - Simply input your email and any password (the system auto-registers and seeds matching role profile credentials for you on the fly!).
