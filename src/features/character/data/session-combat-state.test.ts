import { beforeEach, describe, expect, it } from "vitest"

import {
  applyCharacterCombatResult,
  getCharacterCombatState,
  getCombatStatesByCharacterIds,
  resetCharacterCombatState,
} from "@/features/character/data/session-combat-state"

describe("session combat state", () => {
  beforeEach(() => {
    resetCharacterCombatState()
  })

  it("creates default combat state on first read", () => {
    const state = getCharacterCombatState("character-a")

    expect(state).toMatchObject({
      characterId: "character-a",
      maxHp: 100,
      hp: 100,
      morale: 100,
      alive: true,
      routing: false,
    })
  })

  it("updates combat state and keeps values clamped", () => {
    applyCharacterCombatResult([
      {
        characterId: "character-a",
        maxHp: 120,
        hp: 130,
        morale: -2,
        alive: true,
        routing: false,
      },
    ])

    const state = getCharacterCombatState("character-a")
    expect(state).toMatchObject({
      maxHp: 120,
      hp: 120,
      morale: 0,
      alive: true,
      routing: false,
    })
  })

  it("returns map by ids and supports reset by id", () => {
    applyCharacterCombatResult([
      {
        characterId: "character-a",
        maxHp: 90,
        hp: 20,
        morale: 40,
        alive: true,
        routing: true,
      },
      {
        characterId: "character-b",
        maxHp: 110,
        hp: 0,
        morale: 12,
        alive: false,
        routing: true,
      },
    ])

    const states = getCombatStatesByCharacterIds(["character-a", "character-b"])
    expect(states["character-a"]?.routing).toBe(true)
    expect(states["character-b"]?.alive).toBe(false)

    resetCharacterCombatState(["character-a"])
    expect(getCharacterCombatState("character-a").hp).toBe(100)
    expect(getCharacterCombatState("character-b").alive).toBe(false)
  })
})
