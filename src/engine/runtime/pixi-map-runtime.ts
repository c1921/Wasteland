import { createPixiMapScene } from "@/features/map/render/scene/create-scene"
import type {
  CreateMapRuntimeParams,
  MapRuntime,
} from "@/engine/runtime/types"

export async function createPixiMapRuntime({
  events,
  ...params
}: CreateMapRuntimeParams): Promise<MapRuntime> {
  const scene = await createPixiMapScene({
    ...params,
    callbacks: {
      onTooltipChange: events.onTooltipChange,
      onStatusMessage: events.onStatusMessage,
      onZoomPercentChange: events.onZoomPercentChange,
      onNodeSelect: events.onNodeSelect,
      onSquadSelect: events.onSquadSelect,
    },
  })

  return {
    zoomIn: scene.zoomIn,
    zoomOut: scene.zoomOut,
    setMovementTimeScale: scene.setMovementTimeScale,
    destroy: scene.destroy,
  }
}
