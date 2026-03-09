import type {
  BaseEditorState,
  BaseLayoutState,
  BaseSelection,
  BaseWorldConfig,
  PlacementPreview,
  TerrainKind,
} from "@/features/base/types"

export type CameraState = {
  x: number
  y: number
  zoom: number
}

export type CreatePixiBaseSceneParams = {
  host: HTMLDivElement
  world: BaseWorldConfig
  terrain: readonly TerrainKind[]
  layout: BaseLayoutState
  editorState: BaseEditorState
  callbacks: {
    onTooltipChange: (tooltip: {
      name: string
      subtitle: string
      left: number
      top: number
    } | null) => void
    onStatusMessage: (message: string) => void
    onZoomPercentChange: (zoomPercent: number) => void
    onSelectionChange: (selection: BaseSelection | null) => void
    onPreviewChange: (preview: PlacementPreview) => void
    onLayoutChange: (layout: BaseLayoutState) => void
  }
}

export type BaseSceneController = {
  zoomIn: () => void
  zoomOut: () => void
  setLayout: (layout: BaseLayoutState) => void
  setEditorState: (editorState: BaseEditorState) => void
  destroy: () => void
}
