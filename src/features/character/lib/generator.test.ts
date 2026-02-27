import { describe, expect, it } from "vitest"

import { generateCharacters } from "@/features/character/lib/generator"

describe("generateCharacters", () => {
  it("returns 4 characters by default", () => {
    const characters = generateCharacters()

    expect(characters).toHaveLength(4)
  })

  it("supports custom count", () => {
    const characters = generateCharacters({ count: 6 })

    expect(characters).toHaveLength(6)
  })

  it("generates valid and unique character profiles", () => {
    const characters = generateCharacters({ count: 12 })
    const ids = new Set<string>()

    for (const character of characters) {
      const profile = character.toJSON()

      expect(profile.id.length).toBeGreaterThan(0)
      expect(profile.name.length).toBeGreaterThan(0)
      expect(ids.has(profile.id)).toBe(false)
      ids.add(profile.id)

      for (const value of Object.values(profile.abilities)) {
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThanOrEqual(100)
      }

      for (const value of Object.values(profile.skills)) {
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThanOrEqual(20)
      }
    }
  })
})
