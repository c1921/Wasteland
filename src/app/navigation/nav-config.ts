import {
  Bell,
  Building2,
  Crosshair,
  HandCoins,
  Map,
  Package,
  Settings,
  Users,
} from "lucide-react"

import type { NavItem, NavKey } from "@/app/navigation/types"

export const NAV_ITEMS: NavItem[] = [
  { key: "map", label: "地图", icon: Map, dock: "top" },
  { key: "team", label: "队伍", icon: Users, dock: "top" },
  { key: "events", label: "事件", icon: Bell, dock: "top" },
  { key: "base", label: "基地", icon: Building2, dock: "top" },
  { key: "battle", label: "战斗", icon: Crosshair, dock: "top" },
  { key: "items", label: "物品", icon: Package, dock: "top" },
  { key: "trade", label: "交易", icon: HandCoins, dock: "top" },
  { key: "settings", label: "设置", icon: Settings, dock: "bottom" },
]

export const NAV_TITLE_MAP: Record<NavKey, string> = {
  map: "地图",
  team: "队伍",
  events: "事件",
  base: "基地",
  battle: "战斗",
  items: "物品",
  trade: "交易",
  settings: "设置",
}
