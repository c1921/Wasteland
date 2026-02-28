import type { LucideIcon } from "lucide-react"

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
