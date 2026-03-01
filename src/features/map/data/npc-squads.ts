import { getGameSessionStore } from "@/engine/session/game-session-store"
import {
  WASTELAND_MAP_NODES,
  WASTELAND_MAP_OBSTACLES,
  WASTELAND_WORLD_CONFIG,
} from "@/features/map/data/wasteland-map"
import { createNpcSquadTemplates } from "@/features/map/lib/npc-squads"
import { buildNavigationGrid } from "@/features/map/lib/pathfinding"
import type { Character } from "@/features/character/types"
import type { NpcSquadTemplate } from "@/features/map/types"

const SESSION_NPC_SQUADS_KEY = "map.npc-squads"

export function getNpcSquadTemplates() {
  const store = getGameSessionStore()
  const existing = store.get<NpcSquadTemplate[] | null>(SESSION_NPC_SQUADS_KEY)

  if (!existing) {
    const navigationGrid = buildNavigationGrid(
      WASTELAND_WORLD_CONFIG,
      WASTELAND_MAP_OBSTACLES
    )

    const created = createNpcSquadTemplates({
      navigationGrid,
      nodes: WASTELAND_MAP_NODES,
      world: WASTELAND_WORLD_CONFIG,
    })
    store.set(SESSION_NPC_SQUADS_KEY, created)
    return created
  }

  return existing
}

export function getNpcSquadById(squadId: string) {
  return getNpcSquadTemplates().find((squad) => squad.id === squadId) ?? null
}

export function replaceNpcSquadMembers(squadId: string, members: Character[]) {
  const store = getGameSessionStore()
  const squads = getNpcSquadTemplates()
  const squadIndex = squads.findIndex((squad) => squad.id === squadId)

  if (squadIndex < 0) {
    return false
  }

  const target = squads[squadIndex]
  store.set(SESSION_NPC_SQUADS_KEY, [
    ...squads.slice(0, squadIndex),
    {
      ...target,
      members: members.slice(),
    },
    ...squads.slice(squadIndex + 1),
  ])

  return true
}

export function removeNpcSquadById(squadId: string) {
  const store = getGameSessionStore()
  const squads = getNpcSquadTemplates()
  const next = squads.filter((squad) => squad.id !== squadId)

  if (next.length === squads.length) {
    return false
  }

  store.set(SESSION_NPC_SQUADS_KEY, next)
  return true
}

export function resetNpcSquadSession() {
  getGameSessionStore().delete(SESSION_NPC_SQUADS_KEY)
}
