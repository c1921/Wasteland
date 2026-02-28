import type {
  MapNode,
  MapObstacle,
  NpcSquadSnapshot,
  NpcSquadTemplate,
  WorldConfig,
} from "@/features/map/types"

export type MapTooltipState = {
  name: string
  subtitle: string
  left: number
  top: number
}

export type MapRuntimeEvents = {
  onTooltipChange: (tooltip: MapTooltipState | null) => void
  onStatusMessage: (message: string) => void
  onZoomPercentChange: (zoomPercent: number) => void
  onNodeSelect: (nodeId: string) => void
  onSquadSelect: (squad: NpcSquadSnapshot) => void
}

export type CreateMapRuntimeParams = {
  host: HTMLDivElement
  world: WorldConfig
  nodes: MapNode[]
  obstacles: MapObstacle[]
  npcSquads?: NpcSquadTemplate[]
  movementTimeScale?: number
  events: MapRuntimeEvents
}

export type MapRuntime = {
  zoomIn: () => void
  zoomOut: () => void
  setMovementTimeScale: (nextScale: number) => void
  destroy: () => void
}

export type CreateMapRuntime = (
  params: CreateMapRuntimeParams
) => Promise<MapRuntime>
