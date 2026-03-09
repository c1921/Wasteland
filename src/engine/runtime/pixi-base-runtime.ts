import { createPixiBaseScene } from "@/features/base/render/scene/create-scene"
import type {
  BaseRuntime,
  CreateBaseRuntimeParams,
} from "@/engine/runtime/base-types"

export async function createPixiBaseRuntime({
  events,
  buildingDefinitions,
  ...params
}: CreateBaseRuntimeParams): Promise<BaseRuntime> {
  void buildingDefinitions

  const scene = await createPixiBaseScene({
    ...params,
    callbacks: {
      onTooltipChange: events.onTooltipChange,
      onStatusMessage: events.onStatusMessage,
      onZoomPercentChange: events.onZoomPercentChange,
      onSelectionChange: events.onSelectionChange,
      onPreviewChange: events.onPreviewChange,
      onLayoutChange: events.onLayoutChange,
    },
  })

  return {
    zoomIn: scene.zoomIn,
    zoomOut: scene.zoomOut,
    setLayout: scene.setLayout,
    setEditorState: scene.setEditorState,
    destroy: scene.destroy,
  }
}
