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

export const NODE_STYLE_MAP: Record<
  MapNodeKind,
  { glow: number; ring: number; core: number }
> = {
  settlement: { glow: 0xe2bf83, ring: 0xe7cea0, core: 0xf8f0df },
  ruin: { glow: 0x8a939c, ring: 0xa2acb6, core: 0xd5dbe1 },
  outpost: { glow: 0x5998a3, ring: 0x7db7c0, core: 0xcde6ea },
  hazard: { glow: 0xbc684f, ring: 0xd88667, core: 0xf3b690 },
}
