import { useEffect, useRef, useState } from "react"
import { Minus, Plus } from "lucide-react"
import {
  Application,
  Circle,
  Container,
  Graphics,
  Rectangle,
  type FederatedPointerEvent,
} from "pixi.js"

import { Button } from "@/components/ui/button"
import {
  buildNavigationGrid,
  findPathAStar,
  isPointBlocked,
} from "@/components/panels/map-pathfinding"
import {
  type MapNode,
  type MapNodeKind,
  type MapObstacle,
  type WorldConfig,
  type WorldPoint,
} from "@/components/panels/map-data"
import { cn } from "@/lib/utils"

type PixiMapCanvasProps = {
  world: WorldConfig
  nodes: MapNode[]
  obstacles: MapObstacle[]
  className?: string
}

type TooltipState = {
  name: string
  kind: MapNodeKind
  left: number
  top: number
}

type CameraState = {
  x: number
  y: number
  zoom: number
}

type DragState = {
  active: boolean
  startX: number
  startY: number
  cameraX: number
  cameraY: number
}

type ZoomActions = {
  zoomIn: () => void
  zoomOut: () => void
}

const PLAYER_SPEED = 180
const ZOOM_STEP = 0.12
const TOOLTIP_WIDTH = 170
const TOOLTIP_HEIGHT = 54

const NODE_KIND_LABEL: Record<MapNodeKind, string> = {
  settlement: "聚落",
  ruin: "废墟",
  outpost: "哨站",
  hazard: "危险区",
}

const NODE_STYLE_MAP: Record<
  MapNodeKind,
  { glow: number; ring: number; core: number }
> = {
  settlement: { glow: 0xe2bf83, ring: 0xe7cea0, core: 0xf8f0df },
  ruin: { glow: 0x8a939c, ring: 0xa2acb6, core: 0xd5dbe1 },
  outpost: { glow: 0x5998a3, ring: 0x7db7c0, core: 0xcde6ea },
  hazard: { glow: 0xbc684f, ring: 0xd88667, core: 0xf3b690 },
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function toWorldPoint(
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

function clampCamera(camera: CameraState, viewportWidth: number, viewportHeight: number, world: WorldConfig) {
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

function flattenPolygon(polygon: WorldPoint[]) {
  const points: number[] = []

  for (const point of polygon) {
    points.push(point.x, point.y)
  }

  return points
}

export function PixiMapCanvas({
  world,
  nodes,
  obstacles,
  className,
}: PixiMapCanvasProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const zoomActionsRef = useRef<ZoomActions | null>(null)
  const statusTimerRef = useRef<number | null>(null)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [zoomPercent, setZoomPercent] = useState<number>(
    Math.round(world.defaultZoom * 100)
  )

  useEffect(() => {
    const host = hostRef.current

    if (!host) {
      return
    }

    const app = new Application()
    const worldContainer = new Container()
    const backgroundLayer = new Graphics()
    const obstacleLayer = new Graphics()
    const pathLayer = new Graphics()
    const nodeLayer = new Container()
    const playerLayer = new Container()
    const playerMarker = new Graphics()
    const navigationGrid = buildNavigationGrid(world, obstacles)
    const drag: DragState = {
      active: false,
      startX: 0,
      startY: 0,
      cameraX: 0,
      cameraY: 0,
    }
    const camera: CameraState = {
      x: 0,
      y: 0,
      zoom: clamp(world.defaultZoom, world.minZoom, world.maxZoom),
    }

    const findFallbackSpawn = (): WorldPoint => {
      for (let row = 0; row < navigationGrid.rows; row += 1) {
        for (let col = 0; col < navigationGrid.cols; col += 1) {
          const index = row * navigationGrid.cols + col

          if (navigationGrid.blocked[index] === 0) {
            return {
              x: clamp((col + 0.5) * navigationGrid.gridSize, 0, world.width - 0.001),
              y: clamp((row + 0.5) * navigationGrid.gridSize, 0, world.height - 0.001),
            }
          }
        }
      }

      return {
        x: world.width * 0.5,
        y: world.height * 0.5,
      }
    }

    const candidateNodes: MapNode[] = []
    const mainSettlement = nodes.find((node) => node.kind === "settlement")

    if (mainSettlement) {
      candidateNodes.push(mainSettlement)
    }

    candidateNodes.push(...nodes)

    let spawn = findFallbackSpawn()

    for (const node of candidateNodes) {
      const candidate = { x: node.x, y: node.y }

      if (!isPointBlocked(navigationGrid, candidate)) {
        spawn = candidate
        break
      }
    }

    const player = {
      x: spawn.x,
      y: spawn.y,
      speed: PLAYER_SPEED,
      moving: false,
      path: [] as WorldPoint[],
    }

    let disposed = false
    let initialized = false
    let destroyed = false
    let resizeObserver: ResizeObserver | null = null
    let wheelHandler: ((event: WheelEvent) => void) | null = null
    let contextMenuHandler: ((event: MouseEvent) => void) | null = null

    const clearStatusTimer = () => {
      if (statusTimerRef.current !== null) {
        window.clearTimeout(statusTimerRef.current)
        statusTimerRef.current = null
      }
    }

    const showStatus = (message: string) => {
      if (disposed) {
        return
      }

      clearStatusTimer()
      setStatusMessage(message)
      statusTimerRef.current = window.setTimeout(() => {
        if (!disposed) {
          setStatusMessage(null)
        }
      }, 1800)
    }

    const showTooltip = (name: string, kind: MapNodeKind, x: number, y: number) => {
      const width = app.renderer.width
      const height = app.renderer.height
      const left = clamp(x + 12, 8, Math.max(8, width - TOOLTIP_WIDTH - 8))
      const top = clamp(y - TOOLTIP_HEIGHT - 8, 8, Math.max(8, height - TOOLTIP_HEIGHT - 8))

      setTooltip({ name, kind, left, top })
    }

    const drawBackground = () => {
      backgroundLayer.clear()
      backgroundLayer.rect(0, 0, world.width, world.height).fill({ color: 0x0e1218 })
      backgroundLayer
        .rect(0, 0, world.width, world.height)
        .stroke({ width: 2, color: 0x2f3d49, alpha: 0.9 })

      for (let x = 0; x <= world.width; x += 200) {
        backgroundLayer
          .moveTo(x, 0)
          .lineTo(x, world.height)
          .stroke({ width: 1, color: 0x2a3844, alpha: 0.36 })
      }

      for (let y = 0; y <= world.height; y += 200) {
        backgroundLayer
          .moveTo(0, y)
          .lineTo(world.width, y)
          .stroke({ width: 1, color: 0x2a3844, alpha: 0.36 })
      }
    }

    const drawObstacles = () => {
      obstacleLayer.clear()

      for (const obstacle of obstacles) {
        if (obstacle.polygon.length < 3) {
          continue
        }

        obstacleLayer
          .poly(flattenPolygon(obstacle.polygon))
          .fill({ color: 0x5e352d, alpha: 0.42 })
          .stroke({ width: 1.2, color: 0xd28b74, alpha: 0.7 })
      }
    }

    const drawPath = (points: WorldPoint[]) => {
      pathLayer.clear()

      if (points.length < 2) {
        return
      }

      pathLayer.moveTo(points[0].x, points[0].y)

      for (let i = 1; i < points.length; i += 1) {
        pathLayer.lineTo(points[i].x, points[i].y)
      }

      pathLayer.stroke({
        width: 9,
        color: 0x6eaccc,
        alpha: 0.2,
        cap: "round",
        join: "round",
      })

      pathLayer.moveTo(points[0].x, points[0].y)

      for (let i = 1; i < points.length; i += 1) {
        pathLayer.lineTo(points[i].x, points[i].y)
      }

      pathLayer.stroke({
        width: 2.6,
        color: 0x9ac8e1,
        alpha: 0.9,
        cap: "round",
        join: "round",
      })
    }

    const drawPlayerMarker = () => {
      playerMarker.clear()
      playerMarker.circle(0, 0, 16).fill({ color: 0x88bbd0, alpha: 0.16 })
      playerMarker
        .circle(0, 0, 9.6)
        .stroke({ width: 2, color: 0xb6d5e4, alpha: 0.95 })
      playerMarker.circle(0, 0, 4.6).fill({ color: 0xe4f2fb, alpha: 1 })
      playerMarker.position.set(player.x, player.y)
    }

    const drawNodes = () => {
      const staleNodes = nodeLayer.removeChildren()

      for (const stale of staleNodes) {
        stale.destroy()
      }

      for (const node of nodes) {
        const marker = new Graphics()
        const nodeStyle = NODE_STYLE_MAP[node.kind]

        marker
          .circle(0, 0, 16)
          .fill({ color: nodeStyle.glow, alpha: 0.12 })
          .circle(0, 0, 9)
          .stroke({ width: 1.8, color: nodeStyle.ring, alpha: 0.92 })
          .circle(0, 0, 4.2)
          .fill({ color: nodeStyle.core, alpha: 1 })

        marker.position.set(node.x, node.y)
        marker.eventMode = "static"
        marker.cursor = "pointer"
        marker.hitArea = new Circle(0, 0, 17)

        const updateTooltipPosition = (event: FederatedPointerEvent) => {
          showTooltip(node.name, node.kind, event.global.x, event.global.y)
        }

        marker.on("pointerover", updateTooltipPosition)
        marker.on("pointermove", updateTooltipPosition)
        marker.on("pointerout", () => {
          setTooltip(null)
        })

        nodeLayer.addChild(marker)
      }
    }

    const applyCamera = () => {
      worldContainer.scale.set(camera.zoom)
      worldContainer.position.set(camera.x, camera.y)
    }

    const syncCamera = () => {
      clampCamera(camera, app.renderer.width, app.renderer.height, world)
      applyCamera()
    }

    const centerCamera = () => {
      camera.zoom = clamp(camera.zoom, world.minZoom, world.maxZoom)
      camera.x = (app.renderer.width - world.width * camera.zoom) / 2
      camera.y = (app.renderer.height - world.height * camera.zoom) / 2
      syncCamera()
      setZoomPercent(Math.round(camera.zoom * 100))
    }

    const zoomAt = (screenX: number, screenY: number, nextZoom: number) => {
      const clampedZoom = clamp(nextZoom, world.minZoom, world.maxZoom)

      if (Math.abs(clampedZoom - camera.zoom) < 0.001) {
        return
      }

      const anchorWorldX = (screenX - camera.x) / camera.zoom
      const anchorWorldY = (screenY - camera.y) / camera.zoom

      camera.zoom = clampedZoom
      camera.x = screenX - anchorWorldX * camera.zoom
      camera.y = screenY - anchorWorldY * camera.zoom
      syncCamera()
      setZoomPercent(Math.round(camera.zoom * 100))
    }

    const beginPathTo = (screenX: number, screenY: number) => {
      const target = toWorldPoint(camera, world, screenX, screenY)

      if (isPointBlocked(navigationGrid, target)) {
        player.moving = false
        player.path = []
        drawPath([])
        showStatus("目标不可达：不可通行区域")
        return
      }

      const path = findPathAStar(navigationGrid, { x: player.x, y: player.y }, target)

      if (!path || path.length < 2) {
        player.moving = false
        player.path = []
        drawPath([])
        showStatus("目标不可达：未找到有效路径")
        return
      }

      player.path = path.slice(1)
      player.moving = true
      drawPath([{ x: player.x, y: player.y }, ...player.path])
    }

    const onPointerDown = (event: FederatedPointerEvent) => {
      if (event.pointerType === "mouse" && event.button === 2) {
        beginPathTo(event.global.x, event.global.y)
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
      setTooltip(null)
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

    const tick = () => {
      if (!player.moving || player.path.length === 0) {
        return
      }

      let remaining = player.speed * (app.ticker.deltaMS / 1000)

      while (remaining > 0 && player.path.length > 0) {
        const nextPoint = player.path[0]
        const dx = nextPoint.x - player.x
        const dy = nextPoint.y - player.y
        const distance = Math.hypot(dx, dy)

        if (distance <= remaining) {
          player.x = nextPoint.x
          player.y = nextPoint.y
          player.path.shift()
          remaining -= distance
        } else {
          const ratio = remaining / Math.max(distance, 0.0001)
          player.x += dx * ratio
          player.y += dy * ratio
          remaining = 0
        }
      }

      playerMarker.position.set(player.x, player.y)

      if (player.path.length === 0) {
        player.moving = false
        drawPath([])
      } else {
        drawPath([{ x: player.x, y: player.y }, ...player.path])
      }
    }

    const resize = () => {
      const width = Math.max(1, Math.round(host.clientWidth))
      const height = Math.max(1, Math.round(host.clientHeight))

      app.renderer.resize(width, height)
      app.stage.hitArea = new Rectangle(0, 0, width, height)
      syncCamera()
    }

    const destroyApp = () => {
      if (destroyed || !initialized) {
        return
      }

      destroyed = true
      app.destroy(true, { children: true })
    }

    const init = async () => {
      const width = Math.max(1, Math.round(host.clientWidth))
      const height = Math.max(1, Math.round(host.clientHeight))

      await app.init({
        width,
        height,
        antialias: true,
        autoDensity: true,
        backgroundAlpha: 0,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
      })
      initialized = true

      if (disposed) {
        destroyApp()
        return
      }

      host.appendChild(app.canvas)

      app.stage.eventMode = "static"
      app.stage.hitArea = new Rectangle(0, 0, width, height)

      worldContainer.addChild(backgroundLayer)
      worldContainer.addChild(obstacleLayer)
      worldContainer.addChild(pathLayer)
      worldContainer.addChild(nodeLayer)
      worldContainer.addChild(playerLayer)
      playerLayer.addChild(playerMarker)
      app.stage.addChild(worldContainer)

      drawBackground()
      drawObstacles()
      drawNodes()
      drawPlayerMarker()
      centerCamera()

      app.stage.on("pointerdown", onPointerDown)
      app.stage.on("pointermove", onPointerMove)
      app.stage.on("pointerup", onPointerUp)
      app.stage.on("pointerupoutside", onPointerUp)
      app.ticker.add(tick)

      wheelHandler = (event: WheelEvent) => {
        event.preventDefault()

        const rect = app.canvas.getBoundingClientRect()
        const screenX = event.clientX - rect.left
        const screenY = event.clientY - rect.top
        const factor = event.deltaY > 0 ? 1 - ZOOM_STEP : 1 + ZOOM_STEP

        zoomAt(screenX, screenY, camera.zoom * factor)
      }

      contextMenuHandler = (event: MouseEvent) => {
        event.preventDefault()
      }

      app.canvas.addEventListener("wheel", wheelHandler, { passive: false })
      app.canvas.addEventListener("contextmenu", contextMenuHandler)

      resizeObserver = new ResizeObserver(() => {
        resize()
      })
      resizeObserver.observe(host)

      zoomActionsRef.current = {
        zoomIn: () => {
          zoomAt(app.renderer.width / 2, app.renderer.height / 2, camera.zoom * (1 + ZOOM_STEP))
        },
        zoomOut: () => {
          zoomAt(app.renderer.width / 2, app.renderer.height / 2, camera.zoom * (1 - ZOOM_STEP))
        },
      }
    }

    void init().catch((error: unknown) => {
      console.error("[PixiMapCanvas] init failed", error)
    })

    return () => {
      disposed = true
      resizeObserver?.disconnect()
      clearStatusTimer()
      setTooltip(null)
      setStatusMessage(null)
      zoomActionsRef.current = null

      if (initialized) {
        app.stage.off("pointerdown", onPointerDown)
        app.stage.off("pointermove", onPointerMove)
        app.stage.off("pointerup", onPointerUp)
        app.stage.off("pointerupoutside", onPointerUp)
        app.ticker.remove(tick)

        if (wheelHandler) {
          app.canvas.removeEventListener("wheel", wheelHandler)
        }

        if (contextMenuHandler) {
          app.canvas.removeEventListener("contextmenu", contextMenuHandler)
        }
      }

      destroyApp()
    }
  }, [nodes, obstacles, world])

  return (
    <div
      ref={hostRef}
      className={cn(
        "relative w-full touch-none overflow-hidden rounded-md border border-white/10 bg-[#0b0f14] select-none",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-20 bg-gradient-to-t from-black/35 to-transparent" />
      <div className="absolute top-3 right-3 z-20 flex items-center gap-2 rounded-md border border-white/15 bg-[#141920]/90 px-2 py-1">
        <Button
          size="icon-xs"
          variant="outline"
          className="border-white/15 bg-black/20 text-slate-200 hover:bg-black/35"
          onClick={() => {
            zoomActionsRef.current?.zoomOut()
          }}
          aria-label="缩小地图"
        >
          <Minus />
        </Button>
        <span className="w-12 text-center text-[11px] font-medium tracking-wide text-slate-200">
          {zoomPercent}%
        </span>
        <Button
          size="icon-xs"
          variant="outline"
          className="border-white/15 bg-black/20 text-slate-200 hover:bg-black/35"
          onClick={() => {
            zoomActionsRef.current?.zoomIn()
          }}
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
