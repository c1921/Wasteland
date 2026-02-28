export {
  WASTELAND_MAP_NODES,
  WASTELAND_MAP_OBSTACLES,
  WASTELAND_WORLD_CONFIG,
} from "@/features/map/data/wasteland-map"
export { advancePathMover, composeFinalSpeedBeforeTime } from "@/features/map/lib/movement"
export {
  assignRandomPathToNpcSquad,
  createNpcSquadRuntimes,
  createNpcSquadTemplates,
  tickNpcSquad,
  toNpcSquadSnapshot,
} from "@/features/map/lib/npc-squads"
export { buildNavigationGrid, findPathAStar, isPointBlocked } from "@/features/map/lib/pathfinding"
export { PixiMapCanvas } from "@/features/map/ui/pixi-map-canvas"
export { MapPanel } from "@/features/map/ui/map-panel"
export type { MovementStepResult, PathMover } from "@/features/map/lib/movement"
export type { NpcSquadRuntime, TickNpcSquadResult } from "@/features/map/lib/npc-squads"
export type { NavigationGrid } from "@/features/map/lib/pathfinding"
export type {
  MapNode,
  MapNodeKind,
  MapObstacle,
  NpcSquadSnapshot,
  NpcSquadTemplate,
  WorldConfig,
  WorldPoint,
} from "@/features/map/types"
