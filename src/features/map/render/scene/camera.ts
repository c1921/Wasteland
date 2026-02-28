import type { Container } from "pixi.js"

import { clamp } from "@/features/map/lib/math"
import type { WorldConfig, WorldPoint } from "@/features/map/types"
import type { CameraState } from "@/features/map/render/scene/types"

export function toWorldPoint(
  camera: CameraState,
  world: WorldConfig,
  screenX: number,
  screenY: number
): WorldPoint {
  const x = (screenX - camera.x) / camera.zoom
  const y = (screenY - camera.y) / camera.zoom

  return {
    x: clamp(x, 0, world.width - 0.001),
    y: clamp(y, 0, world.height - 0.001),
  }
}

export function clampCamera(
  camera: CameraState,
  viewportWidth: number,
  viewportHeight: number,
  world: WorldConfig
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

export function applyCamera(worldContainer: Container, camera: CameraState) {
  worldContainer.scale.set(camera.zoom)
  worldContainer.position.set(camera.x, camera.y)
}

export function zoomCameraAtPoint({
  camera,
  world,
  viewportWidth,
  viewportHeight,
  screenX,
  screenY,
  nextZoom,
}: {
  camera: CameraState
  world: WorldConfig
  viewportWidth: number
  viewportHeight: number
  screenX: number
  screenY: number
  nextZoom: number
}) {
  const clampedZoom = clamp(nextZoom, world.minZoom, world.maxZoom)

  if (Math.abs(clampedZoom - camera.zoom) < 0.001) {
    return false
  }

  const anchorWorldX = (screenX - camera.x) / camera.zoom
  const anchorWorldY = (screenY - camera.y) / camera.zoom

  camera.zoom = clampedZoom
  camera.x = screenX - anchorWorldX * camera.zoom
  camera.y = screenY - anchorWorldY * camera.zoom
  clampCamera(camera, viewportWidth, viewportHeight, world)
  return true
}
