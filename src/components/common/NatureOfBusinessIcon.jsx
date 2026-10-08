/**
 * src/components/common/NatureOfBusinessIcon.jsx
 * ================================================
 * CR 6 — Shield icon rendered beside a company name to show its Nature of Business.
 *
 *  1 = Always Compliant      → /always-compliant-icon.png     (teal shield-check)
 *  2 = Always Non-Compliant  → /always-non-compliant-icon.png (red shield-X)
 *  3 / undefined             → null  (Based on the Data — no icon)
 *
 * Props:
 *  natureOfBusinessID  {number}  — 1 | 2 | 3 (or undefined/null → treated as 3)
 *  reason              {string}  — tooltip text (the Reason field value); omit to show no tooltip
 *  size                {number}  — icon size in px; defaults to 16
 */

import React from 'react'

const NatureOfBusinessIcon = ({ natureOfBusinessID, reason, size = 16 }) => {
  if (natureOfBusinessID === 1) {
    return (
      <span title={reason || undefined} className="inline-flex shrink-0">
        <img
          src="/always-compliant-icon.png"
          alt="Always Compliant"
          width={size}
          height={size}
          style={{ display: 'block' }}
        />
      </span>
    )
  }
  if (natureOfBusinessID === 2) {
    return (
      <span title={reason || undefined} className="inline-flex shrink-0">
        <img
          src="/always-non-compliant-icon.png"
          alt="Always Non-Compliant"
          width={size}
          height={size}
          style={{ display: 'block' }}
        />
      </span>
    )
  }
  return null
}

export default NatureOfBusinessIcon
