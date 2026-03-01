import { describe, expect, it } from "vitest"

import { Item, ItemCategory } from "@/features/items/types"
import { validateTrade } from "@/features/trade/lib/engine"

const playerItems = [
  new Item({
    id: "player-food",
    name: "风干蜥肉",
    category: ItemCategory.Food,
    weight: 0.4,
    value: 15,
    quantity: 5,
  }),
  new Item({
    id: "player-cash",
    name: "A币-100元",
    category: ItemCategory.Currency,
    weight: 0.001,
    value: 100,
    quantity: 3,
  }),
  new Item({
    id: "player-gold",
    name: "金",
    category: ItemCategory.PreciousMetal,
    weight: 0.6,
    value: 320,
    quantity: 1,
  }),
]

const targetItems = [
  new Item({
    id: "target-tool",
    name: "多功能工具包",
    category: ItemCategory.Tool,
    weight: 2.1,
    value: 140,
    quantity: 2,
  }),
  new Item({
    id: "target-medicine",
    name: "止血注射剂",
    category: ItemCategory.Medicine,
    weight: 0.2,
    value: 58,
    quantity: 3,
  }),
]

describe("trade engine", () => {
  it("fails when offered value is lower than requested value", () => {
    const result = validateTrade({
      playerItems,
      targetItems,
      playerOfferSelection: {
        "player-food": 1,
      },
      targetOfferSelection: {
        "target-tool": 1,
      },
      restrictions: {
        blockedBuyFromPlayer: [],
        blockedSellToPlayer: [],
      },
    })

    expect(result.ok).toBe(false)
    expect(result.reason).toBe("玩家提供总价值不足，无法完成交易。")
  })

  it("passes when offered value meets requested value", () => {
    const result = validateTrade({
      playerItems,
      targetItems,
      playerOfferSelection: {
        "player-cash": 2,
      },
      targetOfferSelection: {
        "target-tool": 1,
        "target-medicine": 1,
      },
      restrictions: {
        blockedBuyFromPlayer: [],
        blockedSellToPlayer: [],
      },
    })

    expect(result.ok).toBe(true)
    expect(result.offeredValue).toBe(200)
    expect(result.requestedValue).toBe(198)
  })

  it("allows overpay without requiring exact match", () => {
    const result = validateTrade({
      playerItems,
      targetItems,
      playerOfferSelection: {
        "player-gold": 1,
      },
      targetOfferSelection: {
        "target-tool": 2,
      },
      restrictions: {
        blockedBuyFromPlayer: [],
        blockedSellToPlayer: [],
      },
    })

    expect(result.ok).toBe(true)
    expect(result.offeredValue).toBeGreaterThan(result.requestedValue)
  })

  it("rejects blocked categories for buy/sell directions", () => {
    const blockedBuy = validateTrade({
      playerItems,
      targetItems,
      playerOfferSelection: {
        "player-food": 1,
      },
      targetOfferSelection: {},
      restrictions: {
        blockedBuyFromPlayer: [ItemCategory.Food],
        blockedSellToPlayer: [],
      },
    })

    expect(blockedBuy.ok).toBe(false)
    expect(blockedBuy.reason).toContain("拒收类型")

    const blockedSell = validateTrade({
      playerItems,
      targetItems,
      playerOfferSelection: {
        "player-cash": 2,
      },
      targetOfferSelection: {
        "target-medicine": 1,
      },
      restrictions: {
        blockedBuyFromPlayer: [],
        blockedSellToPlayer: [ItemCategory.Medicine],
      },
    })

    expect(blockedSell.ok).toBe(false)
    expect(blockedSell.reason).toContain("拒售类型")
  })

  it("rejects invalid or out-of-range quantities", () => {
    const invalidQuantity = validateTrade({
      playerItems,
      targetItems,
      playerOfferSelection: {
        "player-cash": -1,
      },
      targetOfferSelection: {},
      restrictions: {
        blockedBuyFromPlayer: [],
        blockedSellToPlayer: [],
      },
    })

    expect(invalidQuantity.ok).toBe(false)

    const overflowQuantity = validateTrade({
      playerItems,
      targetItems,
      playerOfferSelection: {
        "player-cash": 4,
      },
      targetOfferSelection: {},
      restrictions: {
        blockedBuyFromPlayer: [],
        blockedSellToPlayer: [],
      },
    })

    expect(overflowQuantity.ok).toBe(false)
    expect(overflowQuantity.reason).toBe("交易数量超过可用库存。")
  })
})
