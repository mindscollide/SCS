/**
 * pages/manager/IslamicBankWindowsPage.jsx
 * ==========================================
 * Islamic Bank Windows — Manager Configuration page.
 *
 * Behaviour (SRS §10.3):
 *  ▸ Single "Bank Name" field inline add form with Save button
 *  ▸ Table: Name (sortable) | Delete (red trash → ConfirmModal)
 *  ▸ Duplicate names are blocked with an inline error
 *  ▸ Live search filters table rows
 *
 * Delegates all UI & state logic to the reusable SimpleConfigListPage
 * component — this file only provides page-specific config + seed data.
 *
 * TODO: replace INITIAL_WINDOWS with GET /api/manager/islamic-bank-windows
 *       on Save call POST /api/manager/islamic-bank-windows
 *       on Delete call DELETE /api/manager/islamic-bank-windows/:id
 */

import React from 'react'
import SimpleConfigListPage from '../../components/common/config/SimpleConfigListPage'

// ── Seed data ────────────────────────────────────────────────────────────────
const INITIAL_WINDOWS = [
  { id: 1, name: 'Allied Abeter Islamic Banking' },
  { id: 2, name: 'Askari Bank Limited Islamic Banking' },
  { id: 3, name: 'Bank Al Habib Limited Islamic Banking' },
]

// ── Page ─────────────────────────────────────────────────────────────────────
const IslamicBankWindowsPage = () => (
  <SimpleConfigListPage
    title="Islamic Bank Windows"
    fieldLabel="Bank Name"
    fieldPlaceholder="Enter bank window name"
    maxLength={100}
    tableColTitle="Name"
    initialData={INITIAL_WINDOWS}
    confirmMessage="Are you sure you want to do this action?"
  />
)

export default IslamicBankWindowsPage
