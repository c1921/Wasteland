export type TerrainKind = "grass" | "sand" | "mountain" | "deep-water"

export type QuarterTurn = 0 | 90 | 180 | 270

export type WorldPoint = {
  x: number
  y: number
}

export type CellCoord = {
  col: number
  row: number
}

export type SubcellCoord = {
  subcol: number
  subrow: number
}

export type EdgeCoord = {
  col: number
  row: number
  axis: "horizontal" | "vertical"
}

export type BaseWorldConfig = {
  cols: number
  rows: number
  cellSize: number
  subgridDivisions: number
  width: number
  height: number
  minZoom: number
  maxZoom: number
  defaultZoom: number
}

export type BuildingCategory = "structure" | "furniture" | "equipment"

export type BuildingFootprintDefinition =
  | {
    kind: "edge"
  }
  | {
    kind: "subcell-area"
    widthSubcells: number
    heightSubcells: number
    brushable?: boolean
  }
  | {
    kind: "cell-area"
    widthCells: number
    heightCells: number
  }

export type BuildingDefinition = {
  id: string
  label: string
  category: BuildingCategory
  footprint: BuildingFootprintDefinition
  terrain: {
    allowed: TerrainKind[]
  }
  rotationEnabled: boolean
}

export type ResolvedBuildingFootprint =
  | {
    kind: "edge"
    edge: EdgeCoord
  }
  | {
    kind: "area"
    origin: SubcellCoord
    widthSubcells: number
    heightSubcells: number
  }

export type PlacedBuilding = {
  id: string
  definitionId: string
  rotation: QuarterTurn
  footprint: ResolvedBuildingFootprint
}

export type BaseLayoutState = {
  buildings: PlacedBuilding[]
}

export type PlacementTool =
  | "select"
  | "wall"
  | "door"
  | "window"
  | "furniture"
  | "equipment"
  | "demolish"

export type BaseSelection =
  | {
    type: "terrain"
    cell: CellCoord
  }
  | {
    type: "building"
    buildingId: string
  }

export type BasePointerTarget =
  | {
    type: "terrain"
    cell: CellCoord
  }
  | {
    type: "building"
    buildingId: string
  }
  | {
    type: "edge"
    edge: EdgeCoord
    buildingId: string | null
  }

export type PlacementPreview =
  | {
    tool: PlacementTool
    target: BasePointerTarget | null
    footprint: ResolvedBuildingFootprint | null
    valid: boolean
    action: "select" | "place" | "replace" | "remove" | "blocked"
    message: string
  }
  | null

export type BaseEditorState = {
  tool: PlacementTool
  activeDefinitionId: string | null
  rotation: QuarterTurn
}
