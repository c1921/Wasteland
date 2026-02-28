import {
  Application,
  Container,
  Graphics,
  Rectangle,
} from "pixi.js"

import {
  PLAYER_SPEED,
  TOOLTIP_HEIGHT,
  TOOLTIP_WIDTH,
} from "@/features/map/constants"
import { clamp } from "@/features/map/lib/math"
import { type PathMover } from "@/features/map/lib/movement"
import { createNpcSquadRuntimes } from "@/features/map/lib/npc-squads"
import { buildNavigationGrid } from "@/features/map/lib/pathfinding"
import { selectSpawnPoint } from "@/features/map/lib/spawn"
import {
  observeThemeClassChange,
  resolveMapThemePalette,
} from "@/features/map/render/map-theme"
import {
  applyCamera,
  clampCamera,
} from "@/features/map/render/scene/camera"
import {
  drawBackground,
  drawNodes,
  drawNpcSquads,
  drawObstacles,
  drawPath,
  drawPlayerMarker,
  updateNpcMarkerPosition,
} from "@/features/map/render/scene/draw"
import {
  createPointerHandlers,
  createWheelHandler,
  zoomInByStep,
  zoomOutByStep,
} from "@/features/map/render/scene/interaction"
import { tickScene } from "@/features/map/render/scene/runtime"
import type {
  CameraState,
  CreatePixiMapSceneParams,
  DragState,
  MapSceneController,
} from "@/features/map/render/scene/types"
import type { WorldPoint } from "@/features/map/types"

export async function createPixiMapScene({
  host,
  world,
  nodes,
  obstacles,
  npcSquads = [],
  callbacks,
  movementTimeScale: initialMovementTimeScale = 1,
}: CreatePixiMapSceneParams): Promise<MapSceneController> {
  const app = new Application()
  const worldContainer = new Container()
  const backgroundLayer = new Graphics()
  const obstacleLayer = new Graphics()
  const pathLayer = new Graphics()
  const nodeLayer = new Container()
  const npcLayer = new Container()
  const playerLayer = new Container()
  const playerMarker = new Graphics()
  const navigationGrid = buildNavigationGrid(world, obstacles)
  const spawn = selectSpawnPoint(navigationGrid, nodes, world)
  const npcSquadRuntimes = createNpcSquadRuntimes(npcSquads)
  const npcMarkers = new Map<string, Graphics>()
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
  const player: PathMover = {
    x: spawn.x,
    y: spawn.y,
    speed: PLAYER_SPEED,
    moving: false,
    path: [] as WorldPoint[],
  }
  let movementTimeScale = Number.isFinite(initialMovementTimeScale)
    ? Math.max(0, initialMovementTimeScale)
    : 1

  let destroyed = false
  let resizeObserver: ResizeObserver | null = null
  let wheelHandler: ((event: WheelEvent) => void) | null = null
  let contextMenuHandler: ((event: MouseEvent) => void) | null = null
  let stopThemeObserver: (() => void) | null = null
  let mapTheme = resolveMapThemePalette()

  const clearTooltip = () => {
    callbacks.onTooltipChange(null)
  }

  const showTooltip = (name: string, subtitle: string, x: number, y: number) => {
    const width = app.renderer.width
    const height = app.renderer.height
    const left = clamp(x + 12, 8, Math.max(8, width - TOOLTIP_WIDTH - 8))
    const top = clamp(y - TOOLTIP_HEIGHT - 8, 8, Math.max(8, height - TOOLTIP_HEIGHT - 8))

    callbacks.onTooltipChange({ name, subtitle, left, top })
  }

  const syncCamera = () => {
    clampCamera(camera, app.renderer.width, app.renderer.height, world)
    applyCamera(worldContainer, camera)
  }

  const centerCamera = () => {
    camera.zoom = clamp(camera.zoom, world.minZoom, world.maxZoom)
    camera.x = (app.renderer.width - world.width * camera.zoom) / 2
    camera.y = (app.renderer.height - world.height * camera.zoom) / 2
    syncCamera()
    callbacks.onZoomPercentChange(Math.round(camera.zoom * 100))
  }

  const getViewportSize = () => ({
    width: app.renderer.width,
    height: app.renderer.height,
  })

  const drawRoute = (points: WorldPoint[]) => {
    drawPath(pathLayer, points)
  }

  const pointerHandlers = createPointerHandlers({
    camera,
    drag,
    world,
    navigationGrid,
    player,
    drawPath: drawRoute,
    onTooltipHide: clearTooltip,
    onStatusMessage: callbacks.onStatusMessage,
    syncCamera,
  })

  const tick = () => {
    tickScene({
      deltaMs: app.ticker.deltaMS,
      movementTimeScale,
      player,
      playerMarker,
      drawPath: drawRoute,
      npcSquadRuntimes,
      navigationGrid,
      world,
      updateNpcMarkerPosition: (squad) => {
        updateNpcMarkerPosition(npcMarkers, squad)
      },
    })
  }

  const resize = () => {
    const width = Math.max(1, Math.round(host.clientWidth))
    const height = Math.max(1, Math.round(host.clientHeight))

    app.renderer.resize(width, height)
    app.stage.hitArea = new Rectangle(0, 0, width, height)
    syncCamera()
  }

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

  host.appendChild(app.canvas)

  app.stage.eventMode = "static"
  app.stage.hitArea = new Rectangle(0, 0, width, height)

  worldContainer.addChild(backgroundLayer)
  worldContainer.addChild(obstacleLayer)
  worldContainer.addChild(pathLayer)
  worldContainer.addChild(nodeLayer)
  worldContainer.addChild(npcLayer)
  worldContainer.addChild(playerLayer)
  playerLayer.addChild(playerMarker)
  app.stage.addChild(worldContainer)

  drawBackground(backgroundLayer, world, mapTheme)
  drawObstacles(obstacleLayer, obstacles)
  drawNodes({
    nodeLayer,
    nodes,
    showTooltip,
    clearTooltip,
    onNodeSelect: callbacks.onNodeSelect,
  })
  drawNpcSquads({
    npcLayer,
    npcSquadRuntimes,
    npcMarkers,
    showTooltip,
    clearTooltip,
    onSquadSelect: callbacks.onSquadSelect,
  })
  drawPlayerMarker(playerMarker, player)
  centerCamera()

  app.stage.on("pointerdown", pointerHandlers.onPointerDown)
  app.stage.on("pointermove", pointerHandlers.onPointerMove)
  app.stage.on("pointerup", pointerHandlers.onPointerUp)
  app.stage.on("pointerupoutside", pointerHandlers.onPointerUp)
  app.ticker.add(tick)

  wheelHandler = createWheelHandler({
    camera,
    world,
    canvas: app.canvas,
    getViewportSize,
    syncCamera,
    onZoomPercentChange: callbacks.onZoomPercentChange,
  })

  contextMenuHandler = (event: MouseEvent) => {
    event.preventDefault()
  }

  app.canvas.addEventListener("wheel", wheelHandler, { passive: false })
  app.canvas.addEventListener("contextmenu", contextMenuHandler)
  stopThemeObserver = observeThemeClassChange(() => {
    if (destroyed) {
      return
    }

    mapTheme = resolveMapThemePalette()
    drawBackground(backgroundLayer, world, mapTheme)
  })

  resizeObserver = new ResizeObserver(() => {
    resize()
  })
  resizeObserver.observe(host)

  return {
    zoomIn: () => {
      zoomInByStep({
        camera,
        world,
        getViewportSize,
        syncCamera,
        onZoomPercentChange: callbacks.onZoomPercentChange,
      })
    },
    zoomOut: () => {
      zoomOutByStep({
        camera,
        world,
        getViewportSize,
        syncCamera,
        onZoomPercentChange: callbacks.onZoomPercentChange,
      })
    },
    setMovementTimeScale: (nextScale: number) => {
      movementTimeScale = Number.isFinite(nextScale) ? Math.max(0, nextScale) : 1
    },
    destroy: () => {
      if (destroyed) {
        return
      }

      destroyed = true

      resizeObserver?.disconnect()
      app.stage.off("pointerdown", pointerHandlers.onPointerDown)
      app.stage.off("pointermove", pointerHandlers.onPointerMove)
      app.stage.off("pointerup", pointerHandlers.onPointerUp)
      app.stage.off("pointerupoutside", pointerHandlers.onPointerUp)
      app.ticker.remove(tick)

      if (wheelHandler) {
        app.canvas.removeEventListener("wheel", wheelHandler)
      }

      if (contextMenuHandler) {
        app.canvas.removeEventListener("contextmenu", contextMenuHandler)
      }

      stopThemeObserver?.()
      clearTooltip()
      app.destroy(true, { children: true })
    },
  }
}
