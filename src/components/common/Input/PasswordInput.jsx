/**
 * src/components/common/Input/PasswordInput.jsx
 * ===============================================
 * Password input with built-in show/hide toggle.
 * Wraps the base Input component — caller just passes value/onChange/placeholder.
 *
 * Props:
 *  value        {string}
 *  onChange     {Function}  — receives the raw string value
 *  placeholder  {string}
 *  maxLength    {number}    — default 20
 *  bgColor      {string}    — default "#ffffff"
 *  borderColor  {string}    — default "#dde4ee"
 *  focusBorderColor {string} — default "#00B894"
 *  textColor    {string}    — default "#2f20b0"
 *  error        {boolean}
 *  errorMessage {string}
 */

import React, { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import Input from './Input'

const PasswordInput = ({
  value,
  onChange,
  placeholder = 'Password',
  maxLength = 20,
  bgColor = '#ffffff',
  borderColor = '#dde4ee',
  focusBorderColor = '#00B894',
  textColor = '#2f20b0',
  error = false,
  errorMessage = '',
}) => {
  const [show, setShow] = useState(false)

  return (
    <Input
      type={show ? 'text' : 'password'}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      maxLength={maxLength}
      rightIcon={show ? <Eye size={17} /> : <EyeOff size={17} />}
      onRightIconClick={() => setShow((p) => !p)}
      bgColor={bgColor}
      borderColor={borderColor}
      focusBorderColor={focusBorderColor}
      textColor={textColor}
      error={error}
      errorMessage={errorMessage}
    />
  )
}

export default PasswordInput
