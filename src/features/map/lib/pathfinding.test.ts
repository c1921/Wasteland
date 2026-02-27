import { describe, expect, it } from "vitest"

import {
  buildNavigationGrid,
  findPathAStar,
  isPointBlocked,
} from "@/features/map/lib/pathfinding"
import type { MapObstacle, WorldConfig } from "@/features/map/types"

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

describe("map pathfinding", () => {
  it("marks blocked cells from obstacle polygons", () => {
    const world: WorldConfig = {
      width: 100,
      height: 100,
      minZoom: 0.5,
      maxZoom: 2,
      defaultZoom: 1,
      gridSize: 20,
    }
    const grid = buildNavigationGrid(world, [rectangleObstacle("center", 20, 20, 60, 60)])

    expect(grid.cols).toBe(5)
    expect(grid.rows).toBe(5)
    expect(isPointBlocked(grid, { x: 40, y: 40 })).toBe(true)
    expect(isPointBlocked(grid, { x: 10, y: 10 })).toBe(false)
  })

  it("treats out-of-bounds points as blocked", () => {
    const world: WorldConfig = {
      width: 100,
      height: 100,
      minZoom: 0.5,
      maxZoom: 2,
      defaultZoom: 1,
      gridSize: 20,
    }
    const grid = buildNavigationGrid(world, [])

    expect(isPointBlocked(grid, { x: -1, y: 10 })).toBe(true)
    expect(isPointBlocked(grid, { x: 10, y: -1 })).toBe(true)
    expect(isPointBlocked(grid, { x: 100, y: 10 })).toBe(true)
    expect(isPointBlocked(grid, { x: 10, y: 100 })).toBe(true)
    expect(isPointBlocked(grid, { x: 99.99, y: 99.99 })).toBe(false)
  })

  it("returns a path for reachable targets and preserves endpoints", () => {
    const world: WorldConfig = {
      width: 120,
      height: 120,
      minZoom: 0.5,
      maxZoom: 2,
      defaultZoom: 1,
      gridSize: 20,
    }
    const grid = buildNavigationGrid(world, [])
    const start = { x: 10, y: 10 }
    const goal = { x: 110, y: 110 }
    const path = findPathAStar(grid, start, goal)

    expect(path).not.toBeNull()
    expect(path?.length).toBeGreaterThanOrEqual(2)
    expect(path?.[0]).toEqual(start)
    expect(path?.[path.length - 1]).toEqual(goal)
  })

  it("prevents diagonal corner cutting when both side cells are blocked", () => {
    const world: WorldConfig = {
      width: 60,
      height: 60,
      minZoom: 0.5,
      maxZoom: 2,
      defaultZoom: 1,
      gridSize: 20,
    }
    const obstacles: MapObstacle[] = [
      rectangleObstacle("east", 20, 0, 40, 20),
      rectangleObstacle("south", 0, 20, 20, 40),
    ]
    const grid = buildNavigationGrid(world, obstacles)
    const path = findPathAStar(grid, { x: 10, y: 10 }, { x: 30, y: 30 })

    expect(path).toBeNull()
  })
})
