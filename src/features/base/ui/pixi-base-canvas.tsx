import { useEffect, useRef, useState } from "react"
import { Minus, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useBaseController } from "@/features/base/hooks/use-base-controller"
import type {
  BaseEditorState,
  BaseLayoutState,
  BaseSelection,
  BaseWorldConfig,
  BuildingDefinition,
  PlacementPreview,
  TerrainKind,
} from "@/features/base/types"
import { cn } from "@/lib/utils"

type PixiBaseCanvasProps = {
  world: BaseWorldConfig
  terrain: readonly TerrainKind[]
  layout: BaseLayoutState
  buildingDefinitions: BuildingDefinition[]
  editorState: BaseEditorState
  onLayoutChange: (layout: BaseLayoutState) => void
  onSelectionChange?: (selection: BaseSelection | null) => void
  onPreviewChange?: (preview: PlacementPreview) => void
  className?: string
}

export function PixiBaseCanvas({
  world,
  terrain,
  layout,
  buildingDefinitions,
  editorState,
  onLayoutChange,
  onSelectionChange,
  onPreviewChange,
  className,
}: PixiBaseCanvasProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [isCoarsePointer, setIsCoarsePointer] = useState(false)
  const {
    tooltip,
    statusMessage,
    zoomPercent,
    selection,
    preview,
    zoomIn,
    zoomOut,
  } = useBaseController({
    hostRef,
    world,
    terrain,
    layout,
    buildingDefinitions,
    editorState,
    onLayoutChange,
  })

  useEffect(() => {
    onSelectionChange?.(selection)
  }, [onSelectionChange, selection])

  useEffect(() => {
    onPreviewChange?.(preview)
  }, [onPreviewChange, preview])

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return
    }

    const mediaQuery = window.matchMedia("(pointer: coarse)")
    const sync = () => {
      setIsCoarsePointer(mediaQuery.matches)
    }

    sync()

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", sync)
      return () => {
        mediaQuery.removeEventListener("change", sync)
      }
    }

    mediaQuery.addListener(sync)
    return () => {
      mediaQuery.removeListener(sync)
    }
  }, [])

  return (
    <div
      ref={hostRef}
      tabIndex={0}
      className={cn(
        "relative h-full w-full overflow-hidden rounded-xl border border-white/10 bg-[#10141a] shadow-[0_18px_40px_rgba(0,0,0,0.28)] outline-none",
        "focus-visible:ring-2 focus-visible:ring-[#96dcea]/55",
        className
      )}
    >
      <div className="absolute top-3 right-3 z-20 flex items-center gap-2 rounded-md border border-border/70 bg-card/92 px-2 py-1">
        <Button size="icon-xs" variant="outline" onClick={zoomOut} aria-label="缩小基地">
          <Minus />
        </Button>
        <span className="w-12 text-center text-[11px] font-medium tracking-wide">
          {zoomPercent}%
        </span>
        <Button size="icon-xs" variant="outline" onClick={zoomIn} aria-label="放大基地">
          <Plus />
        </Button>
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 z-20 rounded-md border border-white/15 bg-[#182028]/86 px-2.5 py-1 text-[10px] tracking-wide text-[#c8d2dc]">
        {isCoarsePointer
          ? "单指建造或选择 · 双指平移/缩放"
          : "左键建造/选择 · 滚轮缩放 · WASD平移"}
      </div>
      {statusMessage ? (
        <div className="pointer-events-none absolute top-3 left-3 z-20 rounded-md border border-[#d28b74]/40 bg-[#2a1d1b]/90 px-2.5 py-1.5 text-[11px] text-[#f1c8b9] shadow-[0_8px_20px_rgba(0,0,0,0.34)]">
          {statusMessage}
        </div>
      ) : null}
      {tooltip ? (
        <div
          className="pointer-events-none absolute z-30 w-[180px] rounded-md border border-white/15 bg-[#181d23]/95 px-3 py-2 text-[11px] leading-tight text-[#d7dbdf] shadow-[0_8px_24px_rgba(0,0,0,0.42)]"
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
