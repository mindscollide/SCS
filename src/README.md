# src

Root of the SCS (Sharia Compliance Solution) frontend source code.

## Structure

| Folder | Purpose |
|--------|---------|
| `components/` | Reusable UI components (common + layout) |
| `context/` | React Context providers for shared state |
| `data/` | Static seed/mock data |
| `pages/` | Route-level page components organised by role |
| `routes/` | React Router v6 route configuration |
| `utils/` | Pure utility helpers and shared constants |

## Entry Points

- `main.jsx` — ReactDOM render root, wraps app in `AuthContext` and `ToastContainer`
- `App.jsx` — Top-level component that renders the router
- `index.css` — Global Tailwind base styles
