/**
 * MarketCapEntryPage.jsx — Scaffold (ready for implementation)
 * Styled to match Al-Hilal design system.
 */
import React from 'react'
import { PageHeader } from '../../components/common/index.jsx'

const MarketCapEntryPage = () => (
  <div>
    <PageHeader title="MarketCapEntry" />
    <div className="bg-white rounded-card shadow-card">
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="w-16 h-16 bg-[#EEF2F7] rounded-2xl flex items-center justify-center text-[28px] mb-4">🚧</div>
        <h3 className="text-[15px] font-semibold text-[#1B3A6B] mb-2">MarketCapEntry — Under Construction</h3>
        <p className="text-[13px] text-[#A0AEC0] max-w-sm">Implement per SRS specification.</p>
      </div>
    </div>
  </div>
)

export default MarketCapEntryPage
