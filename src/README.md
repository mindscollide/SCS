# src

Root of the SCS (Sharia Compliance Solution) frontend source.

**Stack:** React 18 · Vite · Tailwind CSS · React Router v6 · react-toastify · Paho MQTT

## Folder Structure

| Folder / File | Purpose |
|---|---|
| `main.jsx` | ReactDOM render root — wraps app in `RouterProvider`, mounts global `Loader` + `ToastContainer` |
| `App.jsx` | Top-level Suspense shell — thin `<Outlet />` wrapper |
| `index.css` | Global Tailwind base styles |
| `components/` | Reusable UI components — `common/` (role-agnostic) + `layout/` (chrome) |
| `context/` | React Context providers for shared state (Auth, MQTT, FinancialData, etc.) |
| `data/` | Static mock/seed data — **temporary**, used until real API endpoints are wired |
| `hooks/` | Custom React hooks — pagination (`useLazyLoad`), MQTT client, infinite scroll |
| `pages/` | Route-level page components organised by role |
| `routes/` | React Router v6 configuration — all routes, guards, lazy loading |
| `services/` | API call functions per service (auth, admin, manager, dataentry) |
| `utils/` | Pure utility helpers, shared constants, token timer, loader store |

## Roles

| ID | Role | Home route |
|---|---|---|
| 1 | Admin | `/admin/users` |
| 2 | Manager | `/manager/pending-approvals` |
| 3 | Data Entry | `/data-entry/financial-data` |

## API Services & Ports

| Service file | Port | URL constant |
|---|---|---|
| `auth.service.js` | 6002 | `AUTH_URL` |
| `admin.service.js` | 6001 | `Admin_URL` |
| `manager.service.js` | 6004 | `Manager_URL` |
| `dataentry.service.js` | 6005 | `DataEntry_URL` |

## Key Patterns

- **API calls** — `formPost(URL, RM.KEY, payload, config)` — FormData POST, `RequestMethod` + `RequestData`
- **Pagination** — `useLazyLoad` hook — `PageNumber` is **page-index** (0, 1, 2…), never offset
- **Background fetches** — always pass `{ skipLoader: true }` to suppress global spinner
- **Open APIs** — pass `{ skipAuth: true }` (no JWT header sent)
- **Auth** — JWT in `sessionStorage`; proactive refresh 60s before expiry; reactive refresh on `responseCode 417`
- **MQTT** — Paho MQTT over WebSocket; per-user topic `SCS_{userID}`; central router in `useMqttListener.js`
