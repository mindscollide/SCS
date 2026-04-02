/**
 * pages/manager/IslamicBanksPage.jsx
 * =====================================
 * Islamic Bank — Manager Configuration page.
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
 * TODO: replace INITIAL_BANKS with GET /api/manager/islamic-banks
 *       on Save call POST /api/manager/islamic-banks
 *       on Delete call DELETE /api/manager/islamic-banks/:id
 */

import React from 'react'
import SimpleConfigListPage from '../../components/common/config/SimpleConfigListPage'

// ── Seed data ────────────────────────────────────────────────────────────────
const INITIAL_BANKS = [
  { id: 1, name: 'Al Barka Bank Pakistan Limited' },
  { id: 2, name: 'Bank Islami Pakistan Limited' },
  { id: 3, name: 'Dubai Islamic Pakistan Limited' },
]

// ── Page ─────────────────────────────────────────────────────────────────────
const IslamicBanksPage = () => (
  <SimpleConfigListPage
    title="Islamic Bank"
    fieldLabel="Bank Name"
    fieldPlaceholder="Enter bank name"
    maxLength={100}
    tableColTitle="Name"
    initialData={INITIAL_BANKS}
    confirmMessage="Are you sure you want to do this action?"
  />
)

export default IslamicBanksPage
