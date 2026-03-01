import { describe, expect, it } from "vitest"

import { ItemCategory } from "@/features/items/types"
import {
  resolveLocationTradeRestrictions,
  resolveNpcSquadTradeRestrictions,
} from "@/features/trade/lib/restrictions"

describe("trade restrictions", () => {
  it("returns stable location restrictions for the same kind", () => {
    const first = resolveLocationTradeRestrictions("settlement")
    const second = resolveLocationTradeRestrictions("settlement")

    expect(first).toEqual(second)
  })

  it("returns stable npc restrictions for the same squad id", () => {
    const first = resolveNpcSquadTradeRestrictions("npc-squad-1")
    const second = resolveNpcSquadTradeRestrictions("npc-squad-1")

    expect(first).toEqual(second)
  })

  it("keeps currency and precious metal always tradable", () => {
    const locationRules = resolveLocationTradeRestrictions("hazard")
    const npcRules = resolveNpcSquadTradeRestrictions("npc-squad-3")

    expect(locationRules.blockedBuyFromPlayer).not.toContain(ItemCategory.Currency)
    expect(locationRules.blockedBuyFromPlayer).not.toContain(ItemCategory.PreciousMetal)
    expect(locationRules.blockedSellToPlayer).not.toContain(ItemCategory.Currency)
    expect(locationRules.blockedSellToPlayer).not.toContain(ItemCategory.PreciousMetal)

    expect(npcRules.blockedBuyFromPlayer).not.toContain(ItemCategory.Currency)
    expect(npcRules.blockedBuyFromPlayer).not.toContain(ItemCategory.PreciousMetal)
    expect(npcRules.blockedSellToPlayer).not.toContain(ItemCategory.Currency)
    expect(npcRules.blockedSellToPlayer).not.toContain(ItemCategory.PreciousMetal)
  })
})
