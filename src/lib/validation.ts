export const indianMobile = /^[6-9]\d{9}$/
export const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const isValidIndianMobile = (value: string) => indianMobile.test(value.replace(/\D/g, ''))
export const isValidEmail = (value: string) => !value.trim() || emailPattern.test(value.trim())
export const isSafeUpload = (file: File, maxBytes = 5 * 1024 * 1024) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) && file.size > 0 && file.size <= maxBytes
