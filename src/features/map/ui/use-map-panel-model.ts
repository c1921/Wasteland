import { useMemo, useState } from "react"

import {
  WASTELAND_MAP_NODES,
  WASTELAND_MAP_OBSTACLES,
  WASTELAND_WORLD_CONFIG,
} from "@/features/map/data/wasteland-map"
import { buildLocationCharacterMap } from "@/features/map/lib/location-characters"
import { createNpcSquadTemplates } from "@/features/map/lib/npc-squads"
import { buildNavigationGrid } from "@/features/map/lib/pathfinding"
import type { NpcSquadSnapshot } from "@/features/map/types"

type DetailsSelection =
  | { type: "node"; nodeId: string }
  | { type: "squad"; squad: NpcSquadSnapshot }
  | null

export function useMapPanelModel() {
  const [selection, setSelection] = useState<DetailsSelection>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  const locationCharacters = useMemo(() => {
    return buildLocationCharacterMap(WASTELAND_MAP_NODES)
  }, [])

  const navigationGrid = useMemo(() => {
    return buildNavigationGrid(WASTELAND_WORLD_CONFIG, WASTELAND_MAP_OBSTACLES)
  }, [])

  const npcSquads = useMemo(() => {
    return createNpcSquadTemplates({
      navigationGrid,
      nodes: WASTELAND_MAP_NODES,
      world: WASTELAND_WORLD_CONFIG,
    })
  }, [navigationGrid])

  const selectedNode = useMemo(() => {
    if (!selection || selection.type !== "node") {
      return null
    }

    return WASTELAND_MAP_NODES.find((node) => node.id === selection.nodeId) ?? null
  }, [selection])

  const selectedSquad = selection?.type === "squad" ? selection.squad : null
  const selectedCharacters = selectedNode ? locationCharacters[selectedNode.id] ?? [] : []

  const handleNodeSelect = (nodeId: string) => {
    setSelection({ type: "node", nodeId })
    setIsDetailsOpen(true)
  }

  const handleSquadSelect = (squad: NpcSquadSnapshot) => {
    setSelection({ type: "squad", squad })
    setIsDetailsOpen(true)
  }

  const handleDetailsOpenChange = (nextOpen: boolean) => {
    setIsDetailsOpen(nextOpen)

    if (!nextOpen) {
      setSelection(null)
    }
  }

  return {
    world: WASTELAND_WORLD_CONFIG,
    nodes: WASTELAND_MAP_NODES,
    obstacles: WASTELAND_MAP_OBSTACLES,
    npcSquads,
    isDetailsOpen,
    selectedNode,
    selectedSquad,
    selectedCharacters,
    handleNodeSelect,
    handleSquadSelect,
    handleDetailsOpenChange,
  }
}
