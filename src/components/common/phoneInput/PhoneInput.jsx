/**
 * src/components/common/phoneInput/PhoneInput.jsx
 * =================================================
 * Phone input with searchable country code dropdown.
 *
 * Props:
 *  value            {string}   — digits only (controlled)
 *  onChange         {Function} — (digits: string) => void
 *  onCountryChange  {Function} — ({ name, dialCode, flag, code }) => void
 *  defaultCountry   {string}   — ISO code e.g. "PK" (default Pakistan)
 *  label            {string}
 *  required         {boolean}
 *  placeholder      {string}
 *  maxLength        {number}
 *  error            {boolean}
 *  errorMessage     {string}
 *  disabled         {boolean} — disables the entire component (flag btn + number input)
 *  focusBorderColor {string}
 *  className        {string}
 */

import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, Search } from 'lucide-react'

// ─── Country list ─────────────────────────────────────────────────────────────
const COUNTRIES = [
  { name: 'Afghanistan',            code: 'AF', dialCode: '+93',  flag: '🇦🇫' },
  { name: 'Albania',                code: 'AL', dialCode: '+355', flag: '🇦🇱' },
  { name: 'Algeria',                code: 'DZ', dialCode: '+213', flag: '🇩🇿' },
  { name: 'Argentina',              code: 'AR', dialCode: '+54',  flag: '🇦🇷' },
  { name: 'Australia',              code: 'AU', dialCode: '+61',  flag: '🇦🇺' },
  { name: 'Austria',                code: 'AT', dialCode: '+43',  flag: '🇦🇹' },
  { name: 'Bahrain',                code: 'BH', dialCode: '+973', flag: '🇧🇭' },
  { name: 'Bangladesh',             code: 'BD', dialCode: '+880', flag: '🇧🇩' },
  { name: 'Belgium',                code: 'BE', dialCode: '+32',  flag: '🇧🇪' },
  { name: 'Brazil',                 code: 'BR', dialCode: '+55',  flag: '🇧🇷' },
  { name: 'Canada',                 code: 'CA', dialCode: '+1',   flag: '🇨🇦' },
  { name: 'China',                  code: 'CN', dialCode: '+86',  flag: '🇨🇳' },
  { name: 'Denmark',                code: 'DK', dialCode: '+45',  flag: '🇩🇰' },
  { name: 'Egypt',                  code: 'EG', dialCode: '+20',  flag: '🇪🇬' },
  { name: 'Finland',                code: 'FI', dialCode: '+358', flag: '🇫🇮' },
  { name: 'France',                 code: 'FR', dialCode: '+33',  flag: '🇫🇷' },
  { name: 'Germany',                code: 'DE', dialCode: '+49',  flag: '🇩🇪' },
  { name: 'Ghana',                  code: 'GH', dialCode: '+233', flag: '🇬🇭' },
  { name: 'India',                  code: 'IN', dialCode: '+91',  flag: '🇮🇳' },
  { name: 'Indonesia',              code: 'ID', dialCode: '+62',  flag: '🇮🇩' },
  { name: 'Iran',                   code: 'IR', dialCode: '+98',  flag: '🇮🇷' },
  { name: 'Iraq',                   code: 'IQ', dialCode: '+964', flag: '🇮🇶' },
  { name: 'Ireland',                code: 'IE', dialCode: '+353', flag: '🇮🇪' },
  { name: 'Italy',                  code: 'IT', dialCode: '+39',  flag: '🇮🇹' },
  { name: 'Japan',                  code: 'JP', dialCode: '+81',  flag: '🇯🇵' },
  { name: 'Jordan',                 code: 'JO', dialCode: '+962', flag: '🇯🇴' },
  { name: 'Kenya',                  code: 'KE', dialCode: '+254', flag: '🇰🇪' },
  { name: 'Kuwait',                 code: 'KW', dialCode: '+965', flag: '🇰🇼' },
  { name: 'Lebanon',                code: 'LB', dialCode: '+961', flag: '🇱🇧' },
  { name: 'Libya',                  code: 'LY', dialCode: '+218', flag: '🇱🇾' },
  { name: 'Malaysia',               code: 'MY', dialCode: '+60',  flag: '🇲🇾' },
  { name: 'Maldives',               code: 'MV', dialCode: '+960', flag: '🇲🇻' },
  { name: 'Mauritania',             code: 'MR', dialCode: '+222', flag: '🇲🇷' },
  { name: 'Morocco',                code: 'MA', dialCode: '+212', flag: '🇲🇦' },
  { name: 'Netherlands',            code: 'NL', dialCode: '+31',  flag: '🇳🇱' },
  { name: 'New Zealand',            code: 'NZ', dialCode: '+64',  flag: '🇳🇿' },
  { name: 'Nigeria',                code: 'NG', dialCode: '+234', flag: '🇳🇬' },
  { name: 'Norway',                 code: 'NO', dialCode: '+47',  flag: '🇳🇴' },
  { name: 'Oman',                   code: 'OM', dialCode: '+968', flag: '🇴🇲' },
  { name: 'Pakistan',               code: 'PK', dialCode: '+92',  flag: '🇵🇰' },
  { name: 'Palestine',              code: 'PS', dialCode: '+970', flag: '🇵🇸' },
  { name: 'Philippines',            code: 'PH', dialCode: '+63',  flag: '🇵🇭' },
  { name: 'Poland',                 code: 'PL', dialCode: '+48',  flag: '🇵🇱' },
  { name: 'Portugal',               code: 'PT', dialCode: '+351', flag: '🇵🇹' },
  { name: 'Qatar',                  code: 'QA', dialCode: '+974', flag: '🇶🇦' },
  { name: 'Russia',                 code: 'RU', dialCode: '+7',   flag: '🇷🇺' },
  { name: 'Saudi Arabia',           code: 'SA', dialCode: '+966', flag: '🇸🇦' },
  { name: 'Senegal',                code: 'SN', dialCode: '+221', flag: '🇸🇳' },
  { name: 'Singapore',              code: 'SG', dialCode: '+65',  flag: '🇸🇬' },
  { name: 'Somalia',                code: 'SO', dialCode: '+252', flag: '🇸🇴' },
  { name: 'South Africa',           code: 'ZA', dialCode: '+27',  flag: '🇿🇦' },
  { name: 'South Korea',            code: 'KR', dialCode: '+82',  flag: '🇰🇷' },
  { name: 'Spain',                  code: 'ES', dialCode: '+34',  flag: '🇪🇸' },
  { name: 'Sri Lanka',              code: 'LK', dialCode: '+94',  flag: '🇱🇰' },
  { name: 'Sudan',                  code: 'SD', dialCode: '+249', flag: '🇸🇩' },
  { name: 'Sweden',                 code: 'SE', dialCode: '+46',  flag: '🇸🇪' },
  { name: 'Switzerland',            code: 'CH', dialCode: '+41',  flag: '🇨🇭' },
  { name: 'Syria',                  code: 'SY', dialCode: '+963', flag: '🇸🇾' },
  { name: 'Tanzania',               code: 'TZ', dialCode: '+255', flag: '🇹🇿' },
  { name: 'Thailand',               code: 'TH', dialCode: '+66',  flag: '🇹🇭' },
  { name: 'Tunisia',                code: 'TN', dialCode: '+216', flag: '🇹🇳' },
  { name: 'Turkey',                 code: 'TR', dialCode: '+90',  flag: '🇹🇷' },
  { name: 'Uganda',                 code: 'UG', dialCode: '+256', flag: '🇺🇬' },
  { name: 'Ukraine',                code: 'UA', dialCode: '+380', flag: '🇺🇦' },
  { name: 'United Arab Emirates',   code: 'AE', dialCode: '+971', flag: '🇦🇪' },
  { name: 'United Kingdom',         code: 'GB', dialCode: '+44',  flag: '🇬🇧' },
  { name: 'United States',          code: 'US', dialCode: '+1',   flag: '🇺🇸' },
  { name: 'Yemen',                  code: 'YE', dialCode: '+967', flag: '🇾🇪' },
]

// ─── Component ────────────────────────────────────────────────────────────────
const PhoneInput = ({
  value,
  onChange,
  onCountryChange,
  defaultCountry = 'PK',
  label = '',
  required = false,
  placeholder = 'Mobile Number',
  maxLength = 12,
  error = false,
  errorMessage = '',
  disabled = false,
  focusBorderColor = '#01C9A4',
  className = '',
}) => {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(
    () => COUNTRIES.find((c) => c.code === defaultCountry) || COUNTRIES.find((c) => c.code === 'PK')
  )

  const wrapperRef = useRef(null)
  const inputRef = useRef(null)
  const searchRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Focus search when dropdown opens
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50)
  }, [open])

  const filtered = COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.dialCode.includes(search) ||
      c.code.toLowerCase().includes(search.toLowerCase())
  )

  const handleSelect = (country) => {
    setSelected(country)
    setOpen(false)
    setSearch('')
    onChange('') // clear number when country changes
    onCountryChange?.(country)
  }

  const handleNumberChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, maxLength)
    onChange(digits)
  }

  return (
    <div className={`w-full ${className}`} ref={wrapperRef}>
      {/* Label */}
      {label && (
        <label className="block text-[12px] font-medium text-[#041E66] mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}

      {/* Input row */}
      <div
        className={`flex items-stretch bg-white border rounded-xl overflow-visible
                    transition-all duration-150 relative
                    ${error ? 'border-red-500' : 'border-slate-200'}
                    ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
        onFocus={(e) => {
          if (!disabled && !error && !e.currentTarget.contains(e.relatedTarget))
            e.currentTarget.style.borderColor = focusBorderColor
        }}
        onBlur={(e) => {
          if (!disabled && !error && !e.currentTarget.contains(e.relatedTarget))
            e.currentTarget.style.borderColor = '#e2e8f0'
        }}
      >
        {/* Country selector button */}
        <button
          type="button"
          onClick={() => !disabled && setOpen((p) => !p)}
          disabled={disabled}
          className="flex items-center gap-1.5 px-3 border-r border-slate-200
                     shrink-0 hover:bg-slate-50 transition-colors rounded-l-xl
                     disabled:cursor-not-allowed"
        >
          <span className="text-[18px] leading-none">{selected.flag}</span>
          <span className="text-[13px] font-semibold text-[#041E66]">{selected.dialCode}</span>
          <ChevronDown
            size={13}
            className={`text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Number input */}
        <input
          ref={inputRef}
          type="tel"
          inputMode="numeric"
          value={value}
          onChange={handleNumberChange}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 px-3 py-[10px] text-[13px] text-[#041E66]
                     placeholder:text-[#a0aec0] bg-transparent border-none outline-none
                     disabled:cursor-not-allowed"
        />

        {/* Dropdown */}
        {open && (
          <div
            className="absolute top-full left-0 mt-1 w-[280px] bg-white border border-slate-200
                       rounded-xl shadow-lg z-50 overflow-hidden"
          >
            {/* Search */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100">
              <Search size={14} className="text-slate-400 shrink-0" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search country or code..."
                className="flex-1 text-[12px] text-slate-700 placeholder:text-slate-400
                           outline-none bg-transparent"
              />
            </div>

            {/* List */}
            <ul className="max-h-[200px] overflow-y-auto">
              {filtered.length === 0 ? (
                <li className="px-4 py-3 text-[12px] text-slate-400 text-center">
                  No country found
                </li>
              ) : (
                filtered.map((country) => (
                  <li
                    key={country.code}
                    onClick={() => handleSelect(country)}
                    className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer
                                text-[13px] hover:bg-slate-50 transition-colors
                                ${selected.code === country.code ? 'bg-teal-50 text-teal-700 font-medium' : 'text-slate-700'}`}
                  >
                    <span className="text-[16px] leading-none shrink-0">{country.flag}</span>
                    <span className="flex-1 truncate">{country.name}</span>
                    <span className="text-[12px] text-slate-400 shrink-0">{country.dialCode}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </div>

      {/* Error */}
      {error && errorMessage && (
        <p className="text-[11px] text-red-500 mt-1 font-medium">{errorMessage}</p>
      )}
    </div>
  )
}

export default PhoneInput
