import {
  WASTELAND_MAP_NODES,
  WASTELAND_MAP_OBSTACLES,
  WASTELAND_WORLD_CONFIG,
} from "@/features/map/data/wasteland-map"
import { createNpcSquadTemplates } from "@/features/map/lib/npc-squads"
import { buildNavigationGrid } from "@/features/map/lib/pathfinding"
import type { Character } from "@/features/character/types"
import type { NpcSquadTemplate } from "@/features/map/types"

let sessionNpcSquads: NpcSquadTemplate[] | null = null

export function getNpcSquadTemplates() {
  if (!sessionNpcSquads) {
    const navigationGrid = buildNavigationGrid(
      WASTELAND_WORLD_CONFIG,
      WASTELAND_MAP_OBSTACLES
    )

    sessionNpcSquads = createNpcSquadTemplates({
      navigationGrid,
      nodes: WASTELAND_MAP_NODES,
      world: WASTELAND_WORLD_CONFIG,
    })
  }

  return sessionNpcSquads
}

export function getNpcSquadById(squadId: string) {
  return getNpcSquadTemplates().find((squad) => squad.id === squadId) ?? null
}

export function replaceNpcSquadMembers(squadId: string, members: Character[]) {
  const squads = getNpcSquadTemplates()
  const squadIndex = squads.findIndex((squad) => squad.id === squadId)

  if (squadIndex < 0) {
    return false
  }

  const target = squads[squadIndex]
  sessionNpcSquads = [
    ...squads.slice(0, squadIndex),
    {
      ...target,
      members: members.slice(),
    },
    ...squads.slice(squadIndex + 1),
  ]

  return true
}

export function removeNpcSquadById(squadId: string) {
  const squads = getNpcSquadTemplates()
  const next = squads.filter((squad) => squad.id !== squadId)

  if (next.length === squads.length) {
    return false
  }

  sessionNpcSquads = next
  return true
}
