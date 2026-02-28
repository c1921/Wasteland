import { generateCharacters } from "@/features/character/lib/generator"
import type { Character } from "@/features/character/types"
import type { MapNode, MapNodeKind } from "@/features/map/types"

export type NodePopulationRule = Record<MapNodeKind, { min: number; max: number }>
export type LocationCharacterMap = Record<string, Character[]>

const DEFAULT_POPULATION_RULE: NodePopulationRule = {
  settlement: { min: 5, max: 8 },
  outpost: { min: 3, max: 5 },
  ruin: { min: 2, max: 4 },
  hazard: { min: 1, max: 3 },
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function resolveCount(rule: { min: number; max: number }) {
  const min = Math.max(0, Math.floor(rule.min))
  const max = Math.max(min, Math.floor(rule.max))
  return randomInt(min, max)
}

export function buildLocationCharacterMap(
  nodes: MapNode[],
  rules: NodePopulationRule = DEFAULT_POPULATION_RULE
): LocationCharacterMap {
  const locationCharacterMap: LocationCharacterMap = {}

  for (const node of nodes) {
    const rule = rules[node.kind]
    const count = resolveCount(rule)
    locationCharacterMap[node.id] = generateCharacters({ count })
  }

  return locationCharacterMap
}
