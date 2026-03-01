import type { MapNodeKind } from "@/features/map/types"

export const PLAYER_SPEED = 180
export const ZOOM_STEP = 0.12
export const TOOLTIP_WIDTH = 170
export const TOOLTIP_HEIGHT = 54
export const NPC_SQUAD_COUNT_MIN = 3
export const NPC_SQUAD_COUNT_MAX = 6
export const NPC_SQUAD_MEMBER_MIN = 2
export const NPC_SQUAD_MEMBER_MAX = 5
export const NPC_SQUAD_SPEED_MIN = 120
export const NPC_SQUAD_SPEED_MAX = 170
export const NPC_SQUAD_IDLE_MIN_MS = 5_000
export const NPC_SQUAD_IDLE_MAX_MS = 20_000
export const NPC_SQUAD_SPAWN_ATTEMPTS = 40
export const NPC_SQUAD_PATHFIND_ATTEMPTS = 25

export const NODE_KIND_LABEL: Record<MapNodeKind, string> = {
  settlement: "聚落",
  ruin: "废墟",
  outpost: "哨站",
  hazard: "危险区",
}

const UNIFIED_NODE_STYLE = {
  glow: 0xe2bf83,
  ring: 0xe7cea0,
  core: 0xf8f0df,
}

export const NODE_STYLE_MAP: Record<
  MapNodeKind,
  { glow: number; ring: number; core: number }
> = {
  settlement: UNIFIED_NODE_STYLE,
  ruin: UNIFIED_NODE_STYLE,
  outpost: UNIFIED_NODE_STYLE,
  hazard: UNIFIED_NODE_STYLE,
}
