import type { Graphics } from "pixi.js"

import {
  NPC_SQUAD_IDLE_MAX_MS,
  NPC_SQUAD_IDLE_MIN_MS,
  NPC_SQUAD_PATHFIND_ATTEMPTS,
} from "@/features/map/constants"
import { advancePathMover, type PathMover } from "@/features/map/lib/movement"
import { tickNpcSquad, type NpcSquadRuntime } from "@/features/map/lib/npc-squads"
import type { NavigationGrid } from "@/features/map/lib/pathfinding"
import { beginPathToWorld } from "@/features/map/render/scene/interaction"
import type { WorldConfig, WorldPoint } from "@/features/map/types"

export const FOLLOW_REPATH_COOLDOWN_MS = 500
export const FOLLOW_REPATH_DISTANCE_THRESHOLD = 24
export const FOLLOW_REPATH_STOP_DISTANCE = 12

export type FollowState = {
  targetSquadId: string | null
  lastPlannedTarget: WorldPoint | null
  repathCooldownMs: number
}

type TickSceneParams = {
  deltaMs: number
  movementTimeScale: number
  player: PathMover
  playerMarker: Graphics
  drawPath: (points: WorldPoint[]) => void
  npcSquadRuntimes: NpcSquadRuntime[]
  navigationGrid: NavigationGrid
  world: WorldConfig
  followState: FollowState
  updateNpcMarkerPosition: (squad: NpcSquadRuntime) => void
}

function tickFollowPath({
  deltaMs,
  movementTimeScale,
  player,
  drawPath,
  npcSquadRuntimes,
  navigationGrid,
  followState,
}: Pick<
  TickSceneParams,
  | "deltaMs"
  | "movementTimeScale"
  | "player"
  | "drawPath"
  | "npcSquadRuntimes"
  | "navigationGrid"
  | "followState"
>) {
  if (!followState.targetSquadId) {
    return
  }

  const followTarget = npcSquadRuntimes.find((squad) => squad.id === followState.targetSquadId)

  if (!followTarget) {
    return
  }

  const scaledDeltaMs = Math.max(0, deltaMs) * Math.max(0, movementTimeScale)
  followState.repathCooldownMs = Math.max(0, followState.repathCooldownMs - scaledDeltaMs)

  const targetPoint = { x: followTarget.mover.x, y: followTarget.mover.y }
  const distanceToTarget = Math.hypot(targetPoint.x - player.x, targetPoint.y - player.y)

  if (distanceToTarget <= FOLLOW_REPATH_STOP_DISTANCE) {
    return
  }

  const hasActivePath = player.moving && player.path.length > 0
  const targetMovedDistance = followState.lastPlannedTarget
    ? Math.hypot(
      targetPoint.x - followState.lastPlannedTarget.x,
      targetPoint.y - followState.lastPlannedTarget.y
    )
    : Number.POSITIVE_INFINITY
  const targetMovedEnough =
    !followState.lastPlannedTarget ||
    targetMovedDistance > FOLLOW_REPATH_DISTANCE_THRESHOLD
  const shouldRepath = !hasActivePath || targetMovedEnough

  if (!shouldRepath || followState.repathCooldownMs > 0) {
    return
  }

  const result = beginPathToWorld({
    navigationGrid,
    player,
    drawPath,
    target: targetPoint,
    clearOnFailure: false,
  })

  if (result === "success") {
    followState.lastPlannedTarget = targetPoint
  }

  followState.repathCooldownMs = FOLLOW_REPATH_COOLDOWN_MS
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
  followState,
  updateNpcMarkerPosition,
}: TickSceneParams) {
  const prevPlayerX = player.x
  const prevPlayerY = player.y
  const playerStep = advancePathMover(player, deltaMs, movementTimeScale)

  if (playerStep.moved) {
    const dx = player.x - prevPlayerX
    const dy = player.y - prevPlayerY
    const movedDistance = Math.hypot(dx, dy)

    if (movedDistance > 0.0001) {
      // Chevron base shape points upward, so apply a +90deg offset from +X axis.
      playerMarker.rotation = Math.atan2(dy, dx) + Math.PI / 2
    }

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

  tickFollowPath({
    deltaMs,
    movementTimeScale,
    player,
    drawPath,
    npcSquadRuntimes,
    navigationGrid,
    followState,
  })
}
