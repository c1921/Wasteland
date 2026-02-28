import type {
  MapNode,
  MapObstacle,
  NpcSquadSnapshot,
  NpcSquadTemplate,
  WorldConfig,
} from "@/features/map/types"

export type CameraState = {
  x: number
  y: number
  zoom: number
}

export type DragState = {
  active: boolean
  startX: number
  startY: number
  cameraX: number
  cameraY: number
}

export type MapTooltipState = {
  name: string
  subtitle: string
  left: number
  top: number
}

export type SceneCallbacks = {
  onTooltipChange: (tooltip: MapTooltipState | null) => void
  onStatusMessage: (message: string) => void
  onZoomPercentChange: (zoomPercent: number) => void
  onNodeSelect: (nodeId: string) => void
  onSquadSelect: (squad: NpcSquadSnapshot) => void
}

export type CreatePixiMapSceneParams = {
  host: HTMLDivElement
  world: WorldConfig
  nodes: MapNode[]
  obstacles: MapObstacle[]
  npcSquads?: NpcSquadTemplate[]
  callbacks: SceneCallbacks
  movementTimeScale?: number
}

export type MapSceneController = {
  zoomIn: () => void
  zoomOut: () => void
  setMovementTimeScale: (nextScale: number) => void
  destroy: () => void
}
