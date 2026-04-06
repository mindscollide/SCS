# components/layout

Application chrome — persistent UI that wraps all authenticated pages.

| File | Description |
|---|---|
| `AppLayout.jsx` | Root layout: renders `Topbar` + `Sidebar` + `<Outlet />` |
| `Sidebar.jsx` | Fixed 210px left nav; role-aware menu; active-item highlighting via NavLink |
| `Topbar.jsx` | Fixed 64px top bar; logo, user info, notifications |

## Sidebar active-item rules

- **Parent group** is highlighted (navy `#0B39B5`) when any child or sub-route is active.
- **Child item** is highlighted (teal `#01C9A4`) via `NavLink` — uses `end={true}` on "List" items to prevent prefix-match conflicts with sub-routes like `/add` or `/view/:id`.
- `basePath` on a group drives parent highlighting for routes that have no corresponding sidebar child (e.g. `/financial-data/view/:id`).
