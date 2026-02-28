import { useMemo, useState } from "react"

import { CharacterRoster } from "@/components/panels/character-roster"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { NODE_KIND_LABEL } from "@/features/map/constants"
import {
  WASTELAND_MAP_NODES,
  WASTELAND_MAP_OBSTACLES,
  WASTELAND_WORLD_CONFIG,
} from "@/features/map/data/wasteland-map"
import { buildNavigationGrid } from "@/features/map/lib/pathfinding"
import { buildLocationCharacterMap } from "@/features/map/lib/location-characters"
import { createNpcSquadTemplates } from "@/features/map/lib/npc-squads"
import { PixiMapCanvas } from "@/features/map/ui/pixi-map-canvas"
import type { NpcSquadSnapshot } from "@/features/map/types"

type DetailsSelection =
  | { type: "node"; nodeId: string }
  | { type: "squad"; squad: NpcSquadSnapshot }
  | null

export function MapPanel() {
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

  const selectedCharacters = selectedNode
    ? locationCharacters[selectedNode.id] ?? []
    : []

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

  return (
    <>
      <section className="h-full w-full">
        <PixiMapCanvas
          world={WASTELAND_WORLD_CONFIG}
          nodes={WASTELAND_MAP_NODES}
          obstacles={WASTELAND_MAP_OBSTACLES}
          npcSquads={npcSquads}
          onNodeSelect={handleNodeSelect}
          onSquadSelect={handleSquadSelect}
          className="h-full w-full rounded-none border-0"
        />
      </section>
      <Sheet open={isDetailsOpen} onOpenChange={handleDetailsOpenChange}>
        <SheetContent side="right" className="p-0">
          <div className="flex h-full min-h-0 flex-col">
            <SheetHeader className="border-b px-4 py-3">
              <div className="flex items-center justify-between gap-3 pr-7">
                <SheetTitle>
                  {selectedNode?.name ?? selectedSquad?.name ?? "详情面板"}
                </SheetTitle>
                {selectedNode ? (
                  <Badge variant="secondary">
                    {NODE_KIND_LABEL[selectedNode.kind]}
                  </Badge>
                ) : selectedSquad ? (
                  <Badge variant="secondary">NPC队伍</Badge>
                ) : null}
              </div>
              <SheetDescription>
                {selectedNode
                  ? "点击地图地点后查看驻留角色与能力信息。"
                  : selectedSquad
                    ? "查看队伍成员与当前位置。"
                    : "点击地图地点或NPC队伍查看详情。"}
              </SheetDescription>
            </SheetHeader>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {selectedNode ? (
                <CharacterRoster characters={selectedCharacters} />
              ) : selectedSquad ? (
                <div className="space-y-3">
                  <Card size="sm">
                    <CardHeader>
                      <CardTitle>队伍状态</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm">
                      <p>
                        当前位置: ({Math.round(selectedSquad.position.x)},{" "}
                        {Math.round(selectedSquad.position.y)})
                      </p>
                      <p>移动状态: {selectedSquad.moving ? "移动中" : "停留中"}</p>
                      <p>成员数量: {selectedSquad.members.length}</p>
                    </CardContent>
                  </Card>
                  <CharacterRoster characters={selectedSquad.members} />
                </div>
              ) : (
                <Card size="sm">
                  <CardHeader>
                    <CardTitle>详情面板</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">
                      请选择地图上的地点或NPC队伍。
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
