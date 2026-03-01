import { useRef } from "react"
import { Minus, Plus } from "lucide-react"

import { useMapController } from "@/features/map/hooks/use-map-controller"
import type {
  MapNode,
  MapObstacle,
  NpcSquadSnapshot,
  NpcSquadTemplate,
  WorldConfig,
} from "@/features/map/types"
import { useGameClock } from "@/features/time/game-clock-store"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type PixiMapCanvasProps = {
  world: WorldConfig
  nodes: MapNode[]
  obstacles: MapObstacle[]
  npcSquads?: NpcSquadTemplate[]
  onNodeSelect?: (nodeId: string) => void
  onSquadSelect?: (squad: NpcSquadSnapshot) => void
  className?: string
}

export function PixiMapCanvas({
  world,
  nodes,
  obstacles,
  npcSquads,
  onNodeSelect,
  onSquadSelect,
  className,
}: PixiMapCanvasProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const { speed, isPaused = false } = useGameClock()
  const { tooltip, statusMessage, zoomPercent, zoomIn, zoomOut } = useMapController({
    hostRef,
    world,
    nodes,
    obstacles,
    npcSquads,
    movementTimeScale: isPaused ? 0 : speed,
    onNodeSelect,
    onSquadSelect,
  })

  return (
    <div
      ref={hostRef}
      className={cn(
        "relative w-full touch-none overflow-hidden rounded-md border border-white/10 bg-background select-none",
        className
      )}
    >
      <div className="absolute top-3 right-3 z-20 flex items-center gap-2 rounded-md border border-border bg-card/90 px-2 py-1">
        <Button
          size="icon-xs"
          variant="outline"
          onClick={zoomOut}
          aria-label="缩小地图"
        >
          <Minus />
        </Button>
        <span className="text-foreground w-12 text-center text-[11px] font-medium tracking-wide">
          {zoomPercent}%
        </span>
        <Button
          size="icon-xs"
          variant="outline"
          onClick={zoomIn}
          aria-label="放大地图"
        >
          <Plus />
        </Button>
      </div>
      {statusMessage ? (
        <div className="pointer-events-none absolute top-3 left-3 z-20 rounded-md border border-[#d28b74]/40 bg-[#2a1d1b]/90 px-2.5 py-1.5 text-[11px] text-[#f1c8b9] shadow-[0_8px_20px_rgba(0,0,0,0.34)]">
          {statusMessage}
        </div>
      ) : null}
      {tooltip ? (
        <div
          className="pointer-events-none absolute z-30 w-[170px] rounded-md border border-white/15 bg-[#181d23]/95 px-3 py-2 text-[11px] leading-tight text-[#d7dbdf] shadow-[0_8px_24px_rgba(0,0,0,0.42)]"
          style={{ left: tooltip.left, top: tooltip.top }}
        >
          <p className="font-medium tracking-wide">{tooltip.name}</p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.08em] text-[#99a4ad]">
            {tooltip.subtitle}
          </p>
        </div>
      ) : null}
    </div>
  )
}
