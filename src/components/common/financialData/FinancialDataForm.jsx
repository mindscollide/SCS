/**
 * src/components/common/financialData/FinancialDataForm.jsx
 * ===========================================================
 * Reusable financial data entry / view / edit form.
 * Used by:
 *  - pages/dataentry/AddFinancialDataPage.jsx  (add & edit modes)
 *  - pages/manager/PendingApprovalsPage.jsx     (view & edit modes)
 *
 * Props
 * ─────
 *  title            string       — header title text
 *  onBack           function     — called when "Back to Listing" / Close clicked
 *  mode             'add'|'edit'|'view'
 *  record           object|null  — existing record; null = blank add form
 *  quarters         string[]     — quarter options
 *  companies        string[]     — company options
 *
 *  // Data-entry role callbacks
 *  onSaveDraft        function(data) — show "Save" button
 *  onSendForApproval  function(data) — show "Save & Send For Approval" button
 *
 *  // Manager role callback
 *  onUpdate           function(data) — show "Update" button
 *
 * data shape passed to callbacks: { quarter, company, ratios }
 */

import React, { useState, useCallback } from 'react'
import { ArrowLeft } from 'lucide-react'
import { BtnPrimary, BtnTeal, BtnGold } from '../index.jsx'
import FinancialDataTable, {
  MOCK_QUARTERS,
  MOCK_COMPANIES,
  MOCK_RATIOS,
} from '../table/FinancialDataTable.jsx'
import { ConfirmModal } from '../index.jsx'
import { SendForApprovalModal } from '../modals/Modals.jsx'

// ── Helpers ───────────────────────────────────────────────────────────────────

const cloneRatios = (src) =>
  src.map((r) => ({
    ...r,
    classifications: r.classifications.map((c) => ({ ...c, values: [...c.values] })),
  }))

const freshRatios = () =>
  MOCK_RATIOS.map((r) => ({
    ...r,
    classifications: r.classifications.map((c) => ({ ...c, values: ['', ...c.values.slice(1)] })),
  }))

// ─────────────────────────────────────────────────────────────────────────────

const FinancialDataForm = ({
  title = 'Financial Data',
  onBack,
  mode = 'add', // 'add' | 'edit' | 'view'
  record = null,
  quarters = MOCK_QUARTERS,
  companies = MOCK_COMPANIES,
  onSaveDraft,
  onSendForApproval,
  onUpdate,
}) => {
  const isView = mode === 'view'
  const isDataEntry = !!(onSaveDraft || onSendForApproval)

  // ── Form state ────────────────────────────────────────────────────────────
  const [quarter, setQuarter] = useState(record?.quarter ?? '')
  const [company, setCompany] = useState(record?.company ?? '')
  const [errors, setErrors] = useState({ quarter: '', company: '' })
  const [ratios, setRatios] = useState(() =>
    record?.ratios ? cloneRatios(record.ratios) : freshRatios()
  )

  // ── After Search: lock dropdowns & show table data ────────────────────────
  const [searched, setSearched] = useState(!!record) // edit/view mode = already searched

  // ── Modal state ───────────────────────────────────────────────────────────
  const [closeConfirm, setCloseConfirm] = useState(false)
  const [saveConfirm, setSaveConfirm] = useState(false)
  const [sendModal, setSendModal] = useState(false)

  // ── Derived: which controls are enabled ──────────────────────────────────
  const canSearch = !!quarter && !!company && !searched
  const canAction = searched // Close/Save/Send only enabled after Search

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = useCallback(() => {
    if (isView) return true
    const e = {
      quarter: quarter ? '' : 'Quarter is required',
      company: company ? '' : 'Company is required',
    }
    setErrors(e)
    return !e.quarter && !e.company
  }, [isView, quarter, company])

  // ── Cell change ───────────────────────────────────────────────────────────
  const handleCellChange = useCallback((ratioId, classId, colIdx, val) => {
    setRatios((prev) =>
      prev.map((r) => {
        if (r.id !== ratioId) return r
        return {
          ...r,
          classifications: r.classifications.map((cls) => {
            if (cls.id !== classId) return cls
            const newValues = [...cls.values]
            newValues[colIdx] = val
            return { ...cls, values: newValues }
          }),
        }
      })
    )
  }, [])

  const getData = () => ({ quarter, company, ratios })

  // ── Search handler ────────────────────────────────────────────────────────
  const handleSearch = useCallback(() => {
    if (!validate()) return
    setSearched(true)
  }, [validate])

  // ── Close / Back: show confirmation ──────────────────────────────────────
  const handleBackClick = () => {
    if (searched && isDataEntry) setCloseConfirm(true)
    else onBack?.()
  }

  // ── Save (draft) flow ─────────────────────────────────────────────────────
  const handleSaveDraft = useCallback(() => {
    if (!validate()) return
    setSaveConfirm(true)
  }, [validate])

  const confirmSave = useCallback(() => {
    setSaveConfirm(false)
    onSaveDraft?.(getData())
  }, [quarter, company, ratios, onSaveDraft])

  // ── Send for Approval flow ────────────────────────────────────────────────
  const handleSendClick = useCallback(() => {
    if (!validate()) return
    setSendModal(true)
  }, [validate])

  const confirmSend = useCallback(
    (notes) => {
      setSendModal(false)
      onSendForApproval?.({ ...getData(), notes })
    },
    [quarter, company, ratios, onSendForApproval]
  )

  // ── Update (manager) ─────────────────────────────────────────────────────
  const handleUpdate = useCallback(() => {
    if (!validate()) return
    onUpdate?.(getData())
  }, [validate, quarter, company, ratios, onUpdate])

  // ── Action buttons ────────────────────────────────────────────────────────
  const renderActions = () => {
    if (isDataEntry) {
      return (
        <>
          <BtnGold onClick={handleBackClick} disabled={!canAction}>
            Close
          </BtnGold>
          {onSaveDraft && (
            <BtnPrimary onClick={handleSaveDraft} disabled={!canAction}>
              Save
            </BtnPrimary>
          )}
          {onSendForApproval && (
            <BtnTeal onClick={handleSendClick} disabled={!canAction}>
              Save &amp; Send For Approval
            </BtnTeal>
          )}
        </>
      )
    }
    if (onUpdate) {
      return (
        <>
          <BtnGold onClick={onBack}>Close</BtnGold>
          <BtnPrimary onClick={handleUpdate}>Update</BtnPrimary>
        </>
      )
    }
    return <BtnGold onClick={onBack}>Close</BtnGold>
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="font-sans">
      {/* ── Header band: title left, Back to Listing right ── */}
      <div
        className="bg-[#EFF3FF] rounded-xl px-3 py-2 mb-2 border border-slate-200
                      flex items-center justify-between gap-3"
      >
        <h1 className="text-[26px] font-[400] text-[#0B39B5]">{title}</h1>
        <button
          onClick={handleBackClick}
          className="flex items-center gap-2 px-4 py-[9px] bg-[#F5A623] hover:bg-[#e09a1a]
                     text-white rounded-lg text-[13px] font-semibold transition-colors shrink-0"
        >
          <ArrowLeft size={15} />
          Back to Listing
        </button>
      </div>

      {/* ── Form card ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <FinancialDataTable
          quarters={quarters}
          companies={companies}
          selectedQuarter={quarter}
          onQuarterChange={(v) => {
            setQuarter(v)
            setErrors((p) => ({ ...p, quarter: '' }))
            setCompany('')
            setSearched(false)
          }}
          selectedCompany={company}
          onCompanyChange={(v) => {
            setCompany(v)
            setErrors((p) => ({ ...p, company: '' }))
            setSearched(false)
          }}
          quarterError={errors.quarter}
          companyError={errors.company}
          defaultCriteria="Hilal Compliance Criteria"
          onSearch={handleSearch}
          disableQuarter={searched}
          disableCompany={!quarter || searched}
          disableSearch={!canSearch}
          searched={searched}
          ratios={ratios}
          editableCol={isView ? -1 : 0}
          onCellChange={isView ? undefined : handleCellChange}
          actions={renderActions()}
        />
      </div>

      {/* ── Close confirmation modal ── */}
      <ConfirmModal
        open={closeConfirm}
        message="All the changes will be lost. Are you sure you want to close?"
        onYes={() => {
          setCloseConfirm(false)
          onBack?.()
        }}
        onNo={() => setCloseConfirm(false)}
      />

      {/* ── Save confirmation modal ── */}
      <ConfirmModal
        open={saveConfirm}
        message="Are you sure you want to save the information?"
        onYes={confirmSave}
        onNo={() => setSaveConfirm(false)}
      />

      {/* ── Send for Approval modal ── */}
      <SendForApprovalModal
        open={sendModal}
        onClose={() => setSendModal(false)}
        onProceed={confirmSend}
      />
    </div>
  )
}

export default FinancialDataForm
