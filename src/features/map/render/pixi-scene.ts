import {
  Application,
  Circle,
  Container,
  Graphics,
  Rectangle,
  type FederatedPointerEvent,
} from "pixi.js"

import {
  NODE_KIND_LABEL,
  NPC_SQUAD_IDLE_MAX_MS,
  NPC_SQUAD_IDLE_MIN_MS,
  NPC_SQUAD_PATHFIND_ATTEMPTS,
  NODE_STYLE_MAP,
  PLAYER_SPEED,
  TOOLTIP_HEIGHT,
  TOOLTIP_WIDTH,
  ZOOM_STEP,
} from "@/features/map/constants"
import { clamp } from "@/features/map/lib/math"
import {
  createNpcSquadRuntimes,
  tickNpcSquad,
  toNpcSquadSnapshot,
  type NpcSquadRuntime,
} from "@/features/map/lib/npc-squads"
import {
  buildNavigationGrid,
  findPathAStar,
  isPointBlocked,
} from "@/features/map/lib/pathfinding"
import { advancePathMover, type PathMover } from "@/features/map/lib/movement"
import {
  observeThemeClassChange,
  resolveMapThemePalette,
} from "@/features/map/render/map-theme"
import { selectSpawnPoint } from "@/features/map/lib/spawn"
import type {
  MapNode,
  MapObstacle,
  NpcSquadSnapshot,
  NpcSquadTemplate,
  WorldConfig,
  WorldPoint,
} from "@/features/map/types"

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

export type MapTooltipState = {
  name: string
  subtitle: string
  left: number
  top: number
}

type SceneCallbacks = {
  onTooltipChange: (tooltip: MapTooltipState | null) => void
  onStatusMessage: (message: string) => void
  onZoomPercentChange: (zoomPercent: number) => void
  onNodeSelect: (nodeId: string) => void
  onSquadSelect: (squad: NpcSquadSnapshot) => void
}

type CreatePixiMapSceneParams = {
  host: HTMLDivElement
  world: WorldConfig
  nodes: MapNode[]
  obstacles: MapObstacle[]
  npcSquads?: NpcSquadTemplate[]
  callbacks: SceneCallbacks
  movementTimeScale?: number
}

export type MapSceneController = {
  zoomIn: () => void
  zoomOut: () => void
  setMovementTimeScale: (nextScale: number) => void
  destroy: () => void
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

function clampCamera(
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

function flattenPolygon(polygon: WorldPoint[]) {
  const points: number[] = []

  for (const point of polygon) {
    points.push(point.x, point.y)
  }

  return points
}

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

  const showTooltip = (name: string, subtitle: string, x: number, y: number) => {
    const width = app.renderer.width
    const height = app.renderer.height
    const left = clamp(x + 12, 8, Math.max(8, width - TOOLTIP_WIDTH - 8))
    const top = clamp(y - TOOLTIP_HEIGHT - 8, 8, Math.max(8, height - TOOLTIP_HEIGHT - 8))

    callbacks.onTooltipChange({ name, subtitle, left, top })
  }

  const drawBackground = () => {
    backgroundLayer.clear()
    backgroundLayer.rect(0, 0, world.width, world.height).fill({ color: mapTheme.background })
    backgroundLayer
      .rect(0, 0, world.width, world.height)
      .stroke({ width: 2, color: mapTheme.grid, alpha: 0.9 })

    for (let x = 0; x <= world.width; x += 200) {
      backgroundLayer
        .moveTo(x, 0)
        .lineTo(x, world.height)
        .stroke({ width: 1, color: mapTheme.grid, alpha: 0.22 })
    }

    for (let y = 0; y <= world.height; y += 200) {
      backgroundLayer
        .moveTo(0, y)
        .lineTo(world.width, y)
        .stroke({ width: 1, color: mapTheme.grid, alpha: 0.22 })
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
    playerMarker.circle(0, 0, 9.6).stroke({ width: 2, color: 0xb6d5e4, alpha: 0.95 })
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
        showTooltip(node.name, NODE_KIND_LABEL[node.kind], event.global.x, event.global.y)
      }

      marker.on("pointerover", updateTooltipPosition)
      marker.on("pointermove", updateTooltipPosition)
      marker.on("pointerout", () => {
        callbacks.onTooltipChange(null)
      })
      marker.on("pointerdown", (event: FederatedPointerEvent) => {
        event.stopPropagation()
      })
      marker.on("pointertap", (event: FederatedPointerEvent) => {
        event.stopPropagation()
        callbacks.onNodeSelect(node.id)
      })

      nodeLayer.addChild(marker)
    }
  }

  const drawNpcSquads = () => {
    const staleMarkers = npcLayer.removeChildren()

    for (const stale of staleMarkers) {
      stale.destroy()
    }

    npcMarkers.clear()

    for (const squad of npcSquadRuntimes) {
      const marker = new Graphics()

      marker
        .circle(0, 0, 14)
        .fill({ color: 0x95d29f, alpha: 0.12 })
        .circle(0, 0, 8)
        .stroke({ width: 1.8, color: 0x9fdfa9, alpha: 0.92 })
        .circle(0, 0, 3.8)
        .fill({ color: 0xe9f9ec, alpha: 1 })

      marker.position.set(squad.mover.x, squad.mover.y)
      marker.eventMode = "static"
      marker.cursor = "pointer"
      marker.hitArea = new Circle(0, 0, 15)

      const updateTooltipPosition = (event: FederatedPointerEvent) => {
        showTooltip(
          squad.name,
          `${squad.members.length}名NPC`,
          event.global.x,
          event.global.y
        )
      }

      marker.on("pointerover", updateTooltipPosition)
      marker.on("pointermove", updateTooltipPosition)
      marker.on("pointerout", () => {
        callbacks.onTooltipChange(null)
      })
      marker.on("pointerdown", (event: FederatedPointerEvent) => {
        event.stopPropagation()
      })
      marker.on("pointertap", (event: FederatedPointerEvent) => {
        event.stopPropagation()
        callbacks.onSquadSelect(toNpcSquadSnapshot(squad))
      })

      npcLayer.addChild(marker)
      npcMarkers.set(squad.id, marker)
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
    callbacks.onZoomPercentChange(Math.round(camera.zoom * 100))
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
    callbacks.onZoomPercentChange(Math.round(camera.zoom * 100))
  }

  const beginPathTo = (screenX: number, screenY: number) => {
    const target = toWorldPoint(camera, world, screenX, screenY)

    if (isPointBlocked(navigationGrid, target)) {
      player.moving = false
      player.path = []
      drawPath([])
      callbacks.onStatusMessage("目标不可达：不可通行区域")
      return
    }

    const path = findPathAStar(navigationGrid, { x: player.x, y: player.y }, target)

    if (!path || path.length < 2) {
      player.moving = false
      player.path = []
      drawPath([])
      callbacks.onStatusMessage("目标不可达：未找到有效路径")
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
    callbacks.onTooltipChange(null)
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

  const updateNpcMarkerPosition = (squad: NpcSquadRuntime) => {
    const marker = npcMarkers.get(squad.id)

    if (!marker) {
      return
    }

    marker.position.set(squad.mover.x, squad.mover.y)
  }

  const tick = () => {
    const playerStep = advancePathMover(
      player,
      app.ticker.deltaMS,
      movementTimeScale
    )

    if (playerStep.moved) {
      playerMarker.position.set(player.x, player.y)
      drawPath([{ x: player.x, y: player.y }, ...player.path])
    }

    if (playerStep.arrived) {
      drawPath([])
    }

    for (const squad of npcSquadRuntimes) {
      const step = tickNpcSquad({
        squad,
        deltaMs: app.ticker.deltaMS,
        timeScale: movementTimeScale,
        navigationGrid,
        world,
        pathfindAttempts: NPC_SQUAD_PATHFIND_ATTEMPTS,
        idleMinMs: NPC_SQUAD_IDLE_MIN_MS,
        idleMaxMs: NPC_SQUAD_IDLE_MAX_MS,
      })

      if (step.moved) {
        updateNpcMarkerPosition(squad)
      }
    }
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

  drawBackground()
  drawObstacles()
  drawNodes()
  drawNpcSquads()
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
  stopThemeObserver = observeThemeClassChange(() => {
    if (destroyed) {
      return
    }

    mapTheme = resolveMapThemePalette()
    drawBackground()
  })

  resizeObserver = new ResizeObserver(() => {
    resize()
  })
  resizeObserver.observe(host)

  return {
    zoomIn: () => {
      zoomAt(app.renderer.width / 2, app.renderer.height / 2, camera.zoom * (1 + ZOOM_STEP))
    },
    zoomOut: () => {
      zoomAt(app.renderer.width / 2, app.renderer.height / 2, camera.zoom * (1 - ZOOM_STEP))
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

      stopThemeObserver?.()
      callbacks.onTooltipChange(null)
      app.destroy(true, { children: true })
    },
  }
}
