import { describe, expect, it } from "vitest"

import { buildNavigationGrid } from "@/features/map/lib/pathfinding"
import { selectSpawnPoint } from "@/features/map/lib/spawn"
import type { MapNode, MapObstacle, WorldConfig } from "@/features/map/types"

function rectangleObstacle(
  id: string,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number
): MapObstacle {
  return {
    id,
    name: id,
    polygon: [
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      { x: minX, y: maxY },
    ],
  }
}

const baseWorld: WorldConfig = {
  width: 100,
  height: 100,
  minZoom: 0.5,
  maxZoom: 2,
  defaultZoom: 1,
  gridSize: 20,
}

describe("selectSpawnPoint", () => {
  it("prefers settlement node when passable", () => {
    const nodes: MapNode[] = [
      { id: "outpost", name: "outpost", x: 70, y: 70, kind: "outpost" },
      { id: "settlement", name: "settlement", x: 30, y: 30, kind: "settlement" },
    ]
    const grid = buildNavigationGrid(baseWorld, [])

    const spawn = selectSpawnPoint(grid, nodes, baseWorld)

    expect(spawn).toEqual({ x: 30, y: 30 })
  })

  it("falls back to next node when preferred settlement is blocked", () => {
    const nodes: MapNode[] = [
      { id: "settlement", name: "settlement", x: 30, y: 30, kind: "settlement" },
      { id: "outpost", name: "outpost", x: 70, y: 70, kind: "outpost" },
    ]
    const obstacles: MapObstacle[] = [rectangleObstacle("block-settlement", 20, 20, 40, 40)]
    const grid = buildNavigationGrid(baseWorld, obstacles)

    const spawn = selectSpawnPoint(grid, nodes, baseWorld)

    expect(spawn).toEqual({ x: 70, y: 70 })
  })

  it("uses world center when every cell is blocked", () => {
    const nodes: MapNode[] = [
      { id: "settlement", name: "settlement", x: 30, y: 30, kind: "settlement" },
    ]
    const obstacles: MapObstacle[] = [rectangleObstacle("all", 0, 0, 100, 100)]
    const grid = buildNavigationGrid(baseWorld, obstacles)

    const spawn = selectSpawnPoint(grid, nodes, baseWorld)

    expect(spawn).toEqual({ x: 50, y: 50 })
  })
})
