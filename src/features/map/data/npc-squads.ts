import {
  WASTELAND_MAP_NODES,
  WASTELAND_MAP_OBSTACLES,
  WASTELAND_WORLD_CONFIG,
} from "@/features/map/data/wasteland-map"
import { createNpcSquadTemplates } from "@/features/map/lib/npc-squads"
import { buildNavigationGrid } from "@/features/map/lib/pathfinding"
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
