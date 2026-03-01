import { useCallback, useMemo, useState } from "react"

import { getLocationInventoryMap, getNpcSquadInventoryMap } from "@/features/items/data/session-inventories"
import { getNpcSquadTemplates } from "@/features/map/data/npc-squads"
import {
  WASTELAND_MAP_NODES,
  WASTELAND_MAP_OBSTACLES,
  WASTELAND_WORLD_CONFIG,
} from "@/features/map/data/wasteland-map"
import { buildLocationCharacterMap } from "@/features/map/lib/location-characters"
import type {
  MapInteractionActionId,
  NpcSquadSnapshot,
} from "@/features/map/types"
import type { TradeTargetRef } from "@/features/trade/types"
import { useMapInteraction } from "@/features/map/ui/use-map-interaction"
import { useTradeNavigation } from "@/features/trade/ui/trade-navigation-store"

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

  const npcSquads = useMemo(() => {
    return getNpcSquadTemplates()
  }, [])

  const locationInventories = useMemo(() => {
    return getLocationInventoryMap(WASTELAND_MAP_NODES.map((node) => node.id))
  }, [])

  const squadInventories = useMemo(() => {
    return getNpcSquadInventoryMap(npcSquads.map((squad) => squad.id))
  }, [npcSquads])

  const selectedNode = useMemo(() => {
    if (!selection || selection.type !== "node") {
      return null
    }

    return WASTELAND_MAP_NODES.find((node) => node.id === selection.nodeId) ?? null
  }, [selection])

  const selectedSquad = selection?.type === "squad" ? selection.squad : null
  const selectedCharacters = selectedNode ? locationCharacters[selectedNode.id] ?? [] : []
  const selectedNodeItems = selectedNode ? locationInventories[selectedNode.id] ?? [] : []
  const selectedSquadItems = selectedSquad ? squadInventories[selectedSquad.id] ?? [] : []
  const { requestOpenTrade } = useTradeNavigation()
  const handleTradeRequested = useCallback(
    (target: TradeTargetRef) => {
      requestOpenTrade(target)
    },
    [requestOpenTrade]
  )
  const {
    availableActions,
    interactionLogs,
    focusedSquadId,
    lastResupplyNodeId,
    executeInteractionAction,
  } = useMapInteraction({
    selectedNode,
    selectedSquad,
    onTradeRequested: handleTradeRequested,
  })

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

  const handleInteractionAction = (actionId: MapInteractionActionId) => {
    executeInteractionAction(actionId)
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
    selectedNodeItems,
    selectedSquadItems,
    availableActions,
    interactionLogs,
    focusedSquadId,
    lastResupplyNodeId,
    handleNodeSelect,
    handleSquadSelect,
    handleInteractionAction,
    handleDetailsOpenChange,
  }
}
