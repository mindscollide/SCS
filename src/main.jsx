import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import './index.css'
import router from './routes/router.jsx'
import Loader from './components/common/Loader/Loader.jsx'

/**
 * Vite lazy-chunk stale-cache guard
 * ───────────────────────────────────
 * When Vite rebuilds the app (dev or production deploy), chunk file hashes
 * change. If the browser still has the old HTML cached, it requests old chunk
 * URLs that no longer exist → "Failed to fetch dynamically imported module".
 *
 * The `vite:preloadError` event (Vite 4.4+) fires exactly when this happens.
 * Reloading the page fetches fresh HTML with the correct new chunk URLs,
 * resolving the error transparently without the user seeing a broken screen.
 */
window.addEventListener('vite:preloadError', () => {
  window.location.reload()
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} future={{ v7_startTransition: true }} />
    <Loader />
    <ToastContainer
      position="top-right"
      autoClose={3000}
      hideProgressBar={false}
      closeOnClick
      pauseOnHover
      theme="light"
    />
  </React.StrictMode>
)
