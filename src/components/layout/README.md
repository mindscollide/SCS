# components/layout

Application chrome — persistent UI that wraps all authenticated pages.

| File | Description |
|---|---|
| `AppLayout.jsx` | Root layout — renders `Topbar` + `Sidebar` + `<Outlet />`; owns MQTT connection; calls `resumeTokenTimer()` on mount |
| `Sidebar.jsx` | Fixed 210px left nav; role-aware menu; active-item highlighting via `NavLink` |
| `Topbar.jsx` | Fixed 56px top bar; logo, user info, notifications bell; calls `mqttService.disconnect()` on logout |

## AppLayout responsibilities

- Wraps all authenticated pages in `<MqttProvider>` with the live MQTT client value
- Calls `connectToMqtt({ subscribeID, topic })` on mount after reading broker config from `sessionStorage`
- Mounts `<MqttListenerSetup />` (from `useMqttListener.js`) — never unmounts, handles all MQTT event types app-wide
- Calls `resumeTokenTimer()` to restore the proactive token-refresh countdown after F5 / hard refresh
- Dimensions: topbar 56px fixed, sidebar 210px fixed — content area uses `marginLeft: 220px`, `paddingTop: 44px`

## Sidebar active-item rules

- **Parent group** highlighted navy `#0B39B5` when any child route is active
- **Child item** highlighted teal `#01C9A4` via `NavLink`
- Uses `end={true}` on "List" items to prevent prefix-match conflicts with `/add` or `/view/:id` sub-routes
- `basePath` on a group drives parent highlighting for routes with no sidebar child (e.g. `/financial-data/view/:id`)

## MQTT connection flow

```
LoginPage      → stores broker IP + Port in sessionStorage after login
AppLayout      → reads sessionStorage → calls connectToMqtt()
useMqttClient  → creates Paho client, connects, subscribes to SCS_{userID}
MqttContext    → exposes useSubscribe / useGlobalMqttListener to all pages
useMqttListener→ central router, handles all MQTT_TYPE events app-wide
```
