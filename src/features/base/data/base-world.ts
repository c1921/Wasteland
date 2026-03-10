import type {
  BaseLayoutState,
  BaseWorldConfig,
  BuildingDefinition,
  PlacedBuilding,
  TerrainKind,
} from "@/features/base/types"

export const WASTELAND_BASE_WORLD_CONFIG: BaseWorldConfig = {
  cols: 48,
  rows: 48,
  cellSize: 40,
  subgridDivisions: 3,
  width: 48 * 40,
  height: 48 * 40,
  minZoom: 0.4,
  maxZoom: 2.6,
  defaultZoom: 0.9,
}

function createTerrainSeed() {
  const terrain = Array.from(
    { length: WASTELAND_BASE_WORLD_CONFIG.cols * WASTELAND_BASE_WORLD_CONFIG.rows },
    (): TerrainKind => "grass"
  )

  const setTerrain = (col: number, row: number, value: TerrainKind) => {
    if (
      col < 0 ||
      col >= WASTELAND_BASE_WORLD_CONFIG.cols ||
      row < 0 ||
      row >= WASTELAND_BASE_WORLD_CONFIG.rows
    ) {
      return
    }

    terrain[row * WASTELAND_BASE_WORLD_CONFIG.cols + col] = value
  }

  const fillRect = (
    left: number,
    top: number,
    width: number,
    height: number,
    value: TerrainKind
  ) => {
    for (let row = top; row < top + height; row += 1) {
      for (let col = left; col < left + width; col += 1) {
        setTerrain(col, row, value)
      }
    }
  }

  const fillEllipse = (
    centerCol: number,
    centerRow: number,
    radiusCol: number,
    radiusRow: number,
    value: TerrainKind
  ) => {
    for (let row = centerRow - radiusRow; row <= centerRow + radiusRow; row += 1) {
      for (let col = centerCol - radiusCol; col <= centerCol + radiusCol; col += 1) {
        const normalizedCol = (col - centerCol) / Math.max(1, radiusCol)
        const normalizedRow = (row - centerRow) / Math.max(1, radiusRow)

        if (normalizedCol ** 2 + normalizedRow ** 2 <= 1) {
          setTerrain(col, row, value)
        }
      }
    }
  }

  fillRect(0, 0, 48, 4, "sand")
  fillRect(0, 44, 48, 4, "sand")
  fillRect(0, 0, 5, 48, "sand")
  fillRect(43, 0, 5, 48, "sand")

  fillEllipse(9, 11, 5, 4, "deep-water")
  fillEllipse(35, 10, 6, 3, "deep-water")
  fillEllipse(31, 34, 4, 5, "deep-water")

  fillRect(20, 0, 3, 14, "mountain")
  fillRect(22, 10, 5, 4, "mountain")
  fillRect(13, 28, 18, 3, "mountain")
  fillRect(6, 36, 8, 5, "mountain")
  fillRect(34, 20, 9, 4, "mountain")

  fillEllipse(16, 9, 8, 4, "sand")
  fillEllipse(29, 20, 6, 5, "sand")
  fillEllipse(15, 22, 5, 4, "sand")
  fillEllipse(24, 40, 10, 3, "sand")

  return terrain
}

export const WASTELAND_BASE_TERRAIN = createTerrainSeed()

export const BASE_BUILDING_DEFINITIONS: BuildingDefinition[] = [
  {
    id: "wall",
    label: "墙体",
    category: "structure",
    footprint: { kind: "subcell-area", widthSubcells: 3, heightSubcells: 1, dragPlacement: "line" },
    terrain: { allowed: ["grass", "sand"] },
    rotationEnabled: true,
  },
  {
    id: "door",
    label: "门",
    category: "structure",
    footprint: { kind: "subcell-area", widthSubcells: 3, heightSubcells: 1, dragPlacement: "line" },
    terrain: { allowed: ["grass", "sand"] },
    rotationEnabled: true,
  },
  {
    id: "window",
    label: "窗",
    category: "structure",
    footprint: { kind: "subcell-area", widthSubcells: 3, heightSubcells: 1, dragPlacement: "line" },
    terrain: { allowed: ["grass", "sand"] },
    rotationEnabled: true,
  },
  {
    id: "bed",
    label: "床",
    category: "furniture",
    footprint: { kind: "cell-area", widthCells: 2, heightCells: 1 },
    terrain: { allowed: ["grass", "sand"] },
    rotationEnabled: true,
  },
  {
    id: "table",
    label: "桌",
    category: "furniture",
    footprint: { kind: "cell-area", widthCells: 1, heightCells: 1 },
    terrain: { allowed: ["grass", "sand"] },
    rotationEnabled: false,
  },
  {
    id: "crate",
    label: "储物箱",
    category: "furniture",
    footprint: { kind: "subcell-area", widthSubcells: 1, heightSubcells: 1, dragPlacement: "brush" },
    terrain: { allowed: ["grass", "sand"] },
    rotationEnabled: false,
  },
  {
    id: "workbench",
    label: "工作台",
    category: "equipment",
    footprint: { kind: "cell-area", widthCells: 2, heightCells: 1 },
    terrain: { allowed: ["grass", "sand"] },
    rotationEnabled: true,
  },
  {
    id: "console",
    label: "控制台",
    category: "equipment",
    footprint: { kind: "cell-area", widthCells: 1, heightCells: 1 },
    terrain: { allowed: ["grass", "sand"] },
    rotationEnabled: true,
  },
]

export const BASE_BUILDING_DEFINITION_MAP = new Map(
  BASE_BUILDING_DEFINITIONS.map((definition) => [definition.id, definition])
)

function createPlacedBuildings() {
  const buildings: PlacedBuilding[] = []

  const addArea = (
    definitionId: string,
    rotation: 0 | 90 | 180 | 270,
    subcol: number,
    subrow: number,
    widthSubcells: number,
    heightSubcells: number
  ) => {
    buildings.push({
      id: `seed-${definitionId}-${subcol}-${subrow}`,
      definitionId,
      rotation,
      footprint: {
        kind: "area",
        origin: { subcol, subrow },
        widthSubcells,
        heightSubcells,
      },
    })
  }

  for (let col = 18; col < 24; col += 1) {
    addArea("wall", 0, col * 3, 18 * 3, 3, 1)
    addArea(col === 20 ? "door" : "wall", 0, col * 3, 22 * 3 - 1, 3, 1)
  }

  for (let row = 18; row < 22; row += 1) {
    addArea("wall", 90, 18 * 3, row * 3, 1, 3)
    addArea(row === 19 ? "window" : "wall", 90, 24 * 3 - 1, row * 3, 1, 3)
  }

  addArea("bed", 0, 19 * 3, 19 * 3, 6, 3)
  addArea("table", 0, 21 * 3, 20 * 3, 3, 3)
  addArea("console", 0, 22 * 3, 19 * 3, 3, 3)
  addArea("workbench", 0, 14 * 3, 19 * 3, 6, 3)
  addArea("crate", 0, 20 * 3 + 2, 21 * 3 + 1, 1, 1)
  addArea("crate", 0, 20 * 3 + 1, 21 * 3 + 2, 1, 1)

  return buildings
}

export const WASTELAND_BASE_INITIAL_LAYOUT: BaseLayoutState = {
  buildings: createPlacedBuildings(),
}
