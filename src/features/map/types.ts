import type { Character } from "@/features/character/types"

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

export type NpcSquadTemplate = {
  id: string
  name: string
  members: Character[]
  spawn: WorldPoint
  speed: number
}

export type NpcSquadSnapshot = {
  id: string
  name: string
  members: Character[]
  position: WorldPoint
  moving: boolean
}
