import { generateCharacters } from "@/features/character/lib/generator"
import { type Character } from "@/features/character/types"

const DEFAULT_TEAM_SIZE = 4

let sessionCharacters: Character[] | null = null

export function getCharacters(): Character[] {
  if (!sessionCharacters) {
    sessionCharacters = generateCharacters({ count: DEFAULT_TEAM_SIZE })
  }

  return sessionCharacters
}
