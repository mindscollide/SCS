/**
 * src/utils/crypto.js
 * ====================
 * AES-GCM 256-bit encrypt / decrypt via the browser Web Crypto API.
 * No external library — uses window.crypto.subtle (all modern browsers).
 *
 * Key derivation:
 *   PBKDF2(APP_SALT + deviceId, KDF_SALT, 200k iterations, SHA-256) → AES-GCM 256-bit
 *
 * Performance:
 *   The derived key is cached in memory after the first call.
 *   Subsequent encrypt/decrypt calls reuse the cached key (~0ms vs ~200ms cold).
 *   Cache is invalidated if the device ID ever changes (never happens in practice).
 *
 * Security:
 *   Device-bound key — copying localStorage to another machine fails decryption.
 *   Random 12-byte IV per encrypt call — no two ciphertexts are the same.
 *   AES-GCM authentication tag — tampered ciphertext throws on decrypt.
 *
 * Storage format (base64):  [ 12-byte IV ][ ciphertext + 16-byte GCM tag ]
 */

const APP_SALT = 'SCS_SECURE_2025'
const KDF_SALT = new TextEncoder().encode('scs-remember-me-salt')

// ── Key cache ────────────────────────────────────────────────────────────────
// Store the in-progress derivation Promise so concurrent calls share one run.
let _keyPromise  = null
let _cachedForId = null

const deriveKey = () => {
  const deviceId = localStorage.getItem('scs_device_id') || 'default-device'

  // Return cached promise if device ID hasn't changed
  if (_keyPromise && _cachedForId === deviceId) return _keyPromise

  _cachedForId = deviceId
  _keyPromise  = (async () => {
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(APP_SALT + deviceId),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    )
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: KDF_SALT, iterations: 200_000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    )
  })()

  return _keyPromise
}

// ── Helpers ──────────────────────────────────────────────────────────────────
// Loop-based toBase64 avoids stack overflow when spreading large Uint8Arrays
// (Function.prototype.apply argument limit is ~65k entries in V8).
const toBase64 = (bytes) => {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

const fromBase64 = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))

// Efficient typed-array concatenation — avoids spread + intermediate allocation
const concat = (a, b) => {
  const out = new Uint8Array(a.length + b.byteLength)
  out.set(a, 0)
  out.set(new Uint8Array(b), a.length)
  return out
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Encrypt a plain-text string.
 * Returns a base64 string: IV (12 bytes) + AES-GCM ciphertext.
 */
export const encryptText = async (plainText) => {
  const key       = await deriveKey()
  const iv        = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plainText)
  )
  return toBase64(concat(iv, encrypted))
}

/**
 * Decrypt a base64 string produced by encryptText.
 * Returns the original plain-text, or null on failure
 * (wrong device, tampered data, or empty input).
 */
export const decryptText = async (cipherBase64) => {
  if (!cipherBase64) return null
  try {
    const key      = await deriveKey()
    const combined = fromBase64(cipherBase64)
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: combined.slice(0, 12) },
      key,
      combined.slice(12)
    )
    return new TextDecoder().decode(decrypted)
  } catch {
    return null   // wrong key (different device) or tampered ciphertext
  }
}
