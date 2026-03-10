import type { PlacementTool } from "@/features/base/types"

export const BASE_TOOL_LABEL: Record<PlacementTool, string> = {
  select: "选择",
  wall: "墙体",
  door: "门",
  window: "窗",
  furniture: "家具",
  equipment: "设备",
  demolish: "拆除",
}

export const BASE_TOOL_ORDER: PlacementTool[] = [
  "select",
  "wall",
  "door",
  "window",
  "furniture",
  "equipment",
  "demolish",
]

export const BASE_STRUCTURE_TOOL_DEFINITION_ID: Record<
  Extract<PlacementTool, "wall" | "door" | "window">,
  string
> = {
  wall: "wall",
  door: "door",
  window: "window",
}

export const BASE_FURNITURE_DEFINITION_IDS = ["bed", "table", "crate"] as const
export const BASE_EQUIPMENT_DEFINITION_IDS = ["workbench", "console"] as const

export const DEFAULT_FURNITURE_DEFINITION_ID = BASE_FURNITURE_DEFINITION_IDS[0]
export const DEFAULT_EQUIPMENT_DEFINITION_ID = BASE_EQUIPMENT_DEFINITION_IDS[0]

export const BASE_CELL_EDGE_SNAP_PX = 7
export const BASE_CAMERA_KEYBOARD_PAN_SPEED = 720
