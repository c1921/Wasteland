import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { CharacterRoster } from "@/features/character/ui/character-roster"
import { Character, Gender } from "@/features/character/types"

const sampleCharacters = [
  new Character({
    id: "a",
    name: "霜鸦",
    gender: Gender.Female,
    abilities: {
      strength: 60,
      agility: 75,
      intelligence: 80,
      endurance: 55,
    },
    skills: {
      shooting: 20,
      melee: 10,
      stealth: 16,
      scouting: 18,
      survival: 12,
      medical: 9,
      engineering: 8,
      salvaging: 11,
      driving: 7,
      negotiation: 13,
      taming: 6,
      crafting: 14,
    },
  }),
  new Character({
    id: "b",
    name: "铁缄",
    gender: Gender.Male,
    abilities: {
      strength: 85,
      agility: 50,
      intelligence: 65,
      endurance: 90,
    },
    skills: {
      shooting: 5,
      melee: 19,
      stealth: 4,
      scouting: 7,
      survival: 15,
      medical: 8,
      engineering: 12,
      salvaging: 16,
      driving: 14,
      negotiation: 9,
      taming: 3,
      crafting: 10,
    },
  }),
]

describe("CharacterRoster", () => {
  it("renders character list and default details", () => {
    render(<CharacterRoster characters={sampleCharacters} />)

    expect(screen.getAllByText("霜鸦").length).toBeGreaterThan(0)
    expect(screen.getAllByText("铁缄").length).toBeGreaterThan(0)
    expect(screen.getByText("射击")).toBeTruthy()
    expect(screen.getByText("制作")).toBeTruthy()
    expect(screen.getByText("20")).toBeTruthy()
    expect(screen.queryByText(/评分/)).toBeNull()
  })

  it("switches details when selecting another character", () => {
    render(<CharacterRoster characters={sampleCharacters} />)

    const [target] = screen.getAllByRole("button", { name: /铁缄/ })
    fireEvent.click(target)

    expect(screen.getByText("5")).toBeTruthy()
    expect(screen.getByText("19")).toBeTruthy()
  })

  it("shows empty state when no characters are provided", () => {
    render(<CharacterRoster characters={[]} />)

    expect(screen.getByText("暂无角色数据。")).toBeTruthy()
  })
})
