/**
 * pages/manager/SukukListPage.jsx
 * =================================
 * Approved List of Sukuk — Manager Configuration page.
 *
 * Behaviour (SRS §10.3):
 *  ▸ Single "Name" field inline add form with Save button
 *  ▸ Table: Name (sortable) | Delete (red trash → ConfirmModal)
 *  ▸ Duplicate names are blocked with an inline error
 *  ▸ Live search filters table rows
 *
 * Delegates all UI & state logic to the reusable SimpleConfigListPage
 * component — this file only provides page-specific config + seed data.
 *
 * TODO: replace INITIAL_SUKUK with GET /api/manager/sukuk-list
 *       on Save call POST /api/manager/sukuk-list
 *       on Delete call DELETE /api/manager/sukuk-list/:id
 */

import React from 'react'
import SimpleConfigListPage from '../../components/common/config/SimpleConfigListPage'

// ── Seed data ────────────────────────────────────────────────────────────────
const INITIAL_SUKUK = [
  { id: 1, name: 'Air Link Communication Limited' },
  { id: 2, name: 'Al-Karam Textile Mills Short Term Sukuk' },
  { id: 3, name: 'Al-Karam Textile Mills Long Term Sukuk' },
]

// ── Page ─────────────────────────────────────────────────────────────────────
const SukukListPage = () => (
  <SimpleConfigListPage
    title="Approved List of Sukuk"
    fieldLabel="Name"
    fieldPlaceholder="Enter sukuk name"
    maxLength={100}
    tableColTitle="Name"
    initialData={INITIAL_SUKUK}
    confirmMessage="Are you sure you want to do this action?"
  />
)

export default SukukListPage
