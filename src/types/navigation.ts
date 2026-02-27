import type { LucideIcon } from "lucide-react"
import {
  Bell,
  Building2,
  Crosshair,
  Map,
  Package,
  Settings,
  Users,
} from "lucide-react"

export type NavKey =
  | "map"
  | "team"
  | "events"
  | "base"
  | "battle"
  | "items"
  | "settings"

export type NavItem = {
  key: NavKey
  label: string
  icon: LucideIcon
  dock?: "top" | "bottom"
}

export const NAV_ITEMS: NavItem[] = [
  { key: "map", label: "地图", icon: Map, dock: "top" },
  { key: "team", label: "队伍", icon: Users, dock: "top" },
  { key: "events", label: "事件", icon: Bell, dock: "top" },
  { key: "base", label: "基地", icon: Building2, dock: "top" },
  { key: "battle", label: "战斗", icon: Crosshair, dock: "top" },
  { key: "items", label: "物品", icon: Package, dock: "top" },
  { key: "settings", label: "设置", icon: Settings, dock: "bottom" },
]
