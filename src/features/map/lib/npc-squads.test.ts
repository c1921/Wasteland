import { describe, expect, it } from "vitest"

import {
  createNpcSquadTemplates,
  tickNpcSquad,
  type NpcSquadRuntime,
} from "@/features/map/lib/npc-squads"
import { buildNavigationGrid, isPointBlocked } from "@/features/map/lib/pathfinding"
import type { MapNode, MapObstacle, WorldConfig } from "@/features/map/types"

const world: WorldConfig = {
  width: 200,
  height: 200,
  minZoom: 0.5,
  maxZoom: 2,
  defaultZoom: 1,
  gridSize: 20,
}

const nodes: MapNode[] = [
  {
    id: "hub",
    name: "灰烬中枢",
    x: 30,
    y: 30,
    kind: "settlement",
  },
]

describe("createNpcSquadTemplates", () => {
  it("creates squads within configured count/member ranges", () => {
    const navigationGrid = buildNavigationGrid(world, [])
    const squads = createNpcSquadTemplates({
      navigationGrid,
      nodes,
      world,
      countMin: 3,
      countMax: 3,
      memberMin: 2,
      memberMax: 5,
      speedMin: 100,
      speedMax: 100,
    })

    expect(squads).toHaveLength(3)

    for (const squad of squads) {
      expect(squad.members.length).toBeGreaterThanOrEqual(2)
      expect(squad.members.length).toBeLessThanOrEqual(5)
      expect(squad.speed).toBe(100)
      expect(isPointBlocked(navigationGrid, squad.spawn)).toBe(false)
    }
  })
})

describe("tickNpcSquad", () => {
  it("assigns a random path after idle is finished", () => {
    const navigationGrid = buildNavigationGrid(world, [])
    const squad: NpcSquadRuntime = {
      id: "squad-1",
      name: "灰狼小队",
      members: [],
      target: null,
      idleRemainingMs: 0,
      mover: {
        x: 20,
        y: 20,
        speed: 120,
        moving: false,
        path: [],
      },
    }

    const result = tickNpcSquad({
      squad,
      deltaMs: 16,
      timeScale: 1,
      navigationGrid,
      world,
      pathfindAttempts: 3,
      idleMinMs: 500,
      idleMaxMs: 500,
    })

    expect(result.moved).toBe(false)
    expect(squad.mover.moving).toBe(true)
    expect(squad.mover.path.length).toBeGreaterThan(0)
  })

  it("enters idle when path assignment fails", () => {
    const blockedObstacles: MapObstacle[] = [
      {
        id: "all",
        name: "全阻挡",
        polygon: [
          { x: 0, y: 0 },
          { x: world.width, y: 0 },
          { x: world.width, y: world.height },
          { x: 0, y: world.height },
        ],
      },
    ]
    const blockedGrid = buildNavigationGrid(world, blockedObstacles)
    const squad: NpcSquadRuntime = {
      id: "squad-2",
      name: "风痕巡逻组",
      members: [],
      target: null,
      idleRemainingMs: 0,
      mover: {
        x: 20,
        y: 20,
        speed: 120,
        moving: false,
        path: [],
      },
    }

    tickNpcSquad({
      squad,
      deltaMs: 16,
      timeScale: 1,
      navigationGrid: blockedGrid,
      world,
      pathfindAttempts: 3,
      idleMinMs: 800,
      idleMaxMs: 800,
    })

    expect(squad.mover.moving).toBe(false)
    expect(squad.mover.path).toHaveLength(0)
    expect(squad.idleRemainingMs).toBe(800)
  })

  it("starts idle after arriving at destination", () => {
    const navigationGrid = buildNavigationGrid(world, [])
    const squad: NpcSquadRuntime = {
      id: "squad-3",
      name: "锈钉流亡团",
      members: [],
      target: { x: 40, y: 20 },
      idleRemainingMs: 0,
      mover: {
        x: 20,
        y: 20,
        speed: 50,
        moving: true,
        path: [{ x: 40, y: 20 }],
      },
    }

    const result = tickNpcSquad({
      squad,
      deltaMs: 1000,
      timeScale: 1,
      navigationGrid,
      world,
      idleMinMs: 1200,
      idleMaxMs: 1200,
    })

    expect(result.moved).toBe(true)
    expect(squad.mover.moving).toBe(false)
    expect(squad.target).toBeNull()
    expect(squad.idleRemainingMs).toBe(1200)
  })
})
