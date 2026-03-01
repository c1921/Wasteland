import { describe, expect, it } from "vitest"

import {
  applyInventoryTransfer,
  getLocationInventoryMap,
  getLocationInventoryById,
  getNpcSquadInventoryMap,
  getPlayerTeamInventory,
  replaceInventoryByOwner,
} from "@/features/items/data/session-inventories"
import { Item, ItemCategory } from "@/features/items/types"

function buildTestItem(id: string, value: number, quantity: number) {
  return new Item({
    id,
    name: id,
    category: ItemCategory.Material,
    weight: 1,
    value,
    quantity,
  })
}

describe("session inventories", () => {
  it("caches player team inventory for the same session", () => {
    const first = getPlayerTeamInventory()
    const second = getPlayerTeamInventory()

    expect(first).toBe(second)
    expect(first.length).toBeGreaterThan(0)
  })

  it("returns stable inventories for the same location ids", () => {
    const first = getLocationInventoryMap(["ash-hub", "iron-lamp"])
    const second = getLocationInventoryMap(["ash-hub", "iron-lamp"])

    expect(first["ash-hub"]).toBe(second["ash-hub"])
    expect(first["iron-lamp"]).toBe(second["iron-lamp"])
    expect(first["ash-hub"].length).toBeGreaterThan(0)
    expect(first["iron-lamp"].length).toBeGreaterThan(0)
  })

  it("keeps location and npc inventories independent", () => {
    const locationInventories = getLocationInventoryMap(["ash-hub"])
    const npcInventories = getNpcSquadInventoryMap(["npc-squad-1"])

    expect(locationInventories["ash-hub"]).toBeTruthy()
    expect(npcInventories["npc-squad-1"]).toBeTruthy()
    expect(locationInventories["ash-hub"]).not.toBe(npcInventories["npc-squad-1"])
  })

  it("applies inventory transfer and removes zero-quantity source item", () => {
    replaceInventoryByOwner(
      { type: "location", id: "transfer-test-location-a" },
      [buildTestItem("scrap-metal", 12, 2)]
    )
    replaceInventoryByOwner(
      { type: "location", id: "transfer-test-location-b" },
      [buildTestItem("scrap-metal", 12, 1)]
    )

    const result = applyInventoryTransfer({
      source: { type: "location", id: "transfer-test-location-a" },
      target: { type: "location", id: "transfer-test-location-b" },
      selection: {
        "scrap-metal": 2,
      },
    })

    expect(result.ok).toBe(true)

    const source = getLocationInventoryById("transfer-test-location-a")
    const target = getLocationInventoryById("transfer-test-location-b")
    expect(source.find((item) => item.id === "scrap-metal")).toBeUndefined()
    expect(target.find((item) => item.id === "scrap-metal")?.quantity).toBe(3)
  })

  it("does not change inventory when transfer fails", () => {
    replaceInventoryByOwner(
      { type: "location", id: "transfer-test-location-c" },
      [buildTestItem("fiber-roll", 8, 1)]
    )
    replaceInventoryByOwner(
      { type: "location", id: "transfer-test-location-d" },
      []
    )

    const result = applyInventoryTransfer({
      source: { type: "location", id: "transfer-test-location-c" },
      target: { type: "location", id: "transfer-test-location-d" },
      selection: {
        "fiber-roll": 2,
      },
    })

    expect(result.ok).toBe(false)
    expect(
      getLocationInventoryById("transfer-test-location-c").find((item) => item.id === "fiber-roll")
        ?.quantity
    ).toBe(1)
    expect(getLocationInventoryById("transfer-test-location-d")).toHaveLength(0)
  })
})
