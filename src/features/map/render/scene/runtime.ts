import type { Graphics } from "pixi.js"

import {
  NPC_SQUAD_IDLE_MAX_MS,
  NPC_SQUAD_IDLE_MIN_MS,
  NPC_SQUAD_PATHFIND_ATTEMPTS,
} from "@/features/map/constants"
import { advancePathMover, type PathMover } from "@/features/map/lib/movement"
import { tickNpcSquad, type NpcSquadRuntime } from "@/features/map/lib/npc-squads"
import type { NavigationGrid } from "@/features/map/lib/pathfinding"
import type { WorldConfig, WorldPoint } from "@/features/map/types"

type TickSceneParams = {
  deltaMs: number
  movementTimeScale: number
  player: PathMover
  playerMarker: Graphics
  drawPath: (points: WorldPoint[]) => void
  npcSquadRuntimes: NpcSquadRuntime[]
  navigationGrid: NavigationGrid
  world: WorldConfig
  updateNpcMarkerPosition: (squad: NpcSquadRuntime) => void
}

export function tickScene({
  deltaMs,
  movementTimeScale,
  player,
  playerMarker,
  drawPath,
  npcSquadRuntimes,
  navigationGrid,
  world,
  updateNpcMarkerPosition,
}: TickSceneParams) {
  const playerStep = advancePathMover(player, deltaMs, movementTimeScale)

  if (playerStep.moved) {
    playerMarker.position.set(player.x, player.y)
    drawPath([{ x: player.x, y: player.y }, ...player.path])
  }

  if (playerStep.arrived) {
    drawPath([])
  }

  for (const squad of npcSquadRuntimes) {
    const step = tickNpcSquad({
      squad,
      deltaMs,
      timeScale: movementTimeScale,
      navigationGrid,
      world,
      pathfindAttempts: NPC_SQUAD_PATHFIND_ATTEMPTS,
      idleMinMs: NPC_SQUAD_IDLE_MIN_MS,
      idleMaxMs: NPC_SQUAD_IDLE_MAX_MS,
    })

    if (step.moved) {
      updateNpcMarkerPosition(squad)
    }
  }
}
