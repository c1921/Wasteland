import { generateCharacters } from "@/features/character/lib/generator"
import {
  NPC_SQUAD_COUNT_MAX,
  NPC_SQUAD_COUNT_MIN,
  NPC_SQUAD_IDLE_MAX_MS,
  NPC_SQUAD_IDLE_MIN_MS,
  NPC_SQUAD_MEMBER_MAX,
  NPC_SQUAD_MEMBER_MIN,
  NPC_SQUAD_PATHFIND_ATTEMPTS,
  NPC_SQUAD_SPAWN_ATTEMPTS,
  NPC_SQUAD_SPEED_MAX,
  NPC_SQUAD_SPEED_MIN,
} from "@/features/map/constants"
import { advancePathMover, type PathMover } from "@/features/map/lib/movement"
import {
  findPathAStar,
  isPointBlocked,
  type NavigationGrid,
} from "@/features/map/lib/pathfinding"
import { selectSpawnPoint } from "@/features/map/lib/spawn"
import type {
  MapNode,
  NpcSquadSnapshot,
  NpcSquadTemplate,
  WorldConfig,
  WorldPoint,
} from "@/features/map/types"

const SQUAD_NAME_PREFIXES = [
  "灰狼",
  "风痕",
  "锈钉",
  "碎铁",
  "余烬",
  "哨鸣",
] as const

const SQUAD_NAME_SUFFIXES = [
  "小队",
  "巡逻组",
  "驳火组",
  "斥候组",
  "行商队",
  "流亡团",
] as const

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomWorldPoint(world: WorldConfig): WorldPoint {
  return {
    x: Math.random() * world.width,
    y: Math.random() * world.height,
  }
}

function resolveRange(min: number, max: number) {
  const safeMin = Math.max(0, Math.floor(min))
  const safeMax = Math.max(safeMin, Math.floor(max))

  return {
    min: safeMin,
    max: safeMax,
  }
}

function resolveSquadName(index: number) {
  const prefix = SQUAD_NAME_PREFIXES[randomInt(0, SQUAD_NAME_PREFIXES.length - 1)]
  const suffix = SQUAD_NAME_SUFFIXES[randomInt(0, SQUAD_NAME_SUFFIXES.length - 1)]
  return `${prefix}${suffix}-${index + 1}`
}

function selectRandomWalkablePoint(
  navigationGrid: NavigationGrid,
  world: WorldConfig,
  attempts: number
) {
  const maxAttempts = Math.max(1, Math.floor(attempts))

  for (let i = 0; i < maxAttempts; i += 1) {
    const point = randomWorldPoint(world)

    if (!isPointBlocked(navigationGrid, point)) {
      return point
    }
  }

  return null
}

function resolveSpawnPointForSquad(
  navigationGrid: NavigationGrid,
  nodes: MapNode[],
  world: WorldConfig,
  spawnAttempts: number
) {
  return (
    selectRandomWalkablePoint(navigationGrid, world, spawnAttempts) ??
    selectSpawnPoint(navigationGrid, nodes, world)
  )
}

function resolveIdleDuration(idleMinMs: number, idleMaxMs: number) {
  const { min, max } = resolveRange(idleMinMs, idleMaxMs)
  return randomInt(min, max)
}

export type NpcSquadRuntime = {
  id: string
  name: string
  members: NpcSquadTemplate["members"]
  mover: PathMover
  target: WorldPoint | null
  idleRemainingMs: number
}

export type CreateNpcSquadTemplatesParams = {
  navigationGrid: NavigationGrid
  nodes: MapNode[]
  world: WorldConfig
  countMin?: number
  countMax?: number
  memberMin?: number
  memberMax?: number
  speedMin?: number
  speedMax?: number
  spawnAttempts?: number
}

export function createNpcSquadTemplates({
  navigationGrid,
  nodes,
  world,
  countMin = NPC_SQUAD_COUNT_MIN,
  countMax = NPC_SQUAD_COUNT_MAX,
  memberMin = NPC_SQUAD_MEMBER_MIN,
  memberMax = NPC_SQUAD_MEMBER_MAX,
  speedMin = NPC_SQUAD_SPEED_MIN,
  speedMax = NPC_SQUAD_SPEED_MAX,
  spawnAttempts = NPC_SQUAD_SPAWN_ATTEMPTS,
}: CreateNpcSquadTemplatesParams): NpcSquadTemplate[] {
  const countRange = resolveRange(countMin, countMax)
  const memberRange = resolveRange(memberMin, memberMax)
  const speedRange = resolveRange(speedMin, speedMax)
  const squadCount = randomInt(countRange.min, countRange.max)

  return Array.from({ length: squadCount }, (_, index) => {
    const memberCount = randomInt(memberRange.min, memberRange.max)
    const spawn = resolveSpawnPointForSquad(
      navigationGrid,
      nodes,
      world,
      spawnAttempts
    )

    return {
      id: `npc-squad-${index + 1}`,
      name: resolveSquadName(index),
      members: generateCharacters({ count: memberCount }),
      spawn,
      speed: randomInt(speedRange.min, speedRange.max),
    }
  })
}

export function createNpcSquadRuntimes(
  templates: NpcSquadTemplate[],
  idleMinMs = NPC_SQUAD_IDLE_MIN_MS,
  idleMaxMs = NPC_SQUAD_IDLE_MAX_MS
) {
  return templates.map((template) => ({
    id: template.id,
    name: template.name,
    members: template.members,
    target: null,
    idleRemainingMs: resolveIdleDuration(idleMinMs, idleMaxMs),
    mover: {
      x: template.spawn.x,
      y: template.spawn.y,
      speed: template.speed,
      moving: false,
      path: [],
    },
  }))
}

export function toNpcSquadSnapshot(squad: NpcSquadRuntime): NpcSquadSnapshot {
  return {
    id: squad.id,
    name: squad.name,
    members: squad.members,
    position: {
      x: squad.mover.x,
      y: squad.mover.y,
    },
    moving: squad.mover.moving,
  }
}

export function assignRandomPathToNpcSquad(
  squad: NpcSquadRuntime,
  navigationGrid: NavigationGrid,
  world: WorldConfig,
  maxAttempts = NPC_SQUAD_PATHFIND_ATTEMPTS
) {
  const attempts = Math.max(1, Math.floor(maxAttempts))
  const start = { x: squad.mover.x, y: squad.mover.y }

  for (let i = 0; i < attempts; i += 1) {
    const target = randomWorldPoint(world)

    if (isPointBlocked(navigationGrid, target)) {
      continue
    }

    const path = findPathAStar(navigationGrid, start, target)

    if (!path || path.length < 2) {
      continue
    }

    squad.target = target
    squad.mover.path = path.slice(1)
    squad.mover.moving = true
    return true
  }

  squad.target = null
  squad.mover.path = []
  squad.mover.moving = false
  return false
}

export type TickNpcSquadParams = {
  squad: NpcSquadRuntime
  deltaMs: number
  timeScale: number
  navigationGrid: NavigationGrid
  world: WorldConfig
  pathfindAttempts?: number
  idleMinMs?: number
  idleMaxMs?: number
}

export type TickNpcSquadResult = {
  moved: boolean
}

export function tickNpcSquad({
  squad,
  deltaMs,
  timeScale,
  navigationGrid,
  world,
  pathfindAttempts = NPC_SQUAD_PATHFIND_ATTEMPTS,
  idleMinMs = NPC_SQUAD_IDLE_MIN_MS,
  idleMaxMs = NPC_SQUAD_IDLE_MAX_MS,
}: TickNpcSquadParams): TickNpcSquadResult {
  const safeDeltaMs = Number.isFinite(deltaMs) ? Math.max(0, deltaMs) : 0
  const movementStep = advancePathMover(squad.mover, safeDeltaMs, timeScale)

  if (movementStep.arrived) {
    squad.target = null
    squad.idleRemainingMs = resolveIdleDuration(idleMinMs, idleMaxMs)
    return {
      moved: movementStep.moved,
    }
  }

  if (squad.mover.moving) {
    return {
      moved: movementStep.moved,
    }
  }

  if (squad.idleRemainingMs > 0) {
    squad.idleRemainingMs = Math.max(0, squad.idleRemainingMs - safeDeltaMs)
    return {
      moved: false,
    }
  }

  const assigned = assignRandomPathToNpcSquad(
    squad,
    navigationGrid,
    world,
    pathfindAttempts
  )

  if (!assigned) {
    squad.idleRemainingMs = resolveIdleDuration(idleMinMs, idleMaxMs)
  }

  return {
    moved: false,
  }
}
