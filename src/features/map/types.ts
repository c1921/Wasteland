export type MapNodeKind = "settlement" | "ruin" | "outpost" | "hazard"

export type WorldPoint = {
  x: number
  y: number
}

export type MapNode = {
  id: string
  name: string
  x: number
  y: number
  kind: MapNodeKind
}

export type WorldConfig = {
  width: number
  height: number
  minZoom: number
  maxZoom: number
  defaultZoom: number
  gridSize: number
}

export type MapObstacle = {
  id: string
  name: string
  polygon: WorldPoint[]
}
