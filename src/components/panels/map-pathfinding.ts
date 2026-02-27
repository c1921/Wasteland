import type {
  MapObstacle,
  WorldConfig,
  WorldPoint,
} from "@/components/panels/map-data"

type GridCell = {
  col: number
  row: number
}

type ObstacleBounds = {
  minX: number
  maxX: number
  minY: number
  maxY: number
  polygon: WorldPoint[]
}

export type NavigationGrid = {
  width: number
  height: number
  gridSize: number
  cols: number
  rows: number
  blocked: Uint8Array
}

const SQRT2 = Math.SQRT2

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function toCellIndex(col: number, row: number, cols: number) {
  return row * cols + col
}

function inBounds(col: number, row: number, cols: number, rows: number) {
  return col >= 0 && col < cols && row >= 0 && row < rows
}

function pointInPolygon(point: WorldPoint, polygon: WorldPoint[]) {
  let inside = false

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[i]
    const b = polygon[j]
    const intersects =
      a.y > point.y !== b.y > point.y &&
      point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x

    if (intersects) {
      inside = !inside
    }
  }

  return inside
}

function toObstacleBounds(obstacle: MapObstacle): ObstacleBounds {
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  for (const point of obstacle.polygon) {
    minX = Math.min(minX, point.x)
    minY = Math.min(minY, point.y)
    maxX = Math.max(maxX, point.x)
    maxY = Math.max(maxY, point.y)
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    polygon: obstacle.polygon,
  }
}

function pointInObstacle(point: WorldPoint, obstacle: ObstacleBounds) {
  if (
    point.x < obstacle.minX ||
    point.x > obstacle.maxX ||
    point.y < obstacle.minY ||
    point.y > obstacle.maxY
  ) {
    return false
  }

  return pointInPolygon(point, obstacle.polygon)
}

function cellCenter(
  col: number,
  row: number,
  gridSize: number,
  width: number,
  height: number
): WorldPoint {
  const x = clamp((col + 0.5) * gridSize, 0, width)
  const y = clamp((row + 0.5) * gridSize, 0, height)

  return { x, y }
}

function worldToCell(point: WorldPoint, grid: NavigationGrid): GridCell {
  const clampedX = clamp(point.x, 0, grid.width - 1)
  const clampedY = clamp(point.y, 0, grid.height - 1)

  return {
    col: clamp(Math.floor(clampedX / grid.gridSize), 0, grid.cols - 1),
    row: clamp(Math.floor(clampedY / grid.gridSize), 0, grid.rows - 1),
  }
}

function heuristic(a: GridCell, b: GridCell) {
  return Math.hypot(a.col - b.col, a.row - b.row)
}

function hasLineOfSight(grid: NavigationGrid, start: WorldPoint, end: WorldPoint) {
  const distance = Math.hypot(end.x - start.x, end.y - start.y)
  const stepLength = Math.max(8, grid.gridSize * 0.35)
  const steps = Math.max(2, Math.ceil(distance / stepLength))

  for (let index = 0; index <= steps; index += 1) {
    const t = index / steps
    const point = {
      x: start.x + (end.x - start.x) * t,
      y: start.y + (end.y - start.y) * t,
    }

    if (isPointBlocked(grid, point)) {
      return false
    }
  }

  return true
}

function smoothPath(grid: NavigationGrid, path: WorldPoint[]) {
  if (path.length <= 2) {
    return path
  }

  const smoothed: WorldPoint[] = [path[0]]
  let anchor = 0

  while (anchor < path.length - 1) {
    let targetIndex = path.length - 1

    for (; targetIndex > anchor + 1; targetIndex -= 1) {
      if (hasLineOfSight(grid, path[anchor], path[targetIndex])) {
        break
      }
    }

    smoothed.push(path[targetIndex])
    anchor = targetIndex
  }

  return smoothed
}

export function buildNavigationGrid(
  world: WorldConfig,
  obstacles: MapObstacle[]
): NavigationGrid {
  const cols = Math.ceil(world.width / world.gridSize)
  const rows = Math.ceil(world.height / world.gridSize)
  const blocked = new Uint8Array(cols * rows)
  const obstacleBounds = obstacles.map(toObstacleBounds)

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const point = cellCenter(col, row, world.gridSize, world.width, world.height)
      const index = toCellIndex(col, row, cols)

      if (obstacleBounds.some((obstacle) => pointInObstacle(point, obstacle))) {
        blocked[index] = 1
      }
    }
  }

  return {
    width: world.width,
    height: world.height,
    gridSize: world.gridSize,
    cols,
    rows,
    blocked,
  }
}

export function isPointBlocked(grid: NavigationGrid, point: WorldPoint) {
  if (point.x < 0 || point.x >= grid.width || point.y < 0 || point.y >= grid.height) {
    return true
  }

  const { col, row } = worldToCell(point, grid)
  const index = toCellIndex(col, row, grid.cols)

  return grid.blocked[index] === 1
}

export function findPathAStar(
  grid: NavigationGrid,
  startPoint: WorldPoint,
  goalPoint: WorldPoint
) {
  if (isPointBlocked(grid, startPoint) || isPointBlocked(grid, goalPoint)) {
    return null
  }

  const start = worldToCell(startPoint, grid)
  const goal = worldToCell(goalPoint, grid)
  const startIndex = toCellIndex(start.col, start.row, grid.cols)
  const goalIndex = toCellIndex(goal.col, goal.row, grid.cols)

  if (startIndex === goalIndex) {
    return [startPoint, goalPoint]
  }

  const cellCount = grid.cols * grid.rows
  const gScore = new Float64Array(cellCount)
  const fScore = new Float64Array(cellCount)
  const closed = new Uint8Array(cellCount)
  const inOpenSet = new Uint8Array(cellCount)
  const cameFrom = new Int32Array(cellCount)

  gScore.fill(Number.POSITIVE_INFINITY)
  fScore.fill(Number.POSITIVE_INFINITY)
  cameFrom.fill(-1)

  const openSet: number[] = [startIndex]
  inOpenSet[startIndex] = 1
  gScore[startIndex] = 0
  fScore[startIndex] = heuristic(start, goal)

  const directions = [
    { dc: -1, dr: -1, cost: SQRT2 },
    { dc: 0, dr: -1, cost: 1 },
    { dc: 1, dr: -1, cost: SQRT2 },
    { dc: -1, dr: 0, cost: 1 },
    { dc: 1, dr: 0, cost: 1 },
    { dc: -1, dr: 1, cost: SQRT2 },
    { dc: 0, dr: 1, cost: 1 },
    { dc: 1, dr: 1, cost: SQRT2 },
  ] as const

  while (openSet.length > 0) {
    let bestOpenIndex = 0

    for (let i = 1; i < openSet.length; i += 1) {
      if (fScore[openSet[i]] < fScore[openSet[bestOpenIndex]]) {
        bestOpenIndex = i
      }
    }

    const currentIndex = openSet[bestOpenIndex]
    const currentCol = currentIndex % grid.cols
    const currentRow = Math.floor(currentIndex / grid.cols)

    if (currentIndex === goalIndex) {
      const cellPath: GridCell[] = []
      let cursor = currentIndex

      while (cursor !== -1) {
        cellPath.push({
          col: cursor % grid.cols,
          row: Math.floor(cursor / grid.cols),
        })
        cursor = cameFrom[cursor]
      }

      cellPath.reverse()

      const worldPath = cellPath.map((cell) =>
        cellCenter(cell.col, cell.row, grid.gridSize, grid.width, grid.height)
      )

      worldPath[0] = {
        x: clamp(startPoint.x, 0, grid.width),
        y: clamp(startPoint.y, 0, grid.height),
      }
      worldPath[worldPath.length - 1] = {
        x: clamp(goalPoint.x, 0, grid.width),
        y: clamp(goalPoint.y, 0, grid.height),
      }

      return smoothPath(grid, worldPath)
    }

    openSet.splice(bestOpenIndex, 1)
    inOpenSet[currentIndex] = 0
    closed[currentIndex] = 1

    for (const direction of directions) {
      const nextCol = currentCol + direction.dc
      const nextRow = currentRow + direction.dr

      if (!inBounds(nextCol, nextRow, grid.cols, grid.rows)) {
        continue
      }

      const nextIndex = toCellIndex(nextCol, nextRow, grid.cols)

      if (grid.blocked[nextIndex] === 1 || closed[nextIndex] === 1) {
        continue
      }

      if (direction.dc !== 0 && direction.dr !== 0) {
        const horizontalIndex = toCellIndex(currentCol + direction.dc, currentRow, grid.cols)
        const verticalIndex = toCellIndex(currentCol, currentRow + direction.dr, grid.cols)

        if (grid.blocked[horizontalIndex] === 1 || grid.blocked[verticalIndex] === 1) {
          continue
        }
      }

      const tentativeG = gScore[currentIndex] + direction.cost

      if (tentativeG >= gScore[nextIndex]) {
        continue
      }

      cameFrom[nextIndex] = currentIndex
      gScore[nextIndex] = tentativeG
      fScore[nextIndex] =
        tentativeG +
        heuristic(
          { col: nextCol, row: nextRow },
          { col: goal.col, row: goal.row }
        )

      if (inOpenSet[nextIndex] === 0) {
        openSet.push(nextIndex)
        inOpenSet[nextIndex] = 1
      }
    }
  }

  return null
}
