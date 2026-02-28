import { describe, expect, it } from "vitest"

import {
  getLocationInventoryMap,
  getNpcSquadInventoryMap,
  getPlayerTeamInventory,
} from "@/features/items/data/session-inventories"

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
})
