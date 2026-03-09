import {
  Application,
  Container,
  Graphics,
  Rectangle,
  type FederatedPointerEvent,
} from "pixi.js"

import { BASE_CAMERA_KEYBOARD_PAN_SPEED } from "@/features/base/constants"
import {
  applyAreaBrushPlacement,
  applyAreaPlacement,
  applyStructurePlacement,
  getPointerTooltip,
  pickPointerTarget,
  removeBuildingsByIds,
  resolveBrushPath,
  resolveDefinitionForTool,
  resolveDemolishIdsFromTargets,
  resolvePlacementPreview,
  resolveSelectionAtPoint,
  resolveStructureDragEdges,
} from "@/features/base/lib/layout"
import {
  isBaseEditorStateEqual,
  isBaseLayoutStateEqual,
  isBaseSelectionEqual,
  isPlacementPreviewEqual,
} from "@/features/base/lib/state-equality"
import {
  applyCamera,
  clampCamera,
  toWorldPoint,
  zoomCameraAtPoint,
} from "@/features/base/render/scene/camera"
import {
  drawBackground,
  drawGrid,
  drawLayout,
  drawTerrain,
  redrawOverlay,
} from "@/features/base/render/scene/draw"
import type {
  CameraState,
  CreatePixiBaseSceneParams,
  BaseSceneController,
} from "@/features/base/render/scene/types"
import type {
  BaseEditorState,
  BaseLayoutState,
  BasePointerTarget,
  BaseSelection,
  EdgeCoord,
  PlacementPreview,
  SubcellCoord,
} from "@/features/base/types"

const SUBGRID_VISIBLE_AT_ZOOM = 1.4
const TOOLTIP_WIDTH = 180
const TOOLTIP_HEIGHT = 56
const ZOOM_STEP = 0.12

type ToolGestureState =
  | {
    kind: "idle"
  }
  | {
    kind: "structure-drag"
    startEdge: EdgeCoord
    currentEdge: EdgeCoord
  }
  | {
    kind: "brush-drag"
    startOrigin: SubcellCoord
    currentOrigin: SubcellCoord
  }
  | {
    kind: "demolish-drag"
    buildingIds: Set<string>
  }
  | {
    kind: "pending-area"
    origin: SubcellCoord
  }
  | {
    kind: "pending-select"
  }

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function isTouchLike(event: FederatedPointerEvent) {
  return event.pointerType === "touch" || event.pointerType === "pen"
}

export async function createPixiBaseScene({
  host,
  world,
  terrain,
  layout: initialLayout,
  editorState: initialEditorState,
  callbacks,
}: CreatePixiBaseSceneParams): Promise<BaseSceneController> {
  const app = new Application()
  const worldContainer = new Container()
  const backgroundLayer = new Graphics()
  const terrainLayer = new Graphics()
  const gridLayer = new Graphics()
  const subgridLayer = new Graphics()
  const structureLayer = new Graphics()
  const buildingLayer = new Graphics()
  const overlayLayer = new Graphics()
  const activePointers = new Map<number, { x: number; y: number }>()
  const pressedKeys = new Set<string>()
  const camera: CameraState = {
    x: 0,
    y: 0,
    zoom: clamp(initialEditorState.tool === "select" ? world.defaultZoom : world.defaultZoom, world.minZoom, world.maxZoom),
  }
  let destroyed = false
  let resizeObserver: ResizeObserver | null = null
  let wheelHandler: ((event: WheelEvent) => void) | null = null
  let keydownHandler: ((event: KeyboardEvent) => void) | null = null
  let keyupHandler: ((event: KeyboardEvent) => void) | null = null
  let currentLayout: BaseLayoutState = {
    buildings: initialLayout.buildings.map((building) => ({
      ...building,
      footprint:
        building.footprint.kind === "edge"
          ? {
            kind: "edge",
            edge: { ...building.footprint.edge },
          }
          : {
            kind: "area",
            origin: { ...building.footprint.origin },
            widthSubcells: building.footprint.widthSubcells,
            heightSubcells: building.footprint.heightSubcells,
          },
    })),
  }
  let currentEditorState: BaseEditorState = { ...initialEditorState }
  let currentSelection: BaseSelection | null = null
  let currentPreview: PlacementPreview = null
  let gestureState: ToolGestureState = { kind: "idle" }
  let pinchDistance: number | null = null
  let pinchCenter: { x: number; y: number } | null = null

  const cloneLayout = (layout: BaseLayoutState): BaseLayoutState => ({
    buildings: layout.buildings.map((building) => ({
      ...building,
      footprint:
        building.footprint.kind === "edge"
          ? {
            kind: "edge" as const,
            edge: { ...building.footprint.edge },
          }
          : {
            kind: "area" as const,
            origin: { ...building.footprint.origin },
            widthSubcells: building.footprint.widthSubcells,
            heightSubcells: building.footprint.heightSubcells,
          },
    })),
  })

  const setTooltip = (target: BasePointerTarget | null, screenX: number, screenY: number) => {
    if (!target) {
      callbacks.onTooltipChange(null)
      return
    }

    const tooltip = getPointerTooltip(target, currentLayout)
    const left = clamp(
      screenX + 12,
      8,
      Math.max(8, app.renderer.width - TOOLTIP_WIDTH - 8)
    )
    const top = clamp(
      screenY - TOOLTIP_HEIGHT - 8,
      8,
      Math.max(8, app.renderer.height - TOOLTIP_HEIGHT - 8)
    )

    callbacks.onTooltipChange({
      name: tooltip.title,
      subtitle: tooltip.subtitle,
      left,
      top,
    })
  }

  const syncCamera = () => {
    clampCamera(camera, app.renderer.width, app.renderer.height, world)
    applyCamera(worldContainer, camera)
    drawGrid(gridLayer, subgridLayer, world, camera.zoom >= SUBGRID_VISIBLE_AT_ZOOM)
  }

  const centerCamera = () => {
    camera.zoom = clamp(world.defaultZoom, world.minZoom, world.maxZoom)
    camera.x = (app.renderer.width - world.width * camera.zoom) / 2
    camera.y = (app.renderer.height - world.height * camera.zoom) / 2
    syncCamera()
    callbacks.onZoomPercentChange(Math.round(camera.zoom * 100))
  }

  const renderLayout = () => {
    drawLayout(structureLayer, buildingLayer, world, currentLayout)
    redrawOverlay(overlayLayer, world, currentLayout, currentSelection, currentPreview)
  }

  const setSelection = (nextSelection: BaseSelection | null) => {
    if (isBaseSelectionEqual(currentSelection, nextSelection)) {
      return
    }

    currentSelection = nextSelection
    callbacks.onSelectionChange(nextSelection)
    redrawOverlay(overlayLayer, world, currentLayout, currentSelection, currentPreview)
  }

  const setPreview = (nextPreview: PlacementPreview) => {
    if (isPlacementPreviewEqual(currentPreview, nextPreview)) {
      return
    }

    currentPreview = nextPreview
    callbacks.onPreviewChange(nextPreview)
    redrawOverlay(overlayLayer, world, currentLayout, currentSelection, currentPreview)
  }

  const setLayout = (nextLayout: BaseLayoutState) => {
    if (isBaseLayoutStateEqual(currentLayout, nextLayout)) {
      return
    }

    currentLayout = cloneLayout(nextLayout)
    renderLayout()
  }

  const setEditorState = (nextEditorState: BaseEditorState) => {
    if (isBaseEditorStateEqual(currentEditorState, nextEditorState)) {
      return
    }

    currentEditorState = { ...nextEditorState }
    gestureState = { kind: "idle" }
    setPreview(null)
  }

  const resolveWorldPoint = (event: FederatedPointerEvent) => {
    return toWorldPoint(camera, event.global.x, event.global.y)
  }

  const updatePreviewForPointer = (event: FederatedPointerEvent) => {
    const worldPoint = resolveWorldPoint(event)
    const target = pickPointerTarget(currentLayout, world, worldPoint)
    const preview = resolvePlacementPreview({
      layout: currentLayout,
      terrain,
      world,
      editorState: currentEditorState,
      point: worldPoint,
    })

    setTooltip(target, event.global.x, event.global.y)
    setPreview(preview)
  }

  const commitMutation = (mutation: {
    nextLayout: BaseLayoutState
    changed: boolean
    selection: BaseSelection | null
    message: string
  }) => {
    if (mutation.changed) {
      currentLayout = cloneLayout(mutation.nextLayout)
      callbacks.onLayoutChange(cloneLayout(currentLayout))
      renderLayout()
    }

    callbacks.onStatusMessage(mutation.message)
    setSelection(mutation.selection)
  }

  const handleStructureCommit = (edges: EdgeCoord[]) => {
    const definition = resolveDefinitionForTool(
      currentEditorState.tool,
      currentEditorState.activeDefinitionId
    )

    if (!definition) {
      callbacks.onStatusMessage("当前工具缺少建筑定义。")
      return
    }

    commitMutation(
      applyStructurePlacement({
        layout: currentLayout,
        terrain,
        world,
        definitionId: definition.id,
        edges,
      })
    )
  }

  const handleAreaCommit = (origin: SubcellCoord) => {
    const definition = resolveDefinitionForTool(
      currentEditorState.tool,
      currentEditorState.activeDefinitionId
    )

    if (!definition) {
      callbacks.onStatusMessage("当前工具缺少建筑定义。")
      return
    }

    commitMutation(
      applyAreaPlacement({
        layout: currentLayout,
        terrain,
        world,
        definitionId: definition.id,
        origin,
        rotation: currentEditorState.rotation,
      })
    )
  }

  const handleAreaBrushCommit = (origins: SubcellCoord[]) => {
    const definition = resolveDefinitionForTool(
      currentEditorState.tool,
      currentEditorState.activeDefinitionId
    )

    if (!definition) {
      callbacks.onStatusMessage("当前工具缺少建筑定义。")
      return
    }

    commitMutation(
      applyAreaBrushPlacement({
        layout: currentLayout,
        terrain,
        world,
        definitionId: definition.id,
        origins,
        rotation: currentEditorState.rotation,
      })
    )
  }

  const handleDemolishCommit = (buildingIds: string[]) => {
    commitMutation(removeBuildingsByIds(currentLayout, buildingIds))
  }

  const clearTouchGesture = () => {
    pinchDistance = null
    pinchCenter = null
  }

  const zoomAtPoint = (screenX: number, screenY: number, nextZoom: number) => {
    const changed = zoomCameraAtPoint({
      camera,
      world,
      viewportWidth: app.renderer.width,
      viewportHeight: app.renderer.height,
      screenX,
      screenY,
      nextZoom,
    })

    if (!changed) {
      return
    }

    syncCamera()
    callbacks.onZoomPercentChange(Math.round(camera.zoom * 100))
  }

  const onPointerDown = (event: FederatedPointerEvent) => {
    host.focus()
    activePointers.set(event.pointerId, { x: event.global.x, y: event.global.y })

    if (isTouchLike(event) && activePointers.size > 1) {
      gestureState = { kind: "idle" }
      setPreview(null)
      return
    }

    const worldPoint = resolveWorldPoint(event)
    const preview = resolvePlacementPreview({
      layout: currentLayout,
      terrain,
      world,
      editorState: currentEditorState,
      point: worldPoint,
    })

    if (currentEditorState.tool === "select") {
      gestureState = { kind: "pending-select" }
      setPreview(preview)
      return
    }

    if (currentEditorState.tool === "demolish") {
      const target = pickPointerTarget(currentLayout, world, worldPoint)
      const initialIds = resolveDemolishIdsFromTargets(target ? [target] : [])
      gestureState = {
        kind: "demolish-drag",
        buildingIds: new Set(initialIds),
      }
      setPreview(preview)
      return
    }

    if (preview?.footprint?.kind === "edge") {
      gestureState = {
        kind: "structure-drag",
        startEdge: preview.footprint.edge,
        currentEdge: preview.footprint.edge,
      }
      setPreview(preview)
      return
    }

    if (preview?.footprint?.kind === "area") {
      const definition = resolveDefinitionForTool(
        currentEditorState.tool,
        currentEditorState.activeDefinitionId
      )

      if (definition?.footprint.kind === "subcell-area" && definition.footprint.brushable) {
        gestureState = {
          kind: "brush-drag",
          startOrigin: preview.footprint.origin,
          currentOrigin: preview.footprint.origin,
        }
      } else {
        gestureState = {
          kind: "pending-area",
          origin: preview.footprint.origin,
        }
      }

      setPreview(preview)
    }
  }

  const onPointerMove = (event: FederatedPointerEvent) => {
    if (activePointers.has(event.pointerId)) {
      activePointers.set(event.pointerId, { x: event.global.x, y: event.global.y })
    }

    if (isTouchLike(event) && activePointers.size > 1) {
      const points = [...activePointers.values()]

      if (points.length < 2) {
        return
      }

      const first = points[0]
      const second = points[1]
      const nextCenter = {
        x: (first.x + second.x) / 2,
        y: (first.y + second.y) / 2,
      }
      const nextDistance = Math.hypot(first.x - second.x, first.y - second.y)

      if (pinchCenter) {
        camera.x += nextCenter.x - pinchCenter.x
        camera.y += nextCenter.y - pinchCenter.y
      }

      if (pinchDistance && nextDistance > 0) {
        zoomAtPoint(nextCenter.x, nextCenter.y, camera.zoom * (nextDistance / pinchDistance))
      } else {
        syncCamera()
      }

      pinchCenter = nextCenter
      pinchDistance = nextDistance
      callbacks.onTooltipChange(null)
      return
    }

    updatePreviewForPointer(event)

    const worldPoint = resolveWorldPoint(event)

    if (gestureState.kind === "structure-drag") {
      const preview = resolvePlacementPreview({
        layout: currentLayout,
        terrain,
        world,
        editorState: currentEditorState,
        point: worldPoint,
      })

      if (preview?.footprint?.kind === "edge") {
        gestureState = {
          ...gestureState,
          currentEdge: preview.footprint.edge,
        }
      }

      return
    }

    if (gestureState.kind === "brush-drag") {
      const preview = resolvePlacementPreview({
        layout: currentLayout,
        terrain,
        world,
        editorState: currentEditorState,
        point: worldPoint,
      })

      if (preview?.footprint?.kind === "area") {
        gestureState = {
          ...gestureState,
          currentOrigin: preview.footprint.origin,
        }
      }

      return
    }

    if (gestureState.kind === "demolish-drag") {
      const target = pickPointerTarget(currentLayout, world, worldPoint)

      if (target?.type === "building") {
        gestureState.buildingIds.add(target.buildingId)
      }
    }
  }

  const finishPointer = (event: FederatedPointerEvent) => {
    activePointers.delete(event.pointerId)

    if (isTouchLike(event) && activePointers.size > 0) {
      return
    }

    clearTouchGesture()

    if (gestureState.kind === "pending-select") {
      const selection = resolveSelectionAtPoint(currentLayout, world, resolveWorldPoint(event))
      setSelection(selection)
      gestureState = { kind: "idle" }
      return
    }

    if (gestureState.kind === "pending-area") {
      handleAreaCommit(gestureState.origin)
      gestureState = { kind: "idle" }
      return
    }

    if (gestureState.kind === "structure-drag") {
      const edges =
        resolveStructureDragEdges(gestureState.startEdge, gestureState.currentEdge) ??
        [gestureState.startEdge]
      handleStructureCommit(edges)
      gestureState = { kind: "idle" }
      return
    }

    if (gestureState.kind === "brush-drag") {
      const origins = resolveBrushPath(gestureState.startOrigin, gestureState.currentOrigin)
      handleAreaBrushCommit(origins)
      gestureState = { kind: "idle" }
      return
    }

    if (gestureState.kind === "demolish-drag") {
      handleDemolishCommit([...gestureState.buildingIds])
      gestureState = { kind: "idle" }
      return
    }
  }

  const tick = () => {
    const horizontalInput = (pressedKeys.has("d") ? 1 : 0) - (pressedKeys.has("a") ? 1 : 0)
    const verticalInput = (pressedKeys.has("s") ? 1 : 0) - (pressedKeys.has("w") ? 1 : 0)

    if (horizontalInput === 0 && verticalInput === 0) {
      return
    }

    const deltaMs = Math.max(0, app.ticker.deltaMS)
    const step = (BASE_CAMERA_KEYBOARD_PAN_SPEED * deltaMs) / 1000

    camera.x -= horizontalInput * step
    camera.y -= verticalInput * step
    syncCamera()
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
  worldContainer.addChild(terrainLayer)
  worldContainer.addChild(gridLayer)
  worldContainer.addChild(subgridLayer)
  worldContainer.addChild(structureLayer)
  worldContainer.addChild(buildingLayer)
  worldContainer.addChild(overlayLayer)
  app.stage.addChild(worldContainer)

  drawBackground(backgroundLayer, world)
  drawTerrain(terrainLayer, world, terrain)
  renderLayout()
  centerCamera()

  app.stage.on("pointerdown", onPointerDown)
  app.stage.on("pointermove", onPointerMove)
  app.stage.on("pointerup", finishPointer)
  app.stage.on("pointerupoutside", finishPointer)
  app.stage.on("pointercancel", finishPointer)
  app.stage.on("pointerout", () => {
    callbacks.onTooltipChange(null)
  })
  app.ticker.add(tick)

  wheelHandler = (event: WheelEvent) => {
    event.preventDefault()
    const direction = Math.sign(event.deltaY)
    const nextZoom = camera.zoom - direction * ZOOM_STEP
    zoomAtPoint(event.offsetX, event.offsetY, nextZoom)
  }

  keydownHandler = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null
    const tagName = target?.tagName?.toLowerCase() ?? ""

    if (tagName === "input" || tagName === "textarea" || target?.isContentEditable) {
      return
    }

    if (event.key === "w" || event.key === "a" || event.key === "s" || event.key === "d") {
      pressedKeys.add(event.key)
    }
  }

  keyupHandler = (event: KeyboardEvent) => {
    if (event.key === "w" || event.key === "a" || event.key === "s" || event.key === "d") {
      pressedKeys.delete(event.key)
    }
  }

  app.canvas.addEventListener("wheel", wheelHandler, { passive: false })
  window.addEventListener("keydown", keydownHandler)
  window.addEventListener("keyup", keyupHandler)

  resizeObserver = new ResizeObserver(() => {
    if (!destroyed) {
      resize()
    }
  })
  resizeObserver.observe(host)

  return {
    zoomIn: () => {
      zoomAtPoint(app.renderer.width / 2, app.renderer.height / 2, camera.zoom + ZOOM_STEP)
    },
    zoomOut: () => {
      zoomAtPoint(app.renderer.width / 2, app.renderer.height / 2, camera.zoom - ZOOM_STEP)
    },
    setLayout: (nextLayout) => {
      setLayout(nextLayout)
    },
    setEditorState: (nextEditorState) => {
      setEditorState(nextEditorState)
    },
    destroy: () => {
      destroyed = true
      callbacks.onTooltipChange(null)
      callbacks.onPreviewChange(null)
      pressedKeys.clear()
      activePointers.clear()
      resizeObserver?.disconnect()
      resizeObserver = null

      if (wheelHandler) {
        app.canvas.removeEventListener("wheel", wheelHandler)
      }

      if (keydownHandler) {
        window.removeEventListener("keydown", keydownHandler)
      }

      if (keyupHandler) {
        window.removeEventListener("keyup", keyupHandler)
      }

      app.destroy(true, {
        children: true,
      })
    },
  }
}
