/**
 * src/components/common/NatureOfBusinessIcon.jsx
 * ================================================
 * CR 6 — Shield icon rendered beside a company name to show its Nature of Business.
 *
 *  1 = Always Compliant      → teal ShieldCheck (#01C9A4, from CR doc artwork) + tooltip shows Reason
 *  2 = Always Non-Compliant  → red  ShieldX     (#F35E5E, from CR doc artwork) + tooltip shows Reason
 *  3 / undefined             → null  (Based on the Data — no icon)
 *
 * Props:
 *  natureOfBusinessID  {number}  — 1 | 2 | 3 (or undefined/null → treated as 3)
 *  reason              {string}  — tooltip text (the Reason field value); omit to show no tooltip
 *  size                {number}  — icon size in px; defaults to 16
 */

import React from 'react'
import { ShieldCheck, ShieldX } from 'lucide-react'

const NatureOfBusinessIcon = ({ natureOfBusinessID, reason, size = 16 }) => {
  if (natureOfBusinessID === 1) {
    return (
      <span title={reason || undefined}>
        <ShieldCheck size={size} color="#01C9A4" className="shrink-0" />
      </span>
    )
  }
  if (natureOfBusinessID === 2) {
    return (
      <span title={reason || undefined}>
        <ShieldX size={size} color="#F35E5E" className="shrink-0" />
      </span>
    )
  }
  return null
}

export default NatureOfBusinessIcon
