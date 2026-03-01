import { describe, expect, it } from "vitest"

import {
  getNpcSquadById,
  getNpcSquadTemplates,
  removeNpcSquadById,
  replaceNpcSquadMembers,
} from "@/features/map/data/npc-squads"

describe("npc squad session data", () => {
  it("returns cached squad templates in the same session", () => {
    const first = getNpcSquadTemplates()
    const second = getNpcSquadTemplates()

    expect(first).toBe(second)
    expect(first.length).toBeGreaterThan(0)
  })

  it("supports querying and replacing squad members", () => {
    const squads = getNpcSquadTemplates()
    const target = squads[0]
    const originalMembers = target.members.slice()
    const nextMembers = originalMembers.slice(0, 1)

    expect(getNpcSquadById(target.id)?.id).toBe(target.id)
    expect(replaceNpcSquadMembers(target.id, nextMembers)).toBe(true)
    expect(getNpcSquadById(target.id)?.members).toHaveLength(1)

    expect(replaceNpcSquadMembers(target.id, originalMembers)).toBe(true)
    expect(getNpcSquadById(target.id)?.members).toHaveLength(originalMembers.length)
  })

  it("removes squad by id", () => {
    const squads = getNpcSquadTemplates()
    const target = squads[squads.length - 1]

    expect(removeNpcSquadById(target.id)).toBe(true)
    expect(getNpcSquadById(target.id)).toBeNull()
  })
})
