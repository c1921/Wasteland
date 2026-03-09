import type {
  BaseEditorState,
  BaseLayoutState,
  BaseSelection,
  BaseWorldConfig,
  BuildingDefinition,
  PlacementPreview,
  TerrainKind,
} from "@/features/base/types"

export type BaseTooltipState = {
  name: string
  subtitle: string
  left: number
  top: number
}

export type BaseRuntimeEvents = {
  onTooltipChange: (tooltip: BaseTooltipState | null) => void
  onStatusMessage: (message: string) => void
  onZoomPercentChange: (zoomPercent: number) => void
  onSelectionChange: (selection: BaseSelection | null) => void
  onPreviewChange: (preview: PlacementPreview) => void
  onLayoutChange: (layout: BaseLayoutState) => void
}

export type CreateBaseRuntimeParams = {
  host: HTMLDivElement
  world: BaseWorldConfig
  terrain: readonly TerrainKind[]
  layout: BaseLayoutState
  buildingDefinitions: BuildingDefinition[]
  editorState: BaseEditorState
  events: BaseRuntimeEvents
}

export type BaseRuntime = {
  zoomIn: () => void
  zoomOut: () => void
  setLayout: (layout: BaseLayoutState) => void
  setEditorState: (editorState: BaseEditorState) => void
  destroy: () => void
}

export type CreateBaseRuntime = (
  params: CreateBaseRuntimeParams
) => Promise<BaseRuntime>
