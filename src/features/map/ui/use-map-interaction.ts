import { useCallback, useMemo, useRef, useState } from "react"

import { NODE_KIND_LABEL } from "@/features/map/constants"
import {
  appendInteractionLog,
  filterInteractionLogsByTarget,
} from "@/features/map/lib/interaction-log"
import type {
  MapInteractionAction,
  MapInteractionActionId,
  MapInteractionTarget,
  MapNode,
  MapSessionInteractionState,
  NpcSquadSnapshot,
} from "@/features/map/types"
import type { TradeTargetRef } from "@/features/trade/types"

const NODE_ACTIONS: MapInteractionAction[] = [
  { id: "node-intel", label: "查看情报" },
  { id: "node-observe", label: "驻留观察" },
  { id: "node-resupply", label: "快速补给" },
  { id: "node-trade", label: "交易" },
]

const SQUAD_ACTIONS: MapInteractionAction[] = [
  { id: "squad-talk", label: "交谈" },
  { id: "squad-observe", label: "观察" },
  { id: "squad-follow", label: "标记跟随" },
  { id: "squad-trade", label: "交易" },
]

function isNodeAction(actionId: MapInteractionActionId) {
  return (
    actionId === "node-intel" ||
    actionId === "node-observe" ||
    actionId === "node-resupply" ||
    actionId === "node-trade"
  )
}

function isSquadAction(actionId: MapInteractionActionId) {
  return (
    actionId === "squad-talk" ||
    actionId === "squad-observe" ||
    actionId === "squad-follow" ||
    actionId === "squad-trade"
  )
}

function resolveNodeMessage(actionId: MapInteractionActionId, node: MapNode) {
  switch (actionId) {
    case "node-intel":
      return `${node.name}情报已更新：${NODE_KIND_LABEL[node.kind]}。`
    case "node-observe":
      return `你在${node.name}完成驻留观察，记录了周边动向。`
    case "node-resupply":
      return `你在${node.name}完成快速补给。`
    case "node-trade":
      return `已发起与${node.name}的交易交互。`
    default:
      return null
  }
}

function resolveSquadMessage(
  actionId: MapInteractionActionId,
  squad: NpcSquadSnapshot
) {
  switch (actionId) {
    case "squad-talk":
      return `你与${squad.name}进行了简短交谈，对方保持谨慎。`
    case "squad-observe":
      return `${squad.name}当前${squad.moving ? "移动中" : "停留中"}，成员${squad.members.length}人。`
    case "squad-follow":
      return `已将${squad.name}标记为关注目标。`
    case "squad-trade":
      return `已发起与${squad.name}的交易交互。`
    default:
      return null
  }
}

export function useMapInteraction({
  selectedNode,
  selectedSquad,
  onTradeRequested,
}: {
  selectedNode: MapNode | null
  selectedSquad: NpcSquadSnapshot | null
  onTradeRequested?: (target: TradeTargetRef) => void
}) {
  const [sessionState, setSessionState] = useState<MapSessionInteractionState>({
    focusedSquadId: null,
    lastResupplyNodeId: null,
    logs: [],
  })
  const logIdRef = useRef(0)

  const target = useMemo<MapInteractionTarget | null>(() => {
    if (selectedNode) {
      return {
        type: "node",
        nodeId: selectedNode.id,
      }
    }

    if (selectedSquad) {
      return {
        type: "squad",
        squadId: selectedSquad.id,
      }
    }

    return null
  }, [selectedNode, selectedSquad])

  const availableActions = useMemo(() => {
    if (!target) {
      return [] as MapInteractionAction[]
    }

    return target.type === "node" ? NODE_ACTIONS : SQUAD_ACTIONS
  }, [target])

  const interactionLogs = useMemo(() => {
    const targetLogs = filterInteractionLogsByTarget(sessionState.logs, target)
    return targetLogs.slice().reverse()
  }, [sessionState.logs, target])

  const executeInteractionAction = useCallback(
    (actionId: MapInteractionActionId) => {
      if (!target) {
        return
      }

      if (target.type === "node") {
        if (!selectedNode || !isNodeAction(actionId)) {
          console.warn("[map] invalid node interaction action", actionId, target)
          return
        }

        const message = resolveNodeMessage(actionId, selectedNode)

        if (!message) {
          console.warn("[map] unresolved node interaction message", actionId, target)
          return
        }

        const entry = {
          id: `interaction-log-${++logIdRef.current}`,
          target,
          actionId,
          message,
          createdAt: Date.now(),
        }

        setSessionState((prev) => ({
          focusedSquadId: prev.focusedSquadId,
          lastResupplyNodeId:
            actionId === "node-resupply" ? selectedNode.id : prev.lastResupplyNodeId,
          logs: appendInteractionLog(prev.logs, entry),
        }))

        if (actionId === "node-trade") {
          onTradeRequested?.({
            type: "location",
            id: selectedNode.id,
            name: selectedNode.name,
            kind: selectedNode.kind,
          })
        }

        return
      }

      if (!selectedSquad || !isSquadAction(actionId)) {
        console.warn("[map] invalid squad interaction action", actionId, target)
        return
      }

      const message = resolveSquadMessage(actionId, selectedSquad)

      if (!message) {
        console.warn("[map] unresolved squad interaction message", actionId, target)
        return
      }

      const entry = {
        id: `interaction-log-${++logIdRef.current}`,
        target,
        actionId,
        message,
        createdAt: Date.now(),
      }

      setSessionState((prev) => ({
        focusedSquadId: actionId === "squad-follow" ? selectedSquad.id : prev.focusedSquadId,
        lastResupplyNodeId: prev.lastResupplyNodeId,
        logs: appendInteractionLog(prev.logs, entry),
      }))

      if (actionId === "squad-trade") {
        onTradeRequested?.({
          type: "npc-squad",
          id: selectedSquad.id,
          name: selectedSquad.name,
        })
      }
    },
    [onTradeRequested, selectedNode, selectedSquad, target]
  )

  return {
    availableActions,
    interactionLogs,
    focusedSquadId: sessionState.focusedSquadId,
    lastResupplyNodeId: sessionState.lastResupplyNodeId,
    executeInteractionAction,
  }
}
