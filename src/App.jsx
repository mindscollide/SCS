import React, { Suspense } from 'react'
import { Outlet } from 'react-router-dom'

// Shown while any lazy-loaded page chunk is downloading.
// Matches the app's background so there's no white flash.
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-[#f0f4f8]">
    <div className="w-9 h-9 border-4 border-[#2f20b0]/20 border-t-[#2f20b0] rounded-full animate-spin" />
  </div>
)

const App = () => (
  <Suspense fallback={<PageLoader />}>
    <Outlet />
  </Suspense>
)

export default App
