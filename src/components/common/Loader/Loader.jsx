/**
 * src/components/common/Loader/Loader.jsx
 * =========================================
 * Full-screen blurred overlay with a branded orbital loader.
 * Auto shown/hidden via loaderStore (axios interceptors).
 */

import React, { useState, useEffect } from 'react'
import loaderStore from '../../../utils/loaderStore'

const Spinner = () => (
  <>
    <style>{`
      @keyframes scs-cw   { to { transform: rotate(360deg);  } }
      @keyframes scs-ccw  { to { transform: rotate(-360deg); } }
      @keyframes scs-pulse {
        0%, 100% { transform: scale(1);    opacity: 1;   }
        50%       { transform: scale(1.35); opacity: 0.4; }
      }
      @keyframes scs-ripple {
        0%   { transform: scale(0.6); opacity: 0.5; }
        100% { transform: scale(2.4); opacity: 0;   }
      }

      .scs-ring {
        position: absolute;
        border-radius: 50%;
        border: 3.5px solid transparent;
      }

      /* Outer ring — blue arc, clockwise */
      .scs-r1 {
        width: 72px; height: 72px;
        border-top-color:    #1535e0;
        border-right-color:  #1535e0;
        border-bottom-color: #1535e020;
        border-left-color:   #1535e020;
        animation: scs-cw 1.1s cubic-bezier(0.4,0,0.2,1) infinite;
        filter: drop-shadow(0 0 6px #1535e066);
      }

      /* Middle ring — teal arc, counter-clockwise */
      .scs-r2 {
        width: 52px; height: 52px;
        border-top-color:    transparent;
        border-right-color:  #00c9b0;
        border-bottom-color: #00c9b0;
        border-left-color:   transparent;
        animation: scs-ccw 0.85s cubic-bezier(0.4,0,0.2,1) infinite;
        filter: drop-shadow(0 0 5px #00c9b066);
      }

      /* Inner ring — gradient feel, clockwise faster */
      .scs-r3 {
        width: 32px; height: 32px;
        border-top-color:   #1535e0;
        border-right-color: #00c9b0;
        border-bottom-color: transparent;
        border-left-color:  transparent;
        animation: scs-cw 0.6s linear infinite;
      }

      /* Center dot — pulsing */
      .scs-dot {
        width: 9px; height: 9px;
        border-radius: 50%;
        background: linear-gradient(135deg, #1535e0, #00c9b0);
        animation: scs-pulse 1.2s ease-in-out infinite;
        box-shadow: 0 0 8px #00c9b099;
      }

      /* Ripple rings behind spinner */
      .scs-ripple {
        position: absolute;
        border-radius: 50%;
        width: 72px; height: 72px;
        border: 1.5px solid #1535e033;
        animation: scs-ripple 2s ease-out infinite;
      }
      .scs-ripple-2 {
        animation-delay: 0.7s;
        border-color: #00c9b033;
      }
      .scs-ripple-3 {
        animation-delay: 1.4s;
      }
    `}</style>

    {/* Ripple rings (behind everything) */}
    <div className="scs-ripple"   />
    <div className="scs-ripple scs-ripple-2" />
    <div className="scs-ripple scs-ripple-3" />

    {/* Orbital rings (centred via flex) */}
    <div style={{ position: 'relative', width: 72, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="scs-ring scs-r1" />
      <div className="scs-ring scs-r2" />
      <div className="scs-ring scs-r3" />
      <div className="scs-dot" />
    </div>
  </>
)

// ─── Overlay ──────────────────────────────────────────────────────────────────
const Loader = () => {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const unsub = loaderStore.subscribe(setVisible)
    return unsub
  }, [])

  if (!visible) return null

  return (
    <div
      style={{
        position:             'fixed',
        inset:                0,
        zIndex:               99999,
        display:              'flex',
        alignItems:           'center',
        justifyContent:       'center',
        backgroundColor:      'rgba(255, 255, 255, 0.6)',
        backdropFilter:       'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }}
    >
      <Spinner />
    </div>
  )
}

export default Loader
