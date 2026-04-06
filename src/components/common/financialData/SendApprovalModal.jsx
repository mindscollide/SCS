/**
 * components/common/financialData/SendApprovalModal.jsx
 * =======================================================
 * Reusable "Send for Approval / Re-submit" confirmation modal.
 * Used in:
 *  - FinancialDataListPage  (Send for Approval)
 *  - PendingForApprovalPage (Re-submit for Declined records)
 *
 * Props
 * ─────
 *  record        object    — the record being submitted (must have .ticker)
 *  title         string    — modal title (default: "Send for Approval")
 *  description   string    — optional body text override
 *  submitLabel   string    — confirm button label (default: "Proceed")
 *  defaultNotes  string    — initial notes text (default: "Please Verify")
 *  onClose       function  — cancel handler
 *  onSubmit      function(notes) — confirm handler, receives notes string
 */

import React, { useState } from 'react'
import { X } from 'lucide-react'
import { BtnPrimary, BtnSlate } from '../index.jsx'
import Input from '../Input/Input.jsx'

const SendApprovalModal = ({
  record,
  title = 'Send for Approval',
  description,
  submitLabel = 'Proceed',
  defaultNotes = 'Please Verify',
  onClose,
  onSubmit,
}) => {
  const [notes, setNotes] = useState(defaultNotes)

  if (!record) return null

  const body =
    description ??
    `Are you sure you want to send ${record.ticker} data for approval? You will not be able to make changes after sending.`

  return (
    <div
      className="fixed inset-0 bg-black/45 z-[1000] flex items-center justify-center p-5"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <span className="text-[15px] font-semibold text-[#041E66]">{title}</span>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          <p className="text-[13px] text-slate-500 mb-4 leading-relaxed">{body}</p>
          <Input
            label="Notes"
            multiline
            rows={3}
            maxLength={500}
            showCount
            value={notes}
            onChange={setNotes}
          />
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-100">
          <BtnSlate onClick={onClose}>Cancel</BtnSlate>
          <BtnPrimary onClick={() => onSubmit?.(notes)}>{submitLabel}</BtnPrimary>
        </div>
      </div>
    </div>
  )
}

export default SendApprovalModal
