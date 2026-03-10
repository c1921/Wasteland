import { Graphics } from "pixi.js"

import { BASE_BUILDING_DEFINITION_MAP } from "@/features/base/data/base-world"
import type {
  BaseLayoutState,
  BaseSelection,
  BaseWorldConfig,
  PlacementPreview,
  TerrainKind,
} from "@/features/base/types"
import type { MapThemePalette } from "@/features/map/render/map-theme"

type BaseAccentPalette = {
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

const BASE_REFERENCE_CELL_SIZE = 48
const GRID_ALPHA = 0.18
const SUBGRID_ALPHA = 0.08
const NON_GRASS_TERRAIN_ALPHA = 0.15
const PLACED_ENTITY_ALPHA = 0.3
const TERRAIN_DESATURATION = 0.78
const TERRAIN_BACKGROUND_BLEND = 0.68
const TERRAIN_GRID_BLEND = 0.14

const PALETTE: BaseAccentPalette = {
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

function clampColorChannel(value: number) {
  return Math.min(255, Math.max(0, Math.round(value)))
}

function toPixiHexColor(r: number, g: number, b: number) {
  return (clampColorChannel(r) << 16) | (clampColorChannel(g) << 8) | clampColorChannel(b)
}

function splitPixiHexColor(color: number) {
  return {
    r: (color >> 16) & 0xff,
    g: (color >> 8) & 0xff,
    b: color & 0xff,
  }
}

function mixChannel(start: number, end: number, amount: number) {
  return start + (end - start) * amount
}

function blendColors(color: number, target: number, amount: number) {
  const source = splitPixiHexColor(color)
  const destination = splitPixiHexColor(target)

  return toPixiHexColor(
    mixChannel(source.r, destination.r, amount),
    mixChannel(source.g, destination.g, amount),
    mixChannel(source.b, destination.b, amount)
  )
}

function desaturateColor(color: number, amount: number) {
  const { r, g, b } = splitPixiHexColor(color)
  const grayscale = 0.299 * r + 0.587 * g + 0.114 * b

  return toPixiHexColor(
    mixChannel(r, grayscale, amount),
    mixChannel(g, grayscale, amount),
    mixChannel(b, grayscale, amount)
  )
}

function getWorldScale(world: BaseWorldConfig) {
  return world.cellSize / BASE_REFERENCE_CELL_SIZE
}

function scaleStrokeWidth(
  world: BaseWorldConfig,
  width: number,
  minimumWidth = 0.75
) {
  return Math.max(minimumWidth, width * getWorldScale(world))
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

function resolveTerrainTint(terrainKind: TerrainKind, mapTheme: MapThemePalette) {
  const desaturated = desaturateColor(resolveTerrainColor(terrainKind), TERRAIN_DESATURATION)
  const backgroundMixed = blendColors(
    desaturated,
    mapTheme.background,
    TERRAIN_BACKGROUND_BLEND
  )

  return blendColors(backgroundMixed, mapTheme.grid, TERRAIN_GRID_BLEND)
}

export function resolveTerrainFillStyle(terrainKind: TerrainKind, mapTheme: MapThemePalette) {
  if (terrainKind === "grass") {
    return {
      color: mapTheme.background,
      alpha: 0,
    }
  }

  return {
    color: resolveTerrainTint(terrainKind, mapTheme),
    alpha: NON_GRASS_TERRAIN_ALPHA,
  }
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
  strokeAlpha?: number
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
    strokeAlpha = Math.min(1, alpha + 0.25),
  } = params
  const subcellSize = world.cellSize / world.subgridDivisions
  const x = origin.subcol * subcellSize
  const y = origin.subrow * subcellSize
  const width = widthSubcells * subcellSize
  const height = heightSubcells * subcellSize

  layer
    .roundRect(x, y, width, height, Math.max(2.5, subcellSize * 0.22))
    .fill({ color, alpha })
    .stroke({
      color,
      alpha: strokeAlpha,
      width: scaleStrokeWidth(world, strokeWidth),
    })
}

export function drawBackground(
  backgroundLayer: Graphics,
  world: BaseWorldConfig,
  mapTheme: MapThemePalette
) {
  backgroundLayer.clear()
  backgroundLayer.rect(0, 0, world.width, world.height).fill({ color: mapTheme.background })
}

export function drawTerrain(
  terrainLayer: Graphics,
  world: BaseWorldConfig,
  terrain: readonly TerrainKind[],
  mapTheme: MapThemePalette
) {
  terrainLayer.clear()

  for (let row = 0; row < world.rows; row += 1) {
    for (let col = 0; col < world.cols; col += 1) {
      const terrainKind = terrain[row * world.cols + col] ?? "grass"
      const fillStyle = resolveTerrainFillStyle(terrainKind, mapTheme)

      if (fillStyle.alpha <= 0) {
        continue
      }

      terrainLayer
        .rect(
          col * world.cellSize,
          row * world.cellSize,
          world.cellSize,
          world.cellSize
        )
        .fill(fillStyle)
    }
  }
}

export function drawGrid(
  gridLayer: Graphics,
  subgridLayer: Graphics,
  world: BaseWorldConfig,
  showSubgrid: boolean,
  mapTheme: MapThemePalette
) {
  gridLayer.clear()
  subgridLayer.clear()

  for (let col = 0; col <= world.cols; col += 1) {
    const x = col * world.cellSize
    gridLayer
      .moveTo(x, 0)
      .lineTo(x, world.height)
      .stroke({
        color: mapTheme.grid,
        width: scaleStrokeWidth(world, 1),
        alpha: GRID_ALPHA,
      })
  }

  for (let row = 0; row <= world.rows; row += 1) {
    const y = row * world.cellSize
    gridLayer
      .moveTo(0, y)
      .lineTo(world.width, y)
      .stroke({
        color: mapTheme.grid,
        width: scaleStrokeWidth(world, 1),
        alpha: GRID_ALPHA,
      })
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
      .stroke({
        color: mapTheme.grid,
        width: scaleStrokeWidth(world, 1),
        alpha: SUBGRID_ALPHA,
      })
  }

  for (let subrow = 0; subrow <= world.rows * world.subgridDivisions; subrow += 1) {
    if (subrow % world.subgridDivisions === 0) {
      continue
    }

    const y = subrow * subcellSize
    subgridLayer
      .moveTo(0, y)
      .lineTo(world.width, y)
      .stroke({
        color: mapTheme.grid,
        width: scaleStrokeWidth(world, 1),
        alpha: SUBGRID_ALPHA,
      })
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
    const definition = BASE_BUILDING_DEFINITION_MAP.get(building.definitionId)
    const layer = definition?.category === "structure" ? structureLayer : buildingLayer

    drawAreaRect({
      layer,
      world,
      origin: building.footprint.origin,
      widthSubcells: building.footprint.widthSubcells,
      heightSubcells: building.footprint.heightSubcells,
      color,
      alpha: PLACED_ENTITY_ALPHA,
      strokeAlpha: PLACED_ENTITY_ALPHA,
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
    const inset = Math.max(1, Math.round(getWorldScale(world)))

    overlayLayer
      .roundRect(
        selection.cell.col * world.cellSize + inset,
        selection.cell.row * world.cellSize + inset,
        world.cellSize - inset * 2,
        world.cellSize - inset * 2,
        Math.max(4, world.cellSize * 0.12)
      )
      .stroke({
        color: PALETTE.selection,
        width: scaleStrokeWidth(world, 2, 1.2),
        alpha: 0.92,
      })
    return
  }

  const building = layout.buildings.find((item) => item.id === selection.buildingId)

  if (!building) {
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
