import {
  Circle,
  Container,
  Graphics,
  type FederatedPointerEvent,
} from "pixi.js"

import { NODE_KIND_LABEL, NODE_STYLE_MAP } from "@/features/map/constants"
import {
  toNpcSquadSnapshot,
  type NpcSquadRuntime,
} from "@/features/map/lib/npc-squads"
import type { MapThemePalette } from "@/features/map/render/map-theme"
import type { MapNode, MapObstacle, WorldConfig, WorldPoint } from "@/features/map/types"

function flattenPolygon(polygon: WorldPoint[]) {
  const points: number[] = []

  for (const point of polygon) {
    points.push(point.x, point.y)
  }

  return points
}

export function drawBackground(
  backgroundLayer: Graphics,
  world: WorldConfig,
  mapTheme: MapThemePalette
) {
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

export function drawObstacles(obstacleLayer: Graphics, obstacles: MapObstacle[]) {
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

export function drawPath(pathLayer: Graphics, points: WorldPoint[]) {
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

export function drawPlayerMarker(
  playerMarker: Graphics,
  player: { x: number; y: number }
) {
  playerMarker.clear()
  playerMarker.circle(0, 0, 16).fill({ color: 0x88bbd0, alpha: 0.16 })
  playerMarker.circle(0, 0, 9.6).stroke({ width: 2, color: 0xb6d5e4, alpha: 0.95 })
  playerMarker.circle(0, 0, 4.6).fill({ color: 0xe4f2fb, alpha: 1 })
  playerMarker.position.set(player.x, player.y)
}

export function drawNodes({
  nodeLayer,
  nodes,
  showTooltip,
  clearTooltip,
  onNodeSelect,
}: {
  nodeLayer: Container
  nodes: MapNode[]
  showTooltip: (name: string, subtitle: string, x: number, y: number) => void
  clearTooltip: () => void
  onNodeSelect: (nodeId: string) => void
}) {
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
    marker.on("pointerout", clearTooltip)
    marker.on("pointerdown", (event: FederatedPointerEvent) => {
      event.stopPropagation()
    })
    marker.on("pointertap", (event: FederatedPointerEvent) => {
      event.stopPropagation()
      onNodeSelect(node.id)
    })

    nodeLayer.addChild(marker)
  }
}

export function drawNpcSquads({
  npcLayer,
  npcSquadRuntimes,
  npcMarkers,
  showTooltip,
  clearTooltip,
  onSquadSelect,
}: {
  npcLayer: Container
  npcSquadRuntimes: NpcSquadRuntime[]
  npcMarkers: Map<string, Graphics>
  showTooltip: (name: string, subtitle: string, x: number, y: number) => void
  clearTooltip: () => void
  onSquadSelect: (snapshot: ReturnType<typeof toNpcSquadSnapshot>) => void
}) {
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
    marker.on("pointerout", clearTooltip)
    marker.on("pointerdown", (event: FederatedPointerEvent) => {
      event.stopPropagation()
    })
    marker.on("pointertap", (event: FederatedPointerEvent) => {
      event.stopPropagation()
      onSquadSelect(toNpcSquadSnapshot(squad))
    })

    npcLayer.addChild(marker)
    npcMarkers.set(squad.id, marker)
  }
}

export function updateNpcMarkerPosition(
  npcMarkers: Map<string, Graphics>,
  squad: NpcSquadRuntime
) {
  const marker = npcMarkers.get(squad.id)

  if (!marker) {
    return
  }

  marker.position.set(squad.mover.x, squad.mover.y)
}
