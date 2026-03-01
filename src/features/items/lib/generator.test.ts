import { describe, expect, it } from "vitest"

import { ITEM_CATALOG } from "@/features/items/data/catalog"
import {
  DEFAULT_QUANTITY_RULES,
  generateRandomItems,
} from "@/features/items/lib/generator"
import { ItemCategory } from "@/features/items/types"

describe("items catalog", () => {
  it("contains expected category counts", () => {
    const categories = Object.values(ItemCategory)
    expect(categories).toHaveLength(9)

    expect(
      ITEM_CATALOG.filter((item) => item.category === ItemCategory.Weapon).length
    ).toBe(2)
    expect(
      ITEM_CATALOG.filter((item) => item.category === ItemCategory.Armor).length
    ).toBe(2)
    expect(
      ITEM_CATALOG.filter((item) => item.category === ItemCategory.Clothing).length
    ).toBe(2)
    expect(
      ITEM_CATALOG.filter((item) => item.category === ItemCategory.Food).length
    ).toBe(2)
    expect(
      ITEM_CATALOG.filter((item) => item.category === ItemCategory.Tool).length
    ).toBe(2)
    expect(
      ITEM_CATALOG.filter((item) => item.category === ItemCategory.Material).length
    ).toBe(2)
    expect(
      ITEM_CATALOG.filter((item) => item.category === ItemCategory.Medicine).length
    ).toBe(2)
    expect(
      ITEM_CATALOG.filter((item) => item.category === ItemCategory.PreciousMetal).length
    ).toBe(2)
    expect(
      ITEM_CATALOG.filter((item) => item.category === ItemCategory.Currency).length
    ).toBe(14)
  })

  it("contains only gold and silver in precious metal category", () => {
    const preciousMetalNames = ITEM_CATALOG.filter(
      (item) => item.category === ItemCategory.PreciousMetal
    )
      .map((item) => item.name)
      .sort()

    expect(preciousMetalNames).toEqual(["金", "银"])
  })

  it("uses currency names with fixed format, currency set and denominations", () => {
    const currencyItems = ITEM_CATALOG.filter(
      (item) => item.category === ItemCategory.Currency
    )
    const pattern = /^(A币|B币)-(1|2|5|10|20|50|100)元$/
    const currencySet = new Set<string>()
    const denominationSet = new Set<number>()

    for (const item of currencyItems) {
      expect(item.name).toMatch(pattern)

      const match = item.name.match(pattern)
      expect(match).toBeTruthy()

      const currency = match![1]
      const denomination = Number(match![2])
      currencySet.add(currency)
      denominationSet.add(denomination)
    }

    expect([...currencySet].sort()).toEqual(["A币", "B币"])
    expect([...denominationSet].sort((a, b) => a - b)).toEqual([1, 2, 5, 10, 20, 50, 100])
  })

  it("sets currency template weight to 0.001", () => {
    const currencyItems = ITEM_CATALOG.filter(
      (item) => item.category === ItemCategory.Currency
    )

    expect(currencyItems.length).toBeGreaterThan(0)

    for (const item of currencyItems) {
      expect(item.weight).toBe(0.001)
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
