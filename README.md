# SCS — Sharia Compliance Solution

Frontend application for Hilal Investments' Sharia Compliance Solution.

## Stack

| | |
|---|---|
| Framework | React 18 + Vite |
| Styling | Tailwind CSS |
| Routing | React Router v6 |
| Notifications | react-toastify |
| Real-time | Paho MQTT over WebSocket |
| HTTP | Axios (FormData POST pattern) |
| Excel parsing | SheetJS (`xlsx`) |

## Roles

| Role | ID | Home |
|---|---|---|
| Admin | 1 | `/admin/users` |
| Manager | 2 | `/manager/pending-approvals` |
| Data Entry | 3 | `/data-entry/financial-data` |

## API Services

| Service | Port | File |
|---|---|---|
| Auth | 6002 | `src/services/auth.service.js` |
| Admin | 6001 | `src/services/admin.service.js` |
| Manager | 6004 | `src/services/manager.service.js` |
| Data Entry | 6005 | `src/services/dataentry.service.js` |

## Getting Started

```bash
npm install
npm run dev
```

Configuration is in `.env` — copy `.env.example` if present and fill in `VITE_BASE_URL`.

## Documentation

Full developer reference is in `.claude/MEMORY.md`.  
Each `src/` subfolder has its own `README.md` covering components, hooks, services, pages, routes, and utilities.

## Project Status

| Area | Status |
|---|---|
| Auth flow | ✅ Complete |
| Admin pages | ✅ Complete |
| Manager setup + config pages | ✅ Complete |
| Manager report pages | ❌ 8 pages — mock data, API wiring pending |
| Data Entry financial data | ❌ 4 pages — mock data, API wiring pending |
| Data Entry market cap | ✅ Complete |
| MQTT handlers | ⚠️ 22/28 implemented — 6 pending |
