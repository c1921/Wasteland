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
    id: "player-cash-100",
    name: "A币-100元",
    category: ItemCategory.Currency,
    weight: 0.001,
    value: 100,
    quantity: 1,
  }),
  new Item({
    id: "player-cash-20",
    name: "A币-20元",
    category: ItemCategory.Currency,
    weight: 0.001,
    value: 20,
    quantity: 2,
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
    quantity: 1,
  }),
  new Item({
    id: "target-medicine",
    name: "止血注射剂",
    category: ItemCategory.Medicine,
    weight: 0.2,
    value: 58,
    quantity: 3,
  }),
  new Item({
    id: "target-cash-20",
    name: "A币-20元",
    category: ItemCategory.Currency,
    weight: 0.001,
    value: 20,
    quantity: 2,
  }),
  new Item({
    id: "target-cash-10",
    name: "A币-10元",
    category: ItemCategory.Currency,
    weight: 0.001,
    value: 10,
    quantity: 1,
  }),
  new Item({
    id: "target-cash-2",
    name: "A币-2元",
    category: ItemCategory.Currency,
    weight: 0.001,
    value: 2,
    quantity: 1,
  }),
]

describe("trade engine", () => {
  it("auto-adds player currency and target change using closest feasible delta", () => {
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

    expect(result.ok).toBe(true)
    expect(result.offeredValue).toBe(155)
    expect(result.requestedValue).toBe(152)
    expect(result.settlementDelta).toBe(3)
    expect(result.settlementExact).toBe(false)
    expect(result.settlementNote).toContain("最接近方案")
    expect(result.resolvedPlayerOfferSelection).toMatchObject({
      "player-food": 1,
      "player-cash-100": 1,
      "player-cash-20": 2,
    })
    expect(result.resolvedTargetOfferSelection).toMatchObject({
      "target-tool": 1,
      "target-cash-10": 1,
      "target-cash-2": 1,
    })
  })

  it("uses exact target change when possible", () => {
    const result = validateTrade({
      playerItems,
      targetItems,
      playerOfferSelection: {
        "player-cash-100": 1,
      },
      targetOfferSelection: {
        "target-medicine": 1,
      },
      restrictions: {
        blockedBuyFromPlayer: [],
        blockedSellToPlayer: [],
      },
    })

    expect(result.ok).toBe(true)
    expect(result.offeredValue).toBe(100)
    expect(result.requestedValue).toBe(100)
    expect(result.settlementDelta).toBe(0)
    expect(result.settlementExact).toBe(true)
    expect(result.resolvedTargetOfferSelection).toMatchObject({
      "target-medicine": 1,
      "target-cash-20": 2,
      "target-cash-2": 1,
    })
  })

  it("fails when no currency combination can satisfy offered >= requested", () => {
    const limitedPlayerItems = [
      new Item({
        id: "player-food",
        name: "风干蜥肉",
        category: ItemCategory.Food,
        weight: 0.4,
        value: 15,
        quantity: 1,
      }),
    ]

    const result = validateTrade({
      playerItems: limitedPlayerItems,
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
    expect(result.reason).toContain("自动结算失败")
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
        "player-cash-100": 1,
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
        "player-cash-100": -1,
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
        "player-cash-100": 2,
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
