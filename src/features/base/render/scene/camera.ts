import type { Container } from "pixi.js"

import type { BaseWorldConfig, WorldPoint } from "@/features/base/types"
import type { CameraState } from "@/features/base/render/scene/types"

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function applyCamera(container: Container, camera: CameraState) {
  container.position.set(camera.x, camera.y)
  container.scale.set(camera.zoom)
}

export function clampCamera(
  camera: CameraState,
  viewportWidth: number,
  viewportHeight: number,
  world: BaseWorldConfig
) {
  const scaledWidth = world.width * camera.zoom
  const scaledHeight = world.height * camera.zoom

  if (scaledWidth <= viewportWidth) {
    camera.x = (viewportWidth - scaledWidth) / 2
  } else {
    camera.x = clamp(camera.x, viewportWidth - scaledWidth, 0)
  }

  if (scaledHeight <= viewportHeight) {
    camera.y = (viewportHeight - scaledHeight) / 2
  } else {
    camera.y = clamp(camera.y, viewportHeight - scaledHeight, 0)
  }
}

export function toWorldPoint(camera: CameraState, screenX: number, screenY: number): WorldPoint {
  return {
    x: (screenX - camera.x) / camera.zoom,
    y: (screenY - camera.y) / camera.zoom,
  }
}

export function zoomCameraAtPoint(params: {
  camera: CameraState
  world: BaseWorldConfig
  viewportWidth: number
  viewportHeight: number
  screenX: number
  screenY: number
  nextZoom: number
}) {
  const {
    camera,
    world,
    viewportWidth,
    viewportHeight,
    screenX,
    screenY,
    nextZoom,
  } = params
  const clampedZoom = clamp(nextZoom, world.minZoom, world.maxZoom)

  if (Math.abs(clampedZoom - camera.zoom) < 0.0001) {
    return false
  }

  const worldPointBeforeZoom = toWorldPoint(camera, screenX, screenY)
  camera.zoom = clampedZoom
  camera.x = screenX - worldPointBeforeZoom.x * camera.zoom
  camera.y = screenY - worldPointBeforeZoom.y * camera.zoom
  clampCamera(camera, viewportWidth, viewportHeight, world)
  return true
}
