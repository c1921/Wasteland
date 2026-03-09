import { useCallback, useEffect, useRef, useState, type RefObject } from "react"

import {
  createPixiBaseRuntime,
} from "@/engine/runtime/pixi-base-runtime"
import type {
  BaseRuntime,
  BaseTooltipState,
  CreateBaseRuntime,
} from "@/engine/runtime/base-types"
import type {
  BaseEditorState,
  BaseLayoutState,
  BaseSelection,
  BaseWorldConfig,
  BuildingDefinition,
  PlacementPreview,
  TerrainKind,
} from "@/features/base/types"
import {
  isBaseEditorStateEqual,
  isBaseLayoutStateEqual,
  isBaseSelectionEqual,
  isPlacementPreviewEqual,
} from "@/features/base/lib/state-equality"

const STATUS_DURATION_MS = 1800

type UseBaseControllerParams = {
  hostRef: RefObject<HTMLDivElement | null>
  world: BaseWorldConfig
  terrain: readonly TerrainKind[]
  layout: BaseLayoutState
  buildingDefinitions: BuildingDefinition[]
  editorState: BaseEditorState
  onLayoutChange: (layout: BaseLayoutState) => void
  createRuntime?: CreateBaseRuntime
}

export function useBaseController({
  hostRef,
  world,
  terrain,
  layout,
  buildingDefinitions,
  editorState,
  onLayoutChange,
  createRuntime = createPixiBaseRuntime,
}: UseBaseControllerParams) {
  const runtimeRef = useRef<BaseRuntime | null>(null)
  const statusTimerRef = useRef<number | null>(null)
  const onLayoutChangeRef = useRef(onLayoutChange)
  const layoutRef = useRef(layout)
  const editorStateRef = useRef(editorState)
  const selectionRef = useRef<BaseSelection | null>(null)
  const previewRef = useRef<PlacementPreview>(null)
  const [tooltip, setTooltip] = useState<BaseTooltipState | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [zoomPercent, setZoomPercent] = useState<number>(
    Math.round(world.defaultZoom * 100)
  )
  const [selection, setSelection] = useState<BaseSelection | null>(null)
  const [preview, setPreview] = useState<PlacementPreview>(null)

  useEffect(() => {
    onLayoutChangeRef.current = onLayoutChange
  }, [onLayoutChange])

  useEffect(() => {
    if (isBaseLayoutStateEqual(layoutRef.current, layout)) {
      return
    }

    layoutRef.current = layout
    runtimeRef.current?.setLayout(layout)
  }, [layout])

  useEffect(() => {
    if (isBaseEditorStateEqual(editorStateRef.current, editorState)) {
      return
    }

    editorStateRef.current = editorState
    runtimeRef.current?.setEditorState(editorState)
  }, [editorState])

  const clearStatusTimer = useCallback(() => {
    if (statusTimerRef.current !== null) {
      window.clearTimeout(statusTimerRef.current)
      statusTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    const host = hostRef.current

    if (!host) {
      return
    }

    let cancelled = false

    const initialLayout = layoutRef.current
    const initialEditorState = editorStateRef.current

    const mountScene = async () => {
      const runtime = await createRuntime({
        host,
        world,
        terrain,
        layout: initialLayout,
        buildingDefinitions,
        editorState: initialEditorState,
        events: {
          onTooltipChange: (nextTooltip) => {
            if (!cancelled) {
              setTooltip(nextTooltip)
            }
          },
          onStatusMessage: (message) => {
            if (cancelled) {
              return
            }

            clearStatusTimer()
            setStatusMessage(message)
            statusTimerRef.current = window.setTimeout(() => {
              if (!cancelled) {
                setStatusMessage(null)
              }
            }, STATUS_DURATION_MS)
          },
          onZoomPercentChange: (nextZoomPercent) => {
            if (!cancelled) {
              setZoomPercent(nextZoomPercent)
            }
          },
          onSelectionChange: (nextSelection) => {
            if (!cancelled && !isBaseSelectionEqual(selectionRef.current, nextSelection)) {
              selectionRef.current = nextSelection
              setSelection(nextSelection)
            }
          },
          onPreviewChange: (nextPreview) => {
            if (!cancelled && !isPlacementPreviewEqual(previewRef.current, nextPreview)) {
              previewRef.current = nextPreview
              setPreview(nextPreview)
            }
          },
          onLayoutChange: (nextLayout) => {
            if (!cancelled) {
              layoutRef.current = nextLayout
              onLayoutChangeRef.current(nextLayout)
            }
          },
        },
      })

      if (cancelled) {
        runtime.destroy()
        return
      }

      runtimeRef.current = runtime

      if (!isBaseLayoutStateEqual(initialLayout, layoutRef.current)) {
        runtime.setLayout(layoutRef.current)
      }

      if (!isBaseEditorStateEqual(initialEditorState, editorStateRef.current)) {
        runtime.setEditorState(editorStateRef.current)
      }
    }

    void mountScene().catch((error: unknown) => {
      console.error("[PixiBaseCanvas] init failed", error)
    })

    return () => {
      cancelled = true
      clearStatusTimer()
      selectionRef.current = null
      previewRef.current = null
      setTooltip(null)
      setStatusMessage(null)
      setSelection(null)
      setPreview(null)

      const runtime = runtimeRef.current
      runtimeRef.current = null
      runtime?.destroy()
    }
  }, [
    buildingDefinitions,
    clearStatusTimer,
    createRuntime,
    hostRef,
    terrain,
    world,
  ])

  const zoomIn = useCallback(() => {
    runtimeRef.current?.zoomIn()
  }, [])

  const zoomOut = useCallback(() => {
    runtimeRef.current?.zoomOut()
  }, [])

  return {
    tooltip,
    statusMessage,
    zoomPercent,
    selection,
    preview,
    zoomIn,
    zoomOut,
  }
}
