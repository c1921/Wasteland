import { describe, expect, it } from "vitest"

import { getNpcSquadTemplates } from "@/features/map/data/npc-squads"

describe("getNpcSquadTemplates", () => {
  it("returns cached squad templates in the same session", () => {
    const first = getNpcSquadTemplates()
    const second = getNpcSquadTemplates()

    expect(first).toBe(second)
    expect(first.length).toBeGreaterThan(0)
  })
})
