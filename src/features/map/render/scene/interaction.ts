import type { FederatedPointerEvent } from "pixi.js"

import { ZOOM_STEP } from "@/features/map/constants"
import type { PathMover } from "@/features/map/lib/movement"
import {
  findPathAStar,
  isPointBlocked,
  type NavigationGrid,
} from "@/features/map/lib/pathfinding"
import { toWorldPoint, zoomCameraAtPoint } from "@/features/map/render/scene/camera"
import type { CameraState, DragState } from "@/features/map/render/scene/types"
import type { WorldConfig, WorldPoint } from "@/features/map/types"

type ZoomContext = {
  camera: CameraState
  world: WorldConfig
  getViewportSize: () => { width: number; height: number }
  syncCamera: () => void
  onZoomPercentChange: (zoomPercent: number) => void
}

function zoomAtPoint({
  camera,
  world,
  getViewportSize,
  syncCamera,
  onZoomPercentChange,
  screenX,
  screenY,
  nextZoom,
}: ZoomContext & {
  screenX: number
  screenY: number
  nextZoom: number
}) {
  const { width, height } = getViewportSize()
  const changed = zoomCameraAtPoint({
    camera,
    world,
    viewportWidth: width,
    viewportHeight: height,
    screenX,
    screenY,
    nextZoom,
  })

  if (!changed) {
    return
  }

  syncCamera()
  onZoomPercentChange(Math.round(camera.zoom * 100))
}

function beginPathTo({
  camera,
  world,
  navigationGrid,
  player,
  drawPath,
  onStatusMessage,
  screenX,
  screenY,
}: {
  camera: CameraState
  world: WorldConfig
  navigationGrid: NavigationGrid
  player: PathMover
  drawPath: (points: WorldPoint[]) => void
  onStatusMessage: (message: string) => void
  screenX: number
  screenY: number
}) {
  const target = toWorldPoint(camera, world, screenX, screenY)

  if (isPointBlocked(navigationGrid, target)) {
    player.moving = false
    player.path = []
    drawPath([])
    onStatusMessage("目标不可达：不可通行区域")
    return
  }

  const path = findPathAStar(navigationGrid, { x: player.x, y: player.y }, target)

  if (!path || path.length < 2) {
    player.moving = false
    player.path = []
    drawPath([])
    onStatusMessage("目标不可达：未找到有效路径")
    return
  }

  player.path = path.slice(1)
  player.moving = true
  drawPath([{ x: player.x, y: player.y }, ...player.path])
}

export function createPointerHandlers({
  camera,
  drag,
  world,
  navigationGrid,
  player,
  drawPath,
  onTooltipHide,
  onStatusMessage,
  syncCamera,
}: {
  camera: CameraState
  drag: DragState
  world: WorldConfig
  navigationGrid: NavigationGrid
  player: PathMover
  drawPath: (points: WorldPoint[]) => void
  onTooltipHide: () => void
  onStatusMessage: (message: string) => void
  syncCamera: () => void
}) {
  const onPointerDown = (event: FederatedPointerEvent) => {
    if (event.pointerType === "mouse" && event.button === 2) {
      beginPathTo({
        camera,
        world,
        navigationGrid,
        player,
        drawPath,
        onStatusMessage,
        screenX: event.global.x,
        screenY: event.global.y,
      })
      return
    }

    if (event.pointerType === "mouse" && event.button !== 0) {
      return
    }

    drag.active = true
    drag.startX = event.global.x
    drag.startY = event.global.y
    drag.cameraX = camera.x
    drag.cameraY = camera.y
    onTooltipHide()
  }

  const onPointerMove = (event: FederatedPointerEvent) => {
    if (!drag.active) {
      return
    }

    camera.x = drag.cameraX + (event.global.x - drag.startX)
    camera.y = drag.cameraY + (event.global.y - drag.startY)
    syncCamera()
  }

  const onPointerUp = () => {
    drag.active = false
  }

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
  }
}

export function createWheelHandler({
  camera,
  world,
  canvas,
  getViewportSize,
  syncCamera,
  onZoomPercentChange,
}: ZoomContext & {
  canvas: HTMLCanvasElement
}) {
  return (event: WheelEvent) => {
    event.preventDefault()

    const rect = canvas.getBoundingClientRect()
    const screenX = event.clientX - rect.left
    const screenY = event.clientY - rect.top
    const factor = event.deltaY > 0 ? 1 - ZOOM_STEP : 1 + ZOOM_STEP

    zoomAtPoint({
      camera,
      world,
      getViewportSize,
      syncCamera,
      onZoomPercentChange,
      screenX,
      screenY,
      nextZoom: camera.zoom * factor,
    })
  }
}

export function zoomInByStep(context: ZoomContext) {
  const { width, height } = context.getViewportSize()

  zoomAtPoint({
    ...context,
    screenX: width / 2,
    screenY: height / 2,
    nextZoom: context.camera.zoom * (1 + ZOOM_STEP),
  })
}

export function zoomOutByStep(context: ZoomContext) {
  const { width, height } = context.getViewportSize()

  zoomAtPoint({
    ...context,
    screenX: width / 2,
    screenY: height / 2,
    nextZoom: context.camera.zoom * (1 - ZOOM_STEP),
  })
}
