import type { Graphics } from "pixi.js"
import { describe, expect, it, vi } from "vitest"

import type { PathMover } from "@/features/map/lib/movement"
import type { NpcSquadRuntime } from "@/features/map/lib/npc-squads"
import type { NavigationGrid } from "@/features/map/lib/pathfinding"
import {
  FOLLOW_REPATH_COOLDOWN_MS,
  tickScene,
  type FollowState,
} from "@/features/map/render/scene/runtime"
import type { WorldConfig } from "@/features/map/types"

const WORLD: WorldConfig = {
  width: 1000,
  height: 1000,
  minZoom: 0.5,
  maxZoom: 2,
  defaultZoom: 1,
  gridSize: 20,
}

const NAVIGATION_GRID: NavigationGrid = {
  width: WORLD.width,
  height: WORLD.height,
  gridSize: WORLD.gridSize,
  cols: WORLD.width / WORLD.gridSize,
  rows: WORLD.height / WORLD.gridSize,
  blocked: new Uint8Array((WORLD.width / WORLD.gridSize) * (WORLD.height / WORLD.gridSize)),
}

function createMarker(initialRotation = 0) {
  const position = {
    x: 0,
    y: 0,
    set(x: number, y: number) {
      position.x = x
      position.y = y
    },
  }

  return {
    position,
    rotation: initialRotation,
  } as unknown as Graphics
}

function createPlayer(path: PathMover["path"]): PathMover {
  return {
    x: 0,
    y: 0,
    speed: 100,
    moving: path.length > 0,
    path,
  }
}

function createFollowState(overrides?: Partial<FollowState>): FollowState {
  return {
    targetSquadId: null,
    lastPlannedTarget: null,
    repathCooldownMs: 0,
    ...overrides,
  }
}

function createSquadRuntime(
  id: string,
  position: { x: number; y: number }
): NpcSquadRuntime {
  return {
    id,
    name: id,
    members: [],
    mover: {
      x: position.x,
      y: position.y,
      speed: 120,
      moving: false,
      path: [],
    },
    target: null,
    idleRemainingMs: 0,
  }
}

describe("tickScene player rotation", () => {
  it("rotates chevron to the rightward movement direction", () => {
    const player = createPlayer([{ x: 100, y: 0 }])
    const playerMarker = createMarker()
    const drawPath = vi.fn()

    tickScene({
      deltaMs: 1000,
      movementTimeScale: 1,
      player,
      playerMarker,
      drawPath,
      npcSquadRuntimes: [],
      navigationGrid: NAVIGATION_GRID,
      world: WORLD,
      followState: createFollowState(),
      updateNpcMarkerPosition: vi.fn(),
    })

    expect(playerMarker.position.x).toBe(100)
    expect(playerMarker.position.y).toBe(0)
    expect(playerMarker.rotation).toBeCloseTo(Math.PI / 2)
    expect(drawPath).toHaveBeenLastCalledWith([])
  })

  it("rotates chevron to the downward movement direction", () => {
    const player = createPlayer([{ x: 0, y: 100 }])
    const playerMarker = createMarker()

    tickScene({
      deltaMs: 1000,
      movementTimeScale: 1,
      player,
      playerMarker,
      drawPath: vi.fn(),
      npcSquadRuntimes: [],
      navigationGrid: NAVIGATION_GRID,
      world: WORLD,
      followState: createFollowState(),
      updateNpcMarkerPosition: vi.fn(),
    })

    expect(playerMarker.rotation).toBeCloseTo(Math.PI)
  })

  it("keeps the last heading after movement stops", () => {
    const player = createPlayer([{ x: 100, y: 0 }])
    const playerMarker = createMarker()

    tickScene({
      deltaMs: 1000,
      movementTimeScale: 1,
      player,
      playerMarker,
      drawPath: vi.fn(),
      npcSquadRuntimes: [],
      navigationGrid: NAVIGATION_GRID,
      world: WORLD,
      followState: createFollowState(),
      updateNpcMarkerPosition: vi.fn(),
    })
    const lastRotation = playerMarker.rotation

    tickScene({
      deltaMs: 1000,
      movementTimeScale: 1,
      player,
      playerMarker,
      drawPath: vi.fn(),
      npcSquadRuntimes: [],
      navigationGrid: NAVIGATION_GRID,
      world: WORLD,
      followState: createFollowState(),
      updateNpcMarkerPosition: vi.fn(),
    })

    expect(playerMarker.rotation).toBe(lastRotation)
  })

  it("does not update heading when player does not move", () => {
    const player = createPlayer([{ x: 100, y: 0 }])
    const playerMarker = createMarker(1.2345)

    tickScene({
      deltaMs: 1000,
      movementTimeScale: 0,
      player,
      playerMarker,
      drawPath: vi.fn(),
      npcSquadRuntimes: [],
      navigationGrid: NAVIGATION_GRID,
      world: WORLD,
      followState: createFollowState(),
      updateNpcMarkerPosition: vi.fn(),
    })

    expect(playerMarker.rotation).toBe(1.2345)
    expect(playerMarker.position.x).toBe(0)
    expect(playerMarker.position.y).toBe(0)
  })
})

describe("tickScene squad follow replanning", () => {
  it("plans follow route immediately when there is no active player path", () => {
    const player = createPlayer([])
    const followState = createFollowState({
      targetSquadId: "squad-1",
    })

    tickScene({
      deltaMs: 100,
      movementTimeScale: 1,
      player,
      playerMarker: createMarker(),
      drawPath: vi.fn(),
      npcSquadRuntimes: [createSquadRuntime("squad-1", { x: 200, y: 0 })],
      navigationGrid: NAVIGATION_GRID,
      world: WORLD,
      followState,
      updateNpcMarkerPosition: vi.fn(),
    })

    expect(player.moving).toBe(true)
    expect(player.path.length).toBeGreaterThan(0)
    expect(followState.lastPlannedTarget).toEqual({ x: 200, y: 0 })
    expect(followState.repathCooldownMs).toBe(FOLLOW_REPATH_COOLDOWN_MS)
  })

  it("does not replan before follow cooldown reaches zero", () => {
    const player = createPlayer([])
    const followState = createFollowState({
      targetSquadId: "squad-1",
      repathCooldownMs: 450,
    })

    tickScene({
      deltaMs: 100,
      movementTimeScale: 1,
      player,
      playerMarker: createMarker(),
      drawPath: vi.fn(),
      npcSquadRuntimes: [createSquadRuntime("squad-1", { x: 260, y: 0 })],
      navigationGrid: NAVIGATION_GRID,
      world: WORLD,
      followState,
      updateNpcMarkerPosition: vi.fn(),
    })

    expect(player.moving).toBe(false)
    expect(player.path).toEqual([])
    expect(followState.repathCooldownMs).toBe(350)
  })

  it("replans when target moves beyond threshold after cooldown", () => {
    const player = createPlayer([])
    const followState = createFollowState({
      targetSquadId: "squad-1",
      lastPlannedTarget: { x: 180, y: 0 },
      repathCooldownMs: 0,
    })

    tickScene({
      deltaMs: 100,
      movementTimeScale: 1,
      player,
      playerMarker: createMarker(),
      drawPath: vi.fn(),
      npcSquadRuntimes: [createSquadRuntime("squad-1", { x: 220, y: 0 })],
      navigationGrid: NAVIGATION_GRID,
      world: WORLD,
      followState,
      updateNpcMarkerPosition: vi.fn(),
    })

    expect(player.moving).toBe(true)
    expect(followState.lastPlannedTarget).toEqual({ x: 220, y: 0 })
    expect(followState.repathCooldownMs).toBe(FOLLOW_REPATH_COOLDOWN_MS)
  })
})
