import type { NavItem, NavKey } from "@/app/navigation/types"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type SidebarNavProps = {
  items: NavItem[]
  activeNav: NavKey
  onChange: (next: NavKey) => void
}

export function SidebarNav({ items, activeNav, onChange }: SidebarNavProps) {
  const topItems = items.filter((item) => item.dock !== "bottom")
  const bottomItems = items.filter((item) => item.dock === "bottom")

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-14 flex-col border-r bg-sidebar text-sidebar-foreground">
      <nav className="flex flex-1 flex-col justify-between pt-11 pb-3">
        <div className="flex flex-col items-center gap-2">
          {topItems.map((item) => {
            const Icon = item.icon
            const isActive = activeNav === item.key

            return (
              <Button
                key={item.key}
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  "size-9 rounded-lg border border-transparent text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  isActive &&
                    "border-sidebar-border bg-sidebar-accent text-sidebar-accent-foreground"
                )}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
                title={item.label}
                onClick={() => onChange(item.key)}
              >
                <Icon className="size-4" aria-hidden="true" />
              </Button>
            )
          })}
        </div>
        <div className="flex flex-col items-center gap-2">
          {bottomItems.map((item) => {
            const Icon = item.icon
            const isActive = activeNav === item.key

            return (
              <Button
                key={item.key}
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  "size-9 rounded-lg border border-transparent text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  isActive &&
                    "border-sidebar-border bg-sidebar-accent text-sidebar-accent-foreground"
                )}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
                title={item.label}
                onClick={() => onChange(item.key)}
              >
                <Icon className="size-4" aria-hidden="true" />
              </Button>
            )
          })}
        </div>
      </nav>
    </aside>
  )
}
