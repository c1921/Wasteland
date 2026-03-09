import { Graphics } from "pixi.js"

import { BASE_BUILDING_DEFINITION_MAP } from "@/features/base/data/base-world"
import type {
  BaseLayoutState,
  BaseSelection,
  BaseWorldConfig,
  PlacementPreview,
  TerrainKind,
} from "@/features/base/types"

type BasePalette = {
  background: number
  grid: number
  subgrid: number
  grass: number
  sand: number
  mountain: number
  deepWater: number
  wall: number
  door: number
  window: number
  furniture: number
  equipment: number
  selection: number
  previewValid: number
  previewInvalid: number
}

const PALETTE: BasePalette = {
  background: 0x10141a,
  grid: 0x334250,
  subgrid: 0x25303a,
  grass: 0x273626,
  sand: 0x524b34,
  mountain: 0x4b4546,
  deepWater: 0x173547,
  wall: 0xc7b38b,
  door: 0xd18b59,
  window: 0x82bed2,
  furniture: 0xa3b37a,
  equipment: 0x9d8ec7,
  selection: 0x9de8f9,
  previewValid: 0x8ee1d2,
  previewInvalid: 0xff8a74,
}

function resolveTerrainColor(terrainKind: TerrainKind) {
  switch (terrainKind) {
    case "grass":
      return PALETTE.grass
    case "sand":
      return PALETTE.sand
    case "mountain":
      return PALETTE.mountain
    case "deep-water":
      return PALETTE.deepWater
    default:
      return PALETTE.background
  }
}

function resolveBuildingColor(definitionId: string) {
  switch (definitionId) {
    case "wall":
      return PALETTE.wall
    case "door":
      return PALETTE.door
    case "window":
      return PALETTE.window
    default: {
      const definition = BASE_BUILDING_DEFINITION_MAP.get(definitionId)

      if (definition?.category === "equipment") {
        return PALETTE.equipment
      }

      return PALETTE.furniture
    }
  }
}

function drawEdgeSegment(
  layer: Graphics,
  world: BaseWorldConfig,
  edge: { axis: "horizontal" | "vertical"; col: number; row: number },
  color: number,
  width: number,
  alpha = 1
) {
  const startX = edge.col * world.cellSize
  const startY = edge.row * world.cellSize

  if (edge.axis === "horizontal") {
    layer
      .moveTo(startX, startY)
      .lineTo(startX + world.cellSize, startY)
      .stroke({ color, width, alpha, cap: "round" })
    return
  }

  layer
    .moveTo(startX, startY)
    .lineTo(startX, startY + world.cellSize)
    .stroke({ color, width, alpha, cap: "round" })
}

function drawAreaRect(params: {
  layer: Graphics
  world: BaseWorldConfig
  origin: { subcol: number; subrow: number }
  widthSubcells: number
  heightSubcells: number
  color: number
  alpha: number
  strokeWidth?: number
}) {
  const {
    layer,
    world,
    origin,
    widthSubcells,
    heightSubcells,
    color,
    alpha,
    strokeWidth = 1.2,
  } = params
  const subcellSize = world.cellSize / world.subgridDivisions
  const x = origin.subcol * subcellSize
  const y = origin.subrow * subcellSize
  const width = widthSubcells * subcellSize
  const height = heightSubcells * subcellSize

  layer
    .roundRect(x, y, width, height, Math.max(3, subcellSize * 0.22))
    .fill({ color, alpha })
    .stroke({ color, alpha: Math.min(1, alpha + 0.25), width: strokeWidth })
}

export function drawBackground(backgroundLayer: Graphics, world: BaseWorldConfig) {
  backgroundLayer.clear()
  backgroundLayer.rect(0, 0, world.width, world.height).fill({ color: PALETTE.background })
}

export function drawTerrain(
  terrainLayer: Graphics,
  world: BaseWorldConfig,
  terrain: readonly TerrainKind[]
) {
  terrainLayer.clear()

  for (let row = 0; row < world.rows; row += 1) {
    for (let col = 0; col < world.cols; col += 1) {
      const terrainKind = terrain[row * world.cols + col]

      terrainLayer
        .rect(
          col * world.cellSize,
          row * world.cellSize,
          world.cellSize,
          world.cellSize
        )
        .fill({ color: resolveTerrainColor(terrainKind), alpha: 0.92 })
    }
  }
}

export function drawGrid(
  gridLayer: Graphics,
  subgridLayer: Graphics,
  world: BaseWorldConfig,
  showSubgrid: boolean
) {
  gridLayer.clear()
  subgridLayer.clear()

  for (let col = 0; col <= world.cols; col += 1) {
    const x = col * world.cellSize
    gridLayer
      .moveTo(x, 0)
      .lineTo(x, world.height)
      .stroke({ color: PALETTE.grid, width: 1, alpha: 0.42 })
  }

  for (let row = 0; row <= world.rows; row += 1) {
    const y = row * world.cellSize
    gridLayer
      .moveTo(0, y)
      .lineTo(world.width, y)
      .stroke({ color: PALETTE.grid, width: 1, alpha: 0.42 })
  }

  if (!showSubgrid) {
    return
  }

  const subcellSize = world.cellSize / world.subgridDivisions

  for (let subcol = 0; subcol <= world.cols * world.subgridDivisions; subcol += 1) {
    if (subcol % world.subgridDivisions === 0) {
      continue
    }

    const x = subcol * subcellSize
    subgridLayer
      .moveTo(x, 0)
      .lineTo(x, world.height)
      .stroke({ color: PALETTE.subgrid, width: 1, alpha: 0.28 })
  }

  for (let subrow = 0; subrow <= world.rows * world.subgridDivisions; subrow += 1) {
    if (subrow % world.subgridDivisions === 0) {
      continue
    }

    const y = subrow * subcellSize
    subgridLayer
      .moveTo(0, y)
      .lineTo(world.width, y)
      .stroke({ color: PALETTE.subgrid, width: 1, alpha: 0.28 })
  }
}

export function drawLayout(
  structureLayer: Graphics,
  buildingLayer: Graphics,
  world: BaseWorldConfig,
  layout: BaseLayoutState
) {
  structureLayer.clear()
  buildingLayer.clear()

  for (const building of layout.buildings) {
    const color = resolveBuildingColor(building.definitionId)

    if (building.footprint.kind === "edge") {
      drawEdgeSegment(structureLayer, world, building.footprint.edge, color, 5.5)
      continue
    }

    drawAreaRect({
      layer: buildingLayer,
      world,
      origin: building.footprint.origin,
      widthSubcells: building.footprint.widthSubcells,
      heightSubcells: building.footprint.heightSubcells,
      color,
      alpha: 0.72,
    })
  }
}

export function drawSelection(
  overlayLayer: Graphics,
  world: BaseWorldConfig,
  layout: BaseLayoutState,
  selection: BaseSelection | null
) {
  if (!selection) {
    return
  }

  if (selection.type === "terrain") {
    overlayLayer
      .roundRect(
        selection.cell.col * world.cellSize + 1,
        selection.cell.row * world.cellSize + 1,
        world.cellSize - 2,
        world.cellSize - 2,
        6
      )
      .stroke({ color: PALETTE.selection, width: 2, alpha: 0.92 })
    return
  }

  const building = layout.buildings.find((item) => item.id === selection.buildingId)

  if (!building) {
    return
  }

  if (building.footprint.kind === "edge") {
    drawEdgeSegment(
      overlayLayer,
      world,
      building.footprint.edge,
      PALETTE.selection,
      9,
      0.4
    )
    drawEdgeSegment(
      overlayLayer,
      world,
      building.footprint.edge,
      PALETTE.selection,
      3,
      1
    )
    return
  }

  drawAreaRect({
    layer: overlayLayer,
    world,
    origin: building.footprint.origin,
    widthSubcells: building.footprint.widthSubcells,
    heightSubcells: building.footprint.heightSubcells,
    color: PALETTE.selection,
    alpha: 0.15,
    strokeWidth: 2,
  })
}

export function drawPreview(
  overlayLayer: Graphics,
  world: BaseWorldConfig,
  preview: PlacementPreview
) {
  if (!preview?.footprint) {
    return
  }

  const color = preview.valid ? PALETTE.previewValid : PALETTE.previewInvalid

  if (preview.footprint.kind === "edge") {
    drawEdgeSegment(overlayLayer, world, preview.footprint.edge, color, 6, 0.32)
    drawEdgeSegment(overlayLayer, world, preview.footprint.edge, color, 2.5, 0.96)
    return
  }

  drawAreaRect({
    layer: overlayLayer,
    world,
    origin: preview.footprint.origin,
    widthSubcells: preview.footprint.widthSubcells,
    heightSubcells: preview.footprint.heightSubcells,
    color,
    alpha: preview.valid ? 0.18 : 0.16,
    strokeWidth: 2,
  })
}

export function redrawOverlay(
  overlayLayer: Graphics,
  world: BaseWorldConfig,
  layout: BaseLayoutState,
  selection: BaseSelection | null,
  preview: PlacementPreview
) {
  overlayLayer.clear()
  drawSelection(overlayLayer, world, layout, selection)
  drawPreview(overlayLayer, world, preview)
}
