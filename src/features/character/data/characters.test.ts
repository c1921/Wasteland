import { describe, expect, it } from "vitest"

import { getCharacters } from "@/features/character/data/characters"

describe("getCharacters", () => {
  it("returns cached characters in the same session", () => {
    const first = getCharacters()
    const second = getCharacters()

    expect(first).toBe(second)
    expect(first).toHaveLength(4)
  })
})
