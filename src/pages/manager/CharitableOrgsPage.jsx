/**
 * pages/manager/CharitableOrgsPage.jsx
 * ========================================
 * Charitable Organizations — Manager Configuration page.
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
 * TODO: replace INITIAL_ORGS with GET /api/manager/charitable-orgs
 *       on Save call POST /api/manager/charitable-orgs
 *       on Delete call DELETE /api/manager/charitable-orgs/:id
 */

import React from 'react'
import SimpleConfigListPage from '../../components/common/config/SimpleConfigListPage'

// ── Seed data ────────────────────────────────────────────────────────────────
const INITIAL_ORGS = [
  { id: 1, name: 'AKU Patient Behbood Society' },
  { id: 2, name: 'Akhuwat Foundation' },
  { id: 3, name: 'Alamgir Welfare Trust' },
]

// ── Page ─────────────────────────────────────────────────────────────────────
const CharitableOrgsPage = () => (
  <SimpleConfigListPage
    title="Charitable Organizations"
    fieldLabel="Name"
    fieldPlaceholder="Enter organization name"
    maxLength={100}
    tableColTitle="Name"
    initialData={INITIAL_ORGS}
    confirmMessage="Are you sure you want to do this action?"
  />
)

export default CharitableOrgsPage
