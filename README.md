# Fleetr — Logistics & Freight Management Platform

Fleetr is an enterprise-grade freight, godown, truck fleet management, and compliance verification system designed for Indian logistics operations.

## Architecture

- **Front-end**: React 19 SPA, Tailwind CSS v4, Lucide Icons, Recharts
- **Back-end**: Express.js, Firebase Admin SDK, Google Gemini AI (corridor routing & dispatch)
- **Database & Storage**: Google Cloud Firestore, Firebase Auth
- **Deployment**: Docker on Render (`https://fleetr.onrender.com`)

## Workspaces & Role Separation

1. **ADMIN**: Super-administrator workspace supervising all carrier rosters, corridor deliveries, godown facilities, live compliance audits, and platform users.
2. **BUSINESS_OWNER**: Consignor workstation for dispatching consignments, calculating volumetric freight charges, verifying GSTIN, and tracking dispatches.
3. **TRUCK_OWNER (Fleet Carrier)**: Fleet management workstation for registering heavy/commercial vehicles, managing Sarathi commercial driver rosters, tracking e-challan compliance, and reviewing trip assignments.
4. **GODOWN_OWNER (Warehouse Facility)**: Storage and facility workstation for managing multi-district warehouse capacities, CFT/SQFT space utilization, storage inbound/outbound manifests, and live telemetry.

## Running Locally

```bash
cd fleetr
npm install
npm run dev
```

## Production Build

```bash
cd fleetr
npm run build
npm start
```
