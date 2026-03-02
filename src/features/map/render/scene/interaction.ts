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

const LONG_PRESS_MS = 420
const MOVE_CANCEL_THRESHOLD_PX = 10

type ZoomContext = {
  camera: CameraState
  world: WorldConfig
  getViewportSize: () => { width: number; height: number }
  syncCamera: () => void
  onZoomPercentChange: (zoomPercent: number) => void
}

type PointerSample = {
  x: number
  y: number
}

function isTouchLike(pointerType: string) {
  return pointerType === "touch" || pointerType === "pen"
}

function getPointerDistance(first: PointerSample, second: PointerSample) {
  return Math.hypot(first.x - second.x, first.y - second.y)
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
  getViewportSize,
  onZoomPercentChange,
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
  getViewportSize: () => { width: number; height: number }
  onZoomPercentChange: (zoomPercent: number) => void
}) {
  const activePointers = new Map<number, PointerSample>()
  let primaryPointerId: number | null = null
  let longPressTimer: ReturnType<typeof setTimeout> | null = null
  let longPressTriggered = false
  let downX = 0
  let downY = 0
  let pinching = false
  let lastPinchDistance: number | null = null

  const clearLongPressTimer = () => {
    if (longPressTimer !== null) {
      clearTimeout(longPressTimer)
      longPressTimer = null
    }
  }

  const clearTouchState = () => {
    clearLongPressTimer()
    activePointers.clear()
    primaryPointerId = null
    longPressTriggered = false
    pinching = false
    lastPinchDistance = null
    drag.active = false
  }

  const updateCameraFromDrag = (screenX: number, screenY: number) => {
    camera.x = drag.cameraX + (screenX - drag.startX)
    camera.y = drag.cameraY + (screenY - drag.startY)
    syncCamera()
  }

  const getPinchPoints = (): [PointerSample, PointerSample] | null => {
    const values = [...activePointers.values()]

    if (values.length < 2) {
      return null
    }

    return [values[0], values[1]]
  }

  const updatePinch = () => {
    const points = getPinchPoints()

    if (!points) {
      return
    }

    const [first, second] = points
    const distance = getPointerDistance(first, second)

    if (!Number.isFinite(distance) || distance <= 0) {
      return
    }

    if (lastPinchDistance === null) {
      lastPinchDistance = distance
      return
    }

    const factor = distance / lastPinchDistance
    lastPinchDistance = distance

    if (!Number.isFinite(factor) || Math.abs(factor - 1) < 0.005) {
      return
    }

    zoomAtPoint({
      camera,
      world,
      getViewportSize,
      syncCamera,
      onZoomPercentChange,
      screenX: (first.x + second.x) / 2,
      screenY: (first.y + second.y) / 2,
      nextZoom: camera.zoom * factor,
    })
  }

  const beginSingleTouch = (event: FederatedPointerEvent) => {
    primaryPointerId = event.pointerId
    downX = event.global.x
    downY = event.global.y
    longPressTriggered = false
    pinching = false
    lastPinchDistance = null
    drag.active = false
    drag.startX = downX
    drag.startY = downY
    drag.cameraX = camera.x
    drag.cameraY = camera.y
    clearLongPressTimer()

    longPressTimer = setTimeout(() => {
      if (primaryPointerId !== event.pointerId || pinching || drag.active || longPressTriggered) {
        return
      }

      const pointer = activePointers.get(event.pointerId)

      if (!pointer) {
        return
      }

      longPressTriggered = true
      beginPathTo({
        camera,
        world,
        navigationGrid,
        player,
        drawPath,
        onStatusMessage,
        screenX: pointer.x,
        screenY: pointer.y,
      })
    }, LONG_PRESS_MS)
  }

  const transitionToPinch = () => {
    clearLongPressTimer()
    longPressTriggered = false
    pinching = true
    drag.active = false
    const points = getPinchPoints()
    lastPinchDistance = points ? getPointerDistance(points[0], points[1]) : null
  }

  const onTouchPointerDown = (event: FederatedPointerEvent) => {
    activePointers.set(event.pointerId, { x: event.global.x, y: event.global.y })
    onTooltipHide()

    if (activePointers.size === 1) {
      beginSingleTouch(event)
      return
    }

    transitionToPinch()
  }

  const onTouchPointerMove = (event: FederatedPointerEvent) => {
    if (!activePointers.has(event.pointerId)) {
      return
    }

    activePointers.set(event.pointerId, { x: event.global.x, y: event.global.y })

    if (activePointers.size >= 2 || pinching) {
      if (!pinching) {
        transitionToPinch()
      }

      updatePinch()
      return
    }

    if (longPressTriggered) {
      return
    }

    const deltaX = event.global.x - downX
    const deltaY = event.global.y - downY
    const movedEnough = Math.hypot(deltaX, deltaY) > MOVE_CANCEL_THRESHOLD_PX

    if (!drag.active && movedEnough) {
      clearLongPressTimer()
      drag.active = true
      drag.startX = downX
      drag.startY = downY
      drag.cameraX = camera.x
      drag.cameraY = camera.y
    }

    if (!drag.active) {
      return
    }

    updateCameraFromDrag(event.global.x, event.global.y)
  }

  const onTouchPointerEnd = (event: FederatedPointerEvent) => {
    activePointers.delete(event.pointerId)

    if (primaryPointerId === event.pointerId) {
      clearLongPressTimer()
      primaryPointerId = null
    }

    if (activePointers.size === 0) {
      clearTouchState()
      return
    }

    if (activePointers.size >= 2) {
      transitionToPinch()
      return
    }

    const remaining = activePointers.entries().next().value

    if (!remaining) {
      clearTouchState()
      return
    }

    const [pointerId, pointer] = remaining
    primaryPointerId = pointerId
    downX = pointer.x
    downY = pointer.y
    longPressTriggered = false
    pinching = false
    lastPinchDistance = null
    drag.active = false
    drag.startX = downX
    drag.startY = downY
    drag.cameraX = camera.x
    drag.cameraY = camera.y
  }

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

    if (event.pointerType === "mouse") {
      if (event.button !== 0) {
        return
      }

      drag.active = true
      drag.startX = event.global.x
      drag.startY = event.global.y
      drag.cameraX = camera.x
      drag.cameraY = camera.y
      onTooltipHide()
      return
    }

    if (!isTouchLike(event.pointerType)) {
      return
    }

    onTouchPointerDown(event)
  }

  const onPointerMove = (event: FederatedPointerEvent) => {
    if (event.pointerType === "mouse") {
      if (!drag.active) {
        return
      }

      updateCameraFromDrag(event.global.x, event.global.y)
      return
    }

    if (!isTouchLike(event.pointerType)) {
      return
    }

    onTouchPointerMove(event)
  }

  const onPointerUp = (event: FederatedPointerEvent) => {
    if (event.pointerType === "mouse") {
      drag.active = false
      return
    }

    if (!isTouchLike(event.pointerType)) {
      return
    }

    onTouchPointerEnd(event)
  }

  const onPointerCancel = (event: FederatedPointerEvent) => {
    if (event.pointerType === "mouse") {
      drag.active = false
      return
    }

    if (!isTouchLike(event.pointerType)) {
      return
    }

    onTouchPointerEnd(event)
  }

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
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
