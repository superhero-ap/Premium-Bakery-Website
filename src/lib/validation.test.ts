import { describe, expect, it } from 'vitest'
import { isSafeUpload, isValidEmail, isValidIndianMobile } from './validation'

describe('validation', () => {
  it('accepts Indian mobile numbers', () => expect(isValidIndianMobile('9876543210')).toBe(true))
  it('rejects invalid mobile numbers', () => expect(isValidIndianMobile('1234567890')).toBe(false))
  it('accepts blank optional email', () => expect(isValidEmail('')).toBe(true))
  it('validates email shape', () => expect(isValidEmail('hello@example.com')).toBe(true))
  it('restricts uploads to supported images and size', () => {
    expect(isSafeUpload(new File(['x'], 'cake.webp', { type: 'image/webp' }))).toBe(true)
    expect(isSafeUpload(new File(['x'], 'cake.svg', { type: 'image/svg+xml' }))).toBe(false)
  })
})
