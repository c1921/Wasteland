import { describe, expect, it } from "vitest"

import { ITEM_CATALOG } from "@/features/items/data/catalog"
import {
  DEFAULT_QUANTITY_RULES,
  generateRandomItems,
} from "@/features/items/lib/generator"
import { ItemCategory } from "@/features/items/types"

describe("items catalog", () => {
  it("contains seven categories with two templates each", () => {
    const categories = Object.values(ItemCategory)
    expect(categories).toHaveLength(7)

    for (const category of categories) {
      const count = ITEM_CATALOG.filter((item) => item.category === category).length
      expect(count).toBe(2)
    }
  })
})

describe("generateRandomItems", () => {
  it("generates items with complete fields", () => {
    const items = generateRandomItems({
      countMin: 5,
      countMax: 5,
    })

    expect(items).toHaveLength(5)

    for (const item of items) {
      expect(item.id).toBeTruthy()
      expect(item.name).toBeTruthy()
      expect(Object.values(ItemCategory)).toContain(item.category)
      expect(item.weight).toBeGreaterThanOrEqual(0)
      expect(item.value).toBeGreaterThanOrEqual(0)
      expect(item.quantity).toBeGreaterThan(0)
    }
  })

  it("applies default quantity ranges by category", () => {
    const items = generateRandomItems({
      countMin: ITEM_CATALOG.length,
      countMax: ITEM_CATALOG.length,
    })

    for (const item of items) {
      const rule = DEFAULT_QUANTITY_RULES[item.category]
      expect(item.quantity).toBeGreaterThanOrEqual(rule.min)
      expect(item.quantity).toBeLessThanOrEqual(rule.max)
    }
  })
})
