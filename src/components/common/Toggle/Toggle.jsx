/**
 * components/common/Toggle/Toggle.jsx
 * =====================================
 * Reusable iOS-style toggle switch.
 *
 * Props
 * ──────
 *  checked   {boolean}           — current on/off state
 *  onChange  {(val: boolean) => void} — called with new boolean on click
 *  disabled  {boolean}           — disables interaction and dims (default: false)
 *  label     {string | ReactNode}— optional label rendered to the right
 *  size      {"sm" | "md"}       — switch size (default: "md")
 *  className {string}            — extra classes on the wrapper label
 *
 * Usage:
 *  import Toggle from '../../components/common/Toggle/Toggle'
 *
 *  // Basic
 *  <Toggle checked={isOn} onChange={setIsOn} label="Calculated" />
 *
 *  // Disabled
 *  <Toggle checked={false} onChange={() => {}} disabled label="Prorated" />
 *
 *  // Small variant
 *  <Toggle checked={isOn} onChange={setIsOn} size="sm" />
 */

const Toggle = ({
  checked,
  onChange,
  disabled = false,
  label,
  size = 'md',
  className = '',
}) => {
  const isSm = size === 'sm'

  // Track dimensions per size
  const track  = isSm ? 'h-4 w-7'   : 'h-5 w-9'
  const thumb  = isSm ? 'h-3 w-3'   : 'h-3.5 w-3.5'
  const onPos  = isSm ? 'translate-x-[14px]' : 'translate-x-[18px]'
  const offPos = 'translate-x-[2px]'

  return (
    <label
      className={`inline-flex items-center gap-2 select-none
                  ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                  ${className}`}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative inline-flex ${track} items-center rounded-full
                    transition-colors focus:outline-none focus-visible:ring-2
                    focus-visible:ring-[#01C9A4] focus-visible:ring-offset-2
                    ${checked ? 'bg-[#01C9A4]' : 'bg-[#CBD5E1]'}
                    ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span
          className={`inline-block ${thumb} transform rounded-full bg-white shadow
                      transition-transform duration-200
                      ${checked ? onPos : offPos}`}
        />
      </button>

      {label && (
        <span className="text-[13px] text-[#041E66]">{label}</span>
      )}
    </label>
  )
}

export default Toggle
