import {
  BASE_BUILDING_DEFINITION_MAP,
} from "@/features/base/data/base-world"
import {
  BASE_CELL_EDGE_SNAP_PX,
  BASE_EQUIPMENT_DEFINITION_IDS,
  BASE_FURNITURE_DEFINITION_IDS,
  BASE_STRUCTURE_TOOL_DEFINITION_ID,
  DEFAULT_EQUIPMENT_DEFINITION_ID,
  DEFAULT_FURNITURE_DEFINITION_ID,
} from "@/features/base/constants"
import type {
  BaseEditorState,
  BaseLayoutState,
  BasePointerTarget,
  BaseSelection,
  BaseWorldConfig,
  BuildingDefinition,
  CellCoord,
  EdgeCoord,
  PlacementPreview,
  PlacementTool,
  PlacedBuilding,
  QuarterTurn,
  ResolvedBuildingFootprint,
  SubcellCoord,
  TerrainKind,
  WorldPoint,
} from "@/features/base/types"

const ROTATED_TURNS = new Set<QuarterTurn>([90, 270])

export type PlacementMutationResult = {
  nextLayout: BaseLayoutState
  changed: boolean
  placedCount: number
  removedCount: number
  skippedCount: number
  selection: BaseSelection | null
  message: string
}

type OccupancyState = {
  edgeToBuildingId: Map<string, string>
  subcellToBuildingId: Map<string, string>
}

let placedBuildingSequence = 0

function cloneFootprint(footprint: ResolvedBuildingFootprint): ResolvedBuildingFootprint {
  if (footprint.kind === "edge") {
    return {
      kind: "edge",
      edge: { ...footprint.edge },
    }
  }

  return {
    kind: "area",
    origin: { ...footprint.origin },
    widthSubcells: footprint.widthSubcells,
    heightSubcells: footprint.heightSubcells,
  }
}

function cloneBuilding(building: PlacedBuilding): PlacedBuilding {
  return {
    id: building.id,
    definitionId: building.definitionId,
    rotation: building.rotation,
    footprint: cloneFootprint(building.footprint),
  }
}

function cloneLayout(layout: BaseLayoutState): BaseLayoutState {
  return {
    buildings: layout.buildings.map(cloneBuilding),
  }
}

function nextPlacedBuildingId() {
  placedBuildingSequence += 1
  return `base-building-${placedBuildingSequence}`
}

function resolveAreaDimensions(
  definition: BuildingDefinition,
  rotation: QuarterTurn
): { widthSubcells: number; heightSubcells: number } | null {
  if (definition.footprint.kind === "edge") {
    return null
  }

  const baseDimensions =
    definition.footprint.kind === "cell-area"
      ? {
        widthSubcells: definition.footprint.widthCells * 3,
        heightSubcells: definition.footprint.heightCells * 3,
      }
      : {
        widthSubcells: definition.footprint.widthSubcells,
        heightSubcells: definition.footprint.heightSubcells,
      }

  if (!ROTATED_TURNS.has(rotation)) {
    return baseDimensions
  }

  return {
    widthSubcells: baseDimensions.heightSubcells,
    heightSubcells: baseDimensions.widthSubcells,
  }
}

function toEdgeKey(edge: EdgeCoord) {
  return `${edge.axis}:${edge.col}:${edge.row}`
}

function toSubcellKey(coord: SubcellCoord) {
  return `${coord.subcol}:${coord.subrow}`
}

function toCellKey(cell: CellCoord) {
  return `${cell.col}:${cell.row}`
}

function getMaxSubcols(world: BaseWorldConfig) {
  return world.cols * world.subgridDivisions
}

function getMaxSubrows(world: BaseWorldConfig) {
  return world.rows * world.subgridDivisions
}

function isPointInWorld(world: BaseWorldConfig, point: WorldPoint) {
  return point.x >= 0 && point.y >= 0 && point.x < world.width && point.y < world.height
}

function isCellInBounds(world: BaseWorldConfig, cell: CellCoord) {
  return cell.col >= 0 && cell.col < world.cols && cell.row >= 0 && cell.row < world.rows
}

function isAreaInBounds(
  world: BaseWorldConfig,
  origin: SubcellCoord,
  widthSubcells: number,
  heightSubcells: number
) {
  return (
    origin.subcol >= 0 &&
    origin.subrow >= 0 &&
    origin.subcol + widthSubcells <= getMaxSubcols(world) &&
    origin.subrow + heightSubcells <= getMaxSubrows(world)
  )
}

function isEdgeInBounds(world: BaseWorldConfig, edge: EdgeCoord) {
  if (edge.axis === "horizontal") {
    return edge.col >= 0 && edge.col < world.cols && edge.row >= 0 && edge.row <= world.rows
  }

  return edge.col >= 0 && edge.col <= world.cols && edge.row >= 0 && edge.row < world.rows
}

function getCellAtPoint(world: BaseWorldConfig, point: WorldPoint): CellCoord | null {
  if (!isPointInWorld(world, point)) {
    return null
  }

  return {
    col: Math.floor(point.x / world.cellSize),
    row: Math.floor(point.y / world.cellSize),
  }
}

function getSubcellAtPoint(world: BaseWorldConfig, point: WorldPoint): SubcellCoord | null {
  if (!isPointInWorld(world, point)) {
    return null
  }

  const subcellSize = world.cellSize / world.subgridDivisions
  return {
    subcol: Math.floor(point.x / subcellSize),
    subrow: Math.floor(point.y / subcellSize),
  }
}

function getAreaSubcells(footprint: Extract<ResolvedBuildingFootprint, { kind: "area" }>) {
  const coords: SubcellCoord[] = []

  for (let subrow = footprint.origin.subrow; subrow < footprint.origin.subrow + footprint.heightSubcells; subrow += 1) {
    for (let subcol = footprint.origin.subcol; subcol < footprint.origin.subcol + footprint.widthSubcells; subcol += 1) {
      coords.push({ subcol, subrow })
    }
  }

  return coords
}

function getAdjacentCellsForEdge(world: BaseWorldConfig, edge: EdgeCoord) {
  const cells: CellCoord[] = []

  if (edge.axis === "horizontal") {
    if (edge.row > 0) {
      cells.push({ col: edge.col, row: edge.row - 1 })
    }

    if (edge.row < world.rows) {
      cells.push({ col: edge.col, row: edge.row })
    }

    return cells
  }

  if (edge.col > 0) {
    cells.push({ col: edge.col - 1, row: edge.row })
  }

  if (edge.col < world.cols) {
    cells.push({ col: edge.col, row: edge.row })
  }

  return cells
}

function buildOccupancyState(layout: BaseLayoutState): OccupancyState {
  const edgeToBuildingId = new Map<string, string>()
  const subcellToBuildingId = new Map<string, string>()

  for (const building of layout.buildings) {
    if (building.footprint.kind === "edge") {
      edgeToBuildingId.set(toEdgeKey(building.footprint.edge), building.id)
      continue
    }

    for (const coord of getAreaSubcells(building.footprint)) {
      subcellToBuildingId.set(toSubcellKey(coord), building.id)
    }
  }

  return { edgeToBuildingId, subcellToBuildingId }
}

function getBuildingIdAtSubcell(layout: BaseLayoutState, coord: SubcellCoord) {
  const occupancy = buildOccupancyState(layout)
  return occupancy.subcellToBuildingId.get(toSubcellKey(coord)) ?? null
}

function removeBuildingIds(layout: BaseLayoutState, buildingIds: Set<string>) {
  if (buildingIds.size === 0) {
    return cloneLayout(layout)
  }

  return {
    buildings: layout.buildings
      .filter((building) => !buildingIds.has(building.id))
      .map(cloneBuilding),
  }
}

function replaceOrInsertBuilding(layout: BaseLayoutState, nextBuilding: PlacedBuilding) {
  const nextBuildings = layout.buildings
    .filter((building) => building.id !== nextBuilding.id)
    .map(cloneBuilding)

  nextBuildings.push(cloneBuilding(nextBuilding))
  return {
    buildings: nextBuildings,
  }
}

function formatBuildingLabel(definitionId: string) {
  return BASE_BUILDING_DEFINITION_MAP.get(definitionId)?.label ?? definitionId
}

function summarizePlacementMessage(
  definitionId: string,
  placedCount: number,
  skippedCount: number,
  actionLabel: string
) {
  const label = formatBuildingLabel(definitionId)

  if (placedCount <= 0) {
    return `${label}${actionLabel}失败，已跳过${skippedCount}处。`
  }

  if (skippedCount <= 0) {
    return `${label}${actionLabel}${placedCount}处。`
  }

  return `${label}${actionLabel}${placedCount}处，跳过${skippedCount}处。`
}

function summarizeRemovalMessage(removedCount: number) {
  if (removedCount <= 0) {
    return "未命中可拆除建筑。"
  }

  return `已拆除${removedCount}个建筑。`
}

function getStructurePlacementLabel(definitionId: string) {
  if (definitionId === "wall") {
    return "放置"
  }

  return "转换"
}

function getDefinitionForTool(
  tool: PlacementTool,
  activeDefinitionId: string | null
) {
  if (tool === "wall" || tool === "door" || tool === "window") {
    return BASE_BUILDING_DEFINITION_MAP.get(BASE_STRUCTURE_TOOL_DEFINITION_ID[tool]) ?? null
  }

  if (tool === "furniture") {
    const candidate = activeDefinitionId ?? DEFAULT_FURNITURE_DEFINITION_ID
    const definition = BASE_BUILDING_DEFINITION_MAP.get(candidate) ?? null
    return definition?.category === "furniture" ? definition : null
  }

  if (tool === "equipment") {
    const candidate = activeDefinitionId ?? DEFAULT_EQUIPMENT_DEFINITION_ID
    const definition = BASE_BUILDING_DEFINITION_MAP.get(candidate) ?? null
    return definition?.category === "equipment" ? definition : null
  }

  return null
}

function getEdgeAtPoint(world: BaseWorldConfig, point: WorldPoint): EdgeCoord | null {
  const cell = getCellAtPoint(world, point)

  if (!cell) {
    return null
  }

  const localX = point.x - cell.col * world.cellSize
  const localY = point.y - cell.row * world.cellSize
  const distanceTop = localY
  const distanceBottom = world.cellSize - localY
  const distanceLeft = localX
  const distanceRight = world.cellSize - localX
  const candidates = [
    { distance: distanceTop, edge: { axis: "horizontal" as const, col: cell.col, row: cell.row } },
    { distance: distanceBottom, edge: { axis: "horizontal" as const, col: cell.col, row: cell.row + 1 } },
    { distance: distanceLeft, edge: { axis: "vertical" as const, col: cell.col, row: cell.row } },
    { distance: distanceRight, edge: { axis: "vertical" as const, col: cell.col + 1, row: cell.row } },
  ]
    .filter((candidate) => candidate.distance <= BASE_CELL_EDGE_SNAP_PX)
    .sort((left, right) => left.distance - right.distance)

  if (candidates.length === 0) {
    return null
  }

  const closest = candidates[0]?.edge ?? null

  if (!closest || !isEdgeInBounds(world, closest)) {
    return null
  }

  return closest
}

function resolvePlacementOrigin(
  world: BaseWorldConfig,
  definition: BuildingDefinition,
  rotation: QuarterTurn,
  point: WorldPoint
): SubcellCoord | null {
  const subcell = getSubcellAtPoint(world, point)

  if (!subcell) {
    return null
  }

  const dimensions = resolveAreaDimensions(definition, rotation)

  if (!dimensions) {
    return null
  }

  const anchorCell =
    definition.footprint.kind === "cell-area"
      ? getCellAtPoint(world, point)
      : null

  if (anchorCell) {
    return {
      subcol: anchorCell.col * world.subgridDivisions,
      subrow: anchorCell.row * world.subgridDivisions,
    }
  }

  return subcell
}

function getTerrainIndex(world: BaseWorldConfig, cell: CellCoord) {
  return cell.row * world.cols + cell.col
}

function getAreaCells(
  world: BaseWorldConfig,
  origin: SubcellCoord,
  widthSubcells: number,
  heightSubcells: number
) {
  const cellsByKey = new Map<string, CellCoord>()

  for (let subrow = origin.subrow; subrow < origin.subrow + heightSubcells; subrow += 1) {
    for (let subcol = origin.subcol; subcol < origin.subcol + widthSubcells; subcol += 1) {
      const cell = {
        col: Math.floor(subcol / world.subgridDivisions),
        row: Math.floor(subrow / world.subgridDivisions),
      }
      cellsByKey.set(toCellKey(cell), cell)
    }
  }

  return [...cellsByKey.values()]
}

function hasAllowedTerrain(
  terrain: readonly TerrainKind[],
  world: BaseWorldConfig,
  allowedTerrain: TerrainKind[],
  cells: CellCoord[]
) {
  for (const cell of cells) {
    if (!isCellInBounds(world, cell)) {
      return false
    }

    const terrainKind = terrain[getTerrainIndex(world, cell)]

    if (!terrainKind || !allowedTerrain.includes(terrainKind)) {
      return false
    }
  }

  return true
}

function validateEdgePlacement(params: {
  layout: BaseLayoutState
  terrain: readonly TerrainKind[]
  world: BaseWorldConfig
  definition: BuildingDefinition
  edge: EdgeCoord
}) {
  const {
    layout,
    terrain,
    world,
    definition,
    edge,
  } = params

  if (!isEdgeInBounds(world, edge)) {
    return {
      ok: false as const,
      action: "blocked" as const,
      message: "超出基地边界。",
      existingBuildingId: null,
    }
  }

  const adjacentCells = getAdjacentCellsForEdge(world, edge)

  if (!hasAllowedTerrain(terrain, world, definition.terrain.allowed, adjacentCells)) {
    return {
      ok: false as const,
      action: "blocked" as const,
      message: "该边缘邻接不可建地形。",
      existingBuildingId: null,
    }
  }

  const occupancy = buildOccupancyState(layout)
  const existingBuildingId = occupancy.edgeToBuildingId.get(toEdgeKey(edge)) ?? null
  const existingBuilding = existingBuildingId
    ? layout.buildings.find((building) => building.id === existingBuildingId) ?? null
    : null
  const existingDefinitionId = existingBuilding?.definitionId ?? null

  if (definition.id === "wall") {
    if (existingDefinitionId === "wall") {
      return {
        ok: false as const,
        action: "blocked" as const,
        message: "该边缘已存在墙体。",
        existingBuildingId,
      }
    }

    return {
      ok: true as const,
      action: existingBuilding ? ("replace" as const) : ("place" as const),
      message: existingBuilding ? "将门窗转换为墙体。" : "可放置墙体。",
      existingBuildingId,
    }
  }

  if (!existingBuilding || !existingDefinitionId) {
    return {
      ok: false as const,
      action: "blocked" as const,
      message: "门窗必须依附已有墙段。",
      existingBuildingId: null,
    }
  }

  if (existingDefinitionId === definition.id) {
    return {
      ok: false as const,
      action: "blocked" as const,
      message: `该边缘已存在${definition.label}。`,
      existingBuildingId,
    }
  }

  return {
    ok: true as const,
    action: "replace" as const,
    message: `可将当前结构转换为${definition.label}。`,
    existingBuildingId,
  }
}

function validateAreaPlacement(params: {
  layout: BaseLayoutState
  terrain: readonly TerrainKind[]
  world: BaseWorldConfig
  definition: BuildingDefinition
  origin: SubcellCoord
  rotation: QuarterTurn
}) {
  const {
    layout,
    terrain,
    world,
    definition,
    origin,
    rotation,
  } = params

  const dimensions = resolveAreaDimensions(definition, rotation)

  if (!dimensions) {
    return {
      ok: false as const,
      action: "blocked" as const,
      message: "当前建筑不支持面积放置。",
      footprint: null,
    }
  }

  if (!isAreaInBounds(world, origin, dimensions.widthSubcells, dimensions.heightSubcells)) {
    return {
      ok: false as const,
      action: "blocked" as const,
      message: "超出基地边界。",
      footprint: null,
    }
  }

  const occupiedCells = getAreaCells(
    world,
    origin,
    dimensions.widthSubcells,
    dimensions.heightSubcells
  )

  if (!hasAllowedTerrain(terrain, world, definition.terrain.allowed, occupiedCells)) {
    return {
      ok: false as const,
      action: "blocked" as const,
      message: "目标区域包含不可建地形。",
      footprint: null,
    }
  }

  const occupancy = buildOccupancyState(layout)

  for (let subrow = origin.subrow; subrow < origin.subrow + dimensions.heightSubcells; subrow += 1) {
    for (let subcol = origin.subcol; subcol < origin.subcol + dimensions.widthSubcells; subcol += 1) {
      const occupiedBy = occupancy.subcellToBuildingId.get(toSubcellKey({ subcol, subrow }))

      if (occupiedBy) {
        return {
          ok: false as const,
          action: "blocked" as const,
          message: "目标区域已被其它建筑占用。",
          footprint: null,
        }
      }
    }
  }

  return {
    ok: true as const,
    action: "place" as const,
    message: "可放置建筑。",
    footprint: {
      kind: "area" as const,
      origin: { ...origin },
      widthSubcells: dimensions.widthSubcells,
      heightSubcells: dimensions.heightSubcells,
    },
  }
}

function interpolateIntegers(start: number, end: number) {
  const result: number[] = []
  const step = start <= end ? 1 : -1

  for (let cursor = start; step > 0 ? cursor <= end : cursor >= end; cursor += step) {
    result.push(cursor)
  }

  return result
}

export function resetPlacedBuildingIdSequence() {
  placedBuildingSequence = 0
}

export function createEmptyBaseLayout(): BaseLayoutState {
  return {
    buildings: [],
  }
}

export function getBuildingDefinitionById(definitionId: string) {
  return BASE_BUILDING_DEFINITION_MAP.get(definitionId) ?? null
}

export function getPlacedBuildingById(layout: BaseLayoutState, buildingId: string) {
  return layout.buildings.find((building) => building.id === buildingId) ?? null
}

export function getResolvedAreaDimensions(
  definition: BuildingDefinition,
  rotation: QuarterTurn
) {
  return resolveAreaDimensions(definition, rotation)
}

export function getTerrainAtCell(
  terrain: readonly TerrainKind[],
  world: BaseWorldConfig,
  cell: CellCoord
) {
  if (!isCellInBounds(world, cell)) {
    return null
  }

  return terrain[getTerrainIndex(world, cell)] ?? null
}

export function isTerrainBuildable(terrainKind: TerrainKind) {
  return terrainKind === "grass" || terrainKind === "sand"
}

export function getDefaultDefinitionIdForTool(tool: PlacementTool) {
  if (tool === "furniture") {
    return DEFAULT_FURNITURE_DEFINITION_ID
  }

  if (tool === "equipment") {
    return DEFAULT_EQUIPMENT_DEFINITION_ID
  }

  if (tool === "wall" || tool === "door" || tool === "window") {
    return BASE_STRUCTURE_TOOL_DEFINITION_ID[tool]
  }

  return null
}

export function resolveDefinitionForTool(
  tool: PlacementTool,
  activeDefinitionId: string | null
) {
  return getDefinitionForTool(tool, activeDefinitionId)
}

export function getToolDefinitionIds(tool: PlacementTool) {
  if (tool === "furniture") {
    return [...BASE_FURNITURE_DEFINITION_IDS]
  }

  if (tool === "equipment") {
    return [...BASE_EQUIPMENT_DEFINITION_IDS]
  }

  return []
}

export function pickPointerTarget(
  layout: BaseLayoutState,
  world: BaseWorldConfig,
  point: WorldPoint
): BasePointerTarget | null {
  const cell = getCellAtPoint(world, point)

  if (!cell) {
    return null
  }

  const edge = getEdgeAtPoint(world, point)

  if (edge) {
    const occupancy = buildOccupancyState(layout)
    const buildingId = occupancy.edgeToBuildingId.get(toEdgeKey(edge)) ?? null

    if (buildingId) {
      return {
        type: "building",
        buildingId,
      }
    }

    return {
      type: "edge",
      edge,
      buildingId: null,
    }
  }

  const subcell = getSubcellAtPoint(world, point)

  if (subcell) {
    const buildingId = getBuildingIdAtSubcell(layout, subcell)

    if (buildingId) {
      return {
        type: "building",
        buildingId,
      }
    }
  }

  return {
    type: "terrain",
    cell,
  }
}

export function resolveSelectionAtPoint(
  layout: BaseLayoutState,
  world: BaseWorldConfig,
  point: WorldPoint
): BaseSelection | null {
  const target = pickPointerTarget(layout, world, point)

  if (!target) {
    return null
  }

  if (target.type === "building") {
    return {
      type: "building",
      buildingId: target.buildingId,
    }
  }

  if (target.type === "terrain") {
    return {
      type: "terrain",
      cell: target.cell,
    }
  }

  return {
    type: "terrain",
    cell:
      target.edge.axis === "horizontal"
        ? {
          col: target.edge.col,
          row: Math.max(0, Math.min(world.rows - 1, target.edge.row === world.rows ? target.edge.row - 1 : target.edge.row)),
        }
        : {
          col: Math.max(0, Math.min(world.cols - 1, target.edge.col === world.cols ? target.edge.col - 1 : target.edge.col)),
          row: target.edge.row,
        },
  }
}

export function resolvePlacementPreview(params: {
  layout: BaseLayoutState
  terrain: readonly TerrainKind[]
  world: BaseWorldConfig
  editorState: BaseEditorState
  point: WorldPoint
}): PlacementPreview {
  const {
    layout,
    terrain,
    world,
    editorState,
    point,
  } = params

  const target = pickPointerTarget(layout, world, point)

  if (!target) {
    return null
  }

  if (editorState.tool === "select") {
    return {
      tool: "select",
      target,
      footprint: null,
      valid: true,
      action: "select",
      message: target.type === "building" ? "点击查看建筑详情。" : "点击查看地形信息。",
    }
  }

  if (editorState.tool === "demolish") {
    if (target.type === "building") {
      return {
        tool: "demolish",
        target,
        footprint: null,
        valid: true,
        action: "remove",
        message: "点击或拖拽拆除建筑。",
      }
    }

    return {
      tool: "demolish",
      target,
      footprint: null,
      valid: false,
      action: "blocked",
      message: "当前位置没有可拆除建筑。",
    }
  }

  const definition = getDefinitionForTool(editorState.tool, editorState.activeDefinitionId)

  if (!definition) {
    return null
  }

  if (definition.footprint.kind === "edge") {
    if (target.type !== "edge" && target.type !== "building") {
      return {
        tool: editorState.tool,
        target,
        footprint: null,
        valid: false,
        action: "blocked",
        message: "请将结构放置在网格边缘。",
      }
    }

    const structureBuilding =
      target.type === "building" ? getPlacedBuildingById(layout, target.buildingId) : null
    const edge =
      target.type === "edge"
        ? target.edge
        : structureBuilding?.footprint.kind === "edge"
          ? { ...structureBuilding.footprint.edge }
          : null

    if (!edge) {
      return {
        tool: editorState.tool,
        target,
        footprint: null,
        valid: false,
        action: "blocked",
        message: "请将结构放置在网格边缘。",
      }
    }

    const validation = validateEdgePlacement({
      layout,
      terrain,
      world,
      definition,
      edge,
    })

    return {
      tool: editorState.tool,
      target,
      footprint: {
        kind: "edge",
        edge,
      },
      valid: validation.ok,
      action: validation.action,
      message: validation.message,
    }
  }

  const origin = resolvePlacementOrigin(world, definition, editorState.rotation, point)

  if (!origin) {
    return {
      tool: editorState.tool,
      target,
      footprint: null,
      valid: false,
      action: "blocked",
      message: "无法解析当前放置位置。",
    }
  }

  const validation = validateAreaPlacement({
    layout,
    terrain,
    world,
    definition,
    origin,
    rotation: editorState.rotation,
  })

  return {
    tool: editorState.tool,
    target,
    footprint: validation.footprint,
    valid: validation.ok,
    action: validation.action,
    message: validation.message,
  }
}

export function resolveStructureDragEdges(start: EdgeCoord, end: EdgeCoord) {
  if (start.axis !== end.axis) {
    return null
  }

  if (start.axis === "horizontal") {
    if (start.row !== end.row) {
      return null
    }

    return interpolateIntegers(start.col, end.col).map((col) => ({
      axis: "horizontal" as const,
      col,
      row: start.row,
    }))
  }

  if (start.col !== end.col) {
    return null
  }

  return interpolateIntegers(start.row, end.row).map((row) => ({
    axis: "vertical" as const,
    col: start.col,
    row,
  }))
}

export function resolveBrushPath(start: SubcellCoord, end: SubcellCoord) {
  const steps = Math.max(
    Math.abs(end.subcol - start.subcol),
    Math.abs(end.subrow - start.subrow),
    1
  )
  const visited = new Map<string, SubcellCoord>()

  for (let step = 0; step <= steps; step += 1) {
    const ratio = step / steps
    const coord = {
      subcol: Math.round(start.subcol + (end.subcol - start.subcol) * ratio),
      subrow: Math.round(start.subrow + (end.subrow - start.subrow) * ratio),
    }
    visited.set(toSubcellKey(coord), coord)
  }

  return [...visited.values()]
}

export function applyStructurePlacement(params: {
  layout: BaseLayoutState
  terrain: readonly TerrainKind[]
  world: BaseWorldConfig
  definitionId: string
  edges: EdgeCoord[]
}) {
  const {
    layout,
    terrain,
    world,
    definitionId,
    edges,
  } = params
  const definition = BASE_BUILDING_DEFINITION_MAP.get(definitionId) ?? null

  if (!definition || definition.footprint.kind !== "edge") {
    return {
      nextLayout: cloneLayout(layout),
      changed: false,
      placedCount: 0,
      removedCount: 0,
      skippedCount: edges.length,
      selection: null,
      message: "结构定义无效。",
    } satisfies PlacementMutationResult
  }

  let nextLayout = cloneLayout(layout)
  let placedCount = 0
  let skippedCount = 0
  let lastBuildingId: string | null = null

  for (const edge of edges) {
    const validation = validateEdgePlacement({
      layout: nextLayout,
      terrain,
      world,
      definition,
      edge,
    })

    if (!validation.ok) {
      skippedCount += 1
      continue
    }

    const footprint: ResolvedBuildingFootprint = {
      kind: "edge",
      edge: { ...edge },
    }
    const nextBuilding: PlacedBuilding = validation.existingBuildingId
      ? {
        ...(getPlacedBuildingById(nextLayout, validation.existingBuildingId) ?? {
          id: validation.existingBuildingId,
          definitionId,
          rotation: 0 as QuarterTurn,
          footprint,
        }),
        definitionId,
        rotation: 0,
        footprint,
      }
      : {
        id: nextPlacedBuildingId(),
        definitionId,
        rotation: 0,
        footprint,
      }

    nextLayout = replaceOrInsertBuilding(nextLayout, nextBuilding)
    placedCount += 1
    lastBuildingId = nextBuilding.id
  }

  return {
    nextLayout,
    changed: placedCount > 0,
    placedCount,
    removedCount: 0,
    skippedCount,
    selection: lastBuildingId ? { type: "building", buildingId: lastBuildingId } : null,
    message: summarizePlacementMessage(
      definitionId,
      placedCount,
      skippedCount,
      getStructurePlacementLabel(definitionId)
    ),
  } satisfies PlacementMutationResult
}

export function applyAreaPlacement(params: {
  layout: BaseLayoutState
  terrain: readonly TerrainKind[]
  world: BaseWorldConfig
  definitionId: string
  origin: SubcellCoord
  rotation: QuarterTurn
}) {
  const {
    layout,
    terrain,
    world,
    definitionId,
    origin,
    rotation,
  } = params
  const definition = BASE_BUILDING_DEFINITION_MAP.get(definitionId) ?? null

  if (!definition || definition.footprint.kind === "edge") {
    return {
      nextLayout: cloneLayout(layout),
      changed: false,
      placedCount: 0,
      removedCount: 0,
      skippedCount: 1,
      selection: null,
      message: "建筑定义无效。",
    } satisfies PlacementMutationResult
  }

  const validation = validateAreaPlacement({
    layout,
    terrain,
    world,
    definition,
    origin,
    rotation,
  })

  if (!validation.ok || !validation.footprint) {
    return {
      nextLayout: cloneLayout(layout),
      changed: false,
      placedCount: 0,
      removedCount: 0,
      skippedCount: 1,
      selection: null,
      message: validation.message,
    } satisfies PlacementMutationResult
  }

  const nextBuilding: PlacedBuilding = {
    id: nextPlacedBuildingId(),
    definitionId,
    rotation,
    footprint: validation.footprint,
  }
  const nextLayout = {
    buildings: [...layout.buildings.map(cloneBuilding), nextBuilding],
  }

  return {
    nextLayout,
    changed: true,
    placedCount: 1,
    removedCount: 0,
    skippedCount: 0,
    selection: { type: "building", buildingId: nextBuilding.id },
    message: summarizePlacementMessage(definitionId, 1, 0, "放置"),
  } satisfies PlacementMutationResult
}

export function applyAreaBrushPlacement(params: {
  layout: BaseLayoutState
  terrain: readonly TerrainKind[]
  world: BaseWorldConfig
  definitionId: string
  origins: SubcellCoord[]
  rotation: QuarterTurn
}) {
  const {
    layout,
    terrain,
    world,
    definitionId,
    origins,
    rotation,
  } = params
  const definition = BASE_BUILDING_DEFINITION_MAP.get(definitionId) ?? null

  if (
    !definition ||
    definition.footprint.kind !== "subcell-area" ||
    !definition.footprint.brushable
  ) {
    return {
      nextLayout: cloneLayout(layout),
      changed: false,
      placedCount: 0,
      removedCount: 0,
      skippedCount: origins.length,
      selection: null,
      message: "当前建筑不支持拖拽刷放。",
    } satisfies PlacementMutationResult
  }

  let nextLayout = cloneLayout(layout)
  let placedCount = 0
  let skippedCount = 0
  let lastBuildingId: string | null = null
  const visited = new Set<string>()

  for (const origin of origins) {
    const key = toSubcellKey(origin)

    if (visited.has(key)) {
      continue
    }

    visited.add(key)

    const result = applyAreaPlacement({
      layout: nextLayout,
      terrain,
      world,
      definitionId,
      origin,
      rotation,
    })

    if (!result.changed) {
      skippedCount += 1
      continue
    }

    nextLayout = result.nextLayout
    placedCount += 1
    if (result.selection?.type === "building") {
      lastBuildingId = result.selection.buildingId
    }
  }

  return {
    nextLayout,
    changed: placedCount > 0,
    placedCount,
    removedCount: 0,
    skippedCount,
    selection: lastBuildingId ? { type: "building", buildingId: lastBuildingId } : null,
    message: summarizePlacementMessage(definitionId, placedCount, skippedCount, "放置"),
  } satisfies PlacementMutationResult
}

export function removeBuildingsByIds(layout: BaseLayoutState, buildingIds: string[]) {
  const uniqueIds = new Set(buildingIds)
  const nextLayout = removeBuildingIds(layout, uniqueIds)
  const removedCount = layout.buildings.length - nextLayout.buildings.length

  return {
    nextLayout,
    changed: removedCount > 0,
    placedCount: 0,
    removedCount,
    skippedCount: 0,
    selection: null,
    message: summarizeRemovalMessage(removedCount),
  } satisfies PlacementMutationResult
}

export function resolveDemolishIdsFromTargets(targets: BasePointerTarget[]) {
  const ids = new Set<string>()

  for (const target of targets) {
    if (target.type === "building") {
      ids.add(target.buildingId)
    }
  }

  return [...ids]
}

export function resolveEditorPreviewSummary(editorState: BaseEditorState) {
  const definition = getDefinitionForTool(editorState.tool, editorState.activeDefinitionId)

  if (!definition) {
    return "选择地形或建筑。"
  }

  if (definition.footprint.kind === "edge") {
    return "贴近网格边缘单击或拖拽。"
  }

  if (definition.footprint.kind === "subcell-area" && definition.footprint.brushable) {
    return "可单击放置，也可拖拽连续刷放。"
  }

  return "单击放置建筑，按 R 旋转。"
}

export function getPointerTooltip(target: BasePointerTarget, layout: BaseLayoutState) {
  if (target.type === "terrain") {
    return {
      title: `地块 (${target.cell.col}, ${target.cell.row})`,
      subtitle: "地形",
    }
  }

  if (target.type === "building") {
    const building = getPlacedBuildingById(layout, target.buildingId)
    const definition = building ? BASE_BUILDING_DEFINITION_MAP.get(building.definitionId) : null

    return {
      title: definition?.label ?? target.buildingId,
      subtitle: definition?.category === "structure" ? "结构" : definition?.category === "furniture" ? "家具" : "设备",
    }
  }

  return {
    title: target.edge.axis === "horizontal" ? "水平边缘" : "垂直边缘",
    subtitle: `(${target.edge.col}, ${target.edge.row})`,
  }
}
