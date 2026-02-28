import { useCallback, useEffect, useRef, useState, type RefObject } from "react"

import {
  createPixiMapScene,
  type MapSceneController,
  type MapTooltipState,
} from "@/features/map/render/pixi-scene"
import type { MapNode, MapObstacle, WorldConfig } from "@/features/map/types"

type UseMapControllerParams = {
  hostRef: RefObject<HTMLDivElement | null>
  world: WorldConfig
  nodes: MapNode[]
  obstacles: MapObstacle[]
  onNodeSelect?: (nodeId: string) => void
}

const STATUS_DURATION_MS = 1800

export function useMapController({
  hostRef,
  world,
  nodes,
  obstacles,
  onNodeSelect,
}: UseMapControllerParams) {
  const sceneRef = useRef<MapSceneController | null>(null)
  const statusTimerRef = useRef<number | null>(null)
  const onNodeSelectRef = useRef<typeof onNodeSelect>(onNodeSelect)
  const [tooltip, setTooltip] = useState<MapTooltipState | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [zoomPercent, setZoomPercent] = useState<number>(
    Math.round(world.defaultZoom * 100)
  )

  useEffect(() => {
    onNodeSelectRef.current = onNodeSelect
  }, [onNodeSelect])

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

    const mountScene = async () => {
      const scene = await createPixiMapScene({
        host,
        world,
        nodes,
        obstacles,
        callbacks: {
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
          onNodeSelect: (nodeId) => {
            if (!cancelled) {
              onNodeSelectRef.current?.(nodeId)
            }
          },
        },
      })

      if (cancelled) {
        scene.destroy()
        return
      }

      sceneRef.current = scene
    }

    void mountScene().catch((error: unknown) => {
      console.error("[PixiMapCanvas] init failed", error)
    })

    return () => {
      cancelled = true
      clearStatusTimer()
      setTooltip(null)
      setStatusMessage(null)

      const scene = sceneRef.current
      sceneRef.current = null
      scene?.destroy()
    }
  }, [clearStatusTimer, hostRef, nodes, obstacles, world])

  const zoomIn = useCallback(() => {
    sceneRef.current?.zoomIn()
  }, [])

  const zoomOut = useCallback(() => {
    sceneRef.current?.zoomOut()
  }, [])

  return {
    tooltip,
    statusMessage,
    zoomPercent,
    zoomIn,
    zoomOut,
  }
}
