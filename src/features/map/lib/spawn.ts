import { clamp } from "@/features/map/lib/math"
import { isPointBlocked, type NavigationGrid } from "@/features/map/lib/pathfinding"
import type { MapNode, WorldConfig, WorldPoint } from "@/features/map/types"

function findFallbackSpawn(grid: NavigationGrid, world: WorldConfig): WorldPoint {
  for (let row = 0; row < grid.rows; row += 1) {
    for (let col = 0; col < grid.cols; col += 1) {
      const index = row * grid.cols + col

      if (grid.blocked[index] === 0) {
        return {
          x: clamp((col + 0.5) * grid.gridSize, 0, world.width - 0.001),
          y: clamp((row + 0.5) * grid.gridSize, 0, world.height - 0.001),
        }
      }
    }
  }

  return {
    x: world.width * 0.5,
    y: world.height * 0.5,
  }
}

export function selectSpawnPoint(
  navigationGrid: NavigationGrid,
  nodes: MapNode[],
  world: WorldConfig
): WorldPoint {
  const candidates: MapNode[] = []
  const mainSettlement = nodes.find((node) => node.kind === "settlement")

  if (mainSettlement) {
    candidates.push(mainSettlement)
  }

  candidates.push(...nodes)

  let spawn = findFallbackSpawn(navigationGrid, world)

  for (const node of candidates) {
    const candidate = { x: node.x, y: node.y }

    if (!isPointBlocked(navigationGrid, candidate)) {
      spawn = candidate
      break
    }
  }

  return spawn
}
