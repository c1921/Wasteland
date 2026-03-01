import { describe, expect, it } from "vitest"

import {
  getLocationInventoryById,
  getPlayerTeamInventory,
  replaceInventoryByOwner,
} from "@/features/items/data/session-inventories"
import { Item, ItemCategory } from "@/features/items/types"
import { applySessionTrade } from "@/features/trade/data/session-trades"

const TEST_LOCATION_ID = "trade-test-location"

function buildCash(quantity: number) {
  return new Item({
    id: "test-currency",
    name: "A币-100元",
    category: ItemCategory.Currency,
    weight: 0.001,
    value: 100,
    quantity,
  })
}

function buildTool(quantity: number) {
  return new Item({
    id: "test-tool",
    name: "多功能工具包",
    category: ItemCategory.Tool,
    weight: 2.1,
    value: 140,
    quantity,
  })
}

describe("session trades", () => {
  it("applies successful trade to both inventories", () => {
    replaceInventoryByOwner({ type: "player-team" }, [buildCash(3)])
    replaceInventoryByOwner({ type: "location", id: TEST_LOCATION_ID }, [buildTool(1)])

    const result = applySessionTrade({
      target: {
        type: "location",
        id: TEST_LOCATION_ID,
        name: "测试地点",
        kind: "settlement",
      },
      restrictions: {
        blockedBuyFromPlayer: [],
        blockedSellToPlayer: [],
      },
      playerOfferSelection: {
        "test-currency": 2,
      },
      targetOfferSelection: {
        "test-tool": 1,
      },
    })

    expect(result.ok).toBe(true)

    const playerInventory = getPlayerTeamInventory()
    const locationInventory = getLocationInventoryById(TEST_LOCATION_ID)
    const playerCash = playerInventory.find((item) => item.id === "test-currency")
    const playerTool = playerInventory.find((item) => item.id === "test-tool")
    const locationCash = locationInventory.find((item) => item.id === "test-currency")

    expect(playerCash?.quantity).toBe(1)
    expect(playerTool?.quantity).toBe(1)
    expect(locationCash?.quantity).toBe(2)
    expect(locationInventory.find((item) => item.id === "test-tool")).toBeUndefined()
  })

  it("keeps inventories unchanged when trade validation fails", () => {
    replaceInventoryByOwner({ type: "player-team" }, [buildCash(1)])
    replaceInventoryByOwner({ type: "location", id: TEST_LOCATION_ID }, [buildTool(2)])

    const result = applySessionTrade({
      target: {
        type: "location",
        id: TEST_LOCATION_ID,
        name: "测试地点",
        kind: "settlement",
      },
      restrictions: {
        blockedBuyFromPlayer: [],
        blockedSellToPlayer: [],
      },
      playerOfferSelection: {
        "test-currency": 1,
      },
      targetOfferSelection: {
        "test-tool": 2,
      },
    })

    expect(result.ok).toBe(false)
    expect(getPlayerTeamInventory().find((item) => item.id === "test-currency")?.quantity).toBe(1)
    expect(getLocationInventoryById(TEST_LOCATION_ID).find((item) => item.id === "test-tool")?.quantity).toBe(2)
  })
})
