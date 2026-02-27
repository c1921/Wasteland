import { useRef } from "react"
import { Minus, Plus } from "lucide-react"

import { NODE_KIND_LABEL } from "@/features/map/constants"
import { useMapController } from "@/features/map/hooks/use-map-controller"
import type { MapNode, MapObstacle, WorldConfig } from "@/features/map/types"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type PixiMapCanvasProps = {
  world: WorldConfig
  nodes: MapNode[]
  obstacles: MapObstacle[]
  className?: string
}

export function PixiMapCanvas({
  world,
  nodes,
  obstacles,
  className,
}: PixiMapCanvasProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const { tooltip, statusMessage, zoomPercent, zoomIn, zoomOut } = useMapController({
    hostRef,
    world,
    nodes,
    obstacles,
  })

  return (
    <div
      ref={hostRef}
      className={cn(
        "relative w-full touch-none overflow-hidden rounded-md border border-white/10 bg-background select-none",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-20 bg-gradient-to-t from-black/35 to-transparent" />
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
      <p className="pointer-events-none absolute left-3 bottom-2 z-20 text-[11px] text-slate-300/85">
        左键拖拽地图 · 右键点击自动寻路 · 滚轮缩放
      </p>
      {tooltip ? (
        <div
          className="pointer-events-none absolute z-30 w-[170px] rounded-md border border-white/15 bg-[#181d23]/95 px-3 py-2 text-[11px] leading-tight text-[#d7dbdf] shadow-[0_8px_24px_rgba(0,0,0,0.42)]"
          style={{ left: tooltip.left, top: tooltip.top }}
        >
          <p className="font-medium tracking-wide">{tooltip.name}</p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.08em] text-[#99a4ad]">
            {NODE_KIND_LABEL[tooltip.kind]}
          </p>
        </div>
      ) : null}
    </div>
  )
}
