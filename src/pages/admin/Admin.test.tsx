import { describe, expect, it } from 'vitest'
import { categories, products } from '../../data/demo'

describe('demo catalogue', () => {
  it('contains editable categories and products', () => {
    expect(categories.length).toBeGreaterThanOrEqual(6)
    expect(products.length).toBeGreaterThanOrEqual(10)
  })
  it('uses unique product slugs', () => {
    const slugs = products.map(p => p.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })
})
