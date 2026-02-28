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
import { buildLocationCharacterMap } from "@/features/map/lib/location-characters"
import { PixiMapCanvas } from "@/features/map/ui/pixi-map-canvas"

export function MapPanel() {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const locationCharacters = useMemo(() => {
    return buildLocationCharacterMap(WASTELAND_MAP_NODES)
  }, [])

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) {
      return null
    }

    return WASTELAND_MAP_NODES.find((node) => node.id === selectedNodeId) ?? null
  }, [selectedNodeId])

  const selectedCharacters = selectedNode
    ? locationCharacters[selectedNode.id] ?? []
    : []

  const handleNodeSelect = (nodeId: string) => {
    setSelectedNodeId(nodeId)
    setIsDetailsOpen(true)
  }

  const handleDetailsOpenChange = (nextOpen: boolean) => {
    setIsDetailsOpen(nextOpen)

    if (!nextOpen) {
      setSelectedNodeId(null)
    }
  }

  return (
    <>
      <section className="h-full w-full">
        <PixiMapCanvas
          world={WASTELAND_WORLD_CONFIG}
          nodes={WASTELAND_MAP_NODES}
          obstacles={WASTELAND_MAP_OBSTACLES}
          onNodeSelect={handleNodeSelect}
          className="h-full w-full rounded-none border-0"
        />
      </section>
      <Sheet open={isDetailsOpen} onOpenChange={handleDetailsOpenChange}>
        <SheetContent side="right" className="p-0">
          <div className="flex h-full min-h-0 flex-col">
            <SheetHeader className="border-b px-4 py-3">
              <div className="flex items-center justify-between gap-3 pr-7">
                <SheetTitle>
                  {selectedNode?.name ?? "地点详情"}
                </SheetTitle>
                {selectedNode ? (
                  <Badge variant="secondary">
                    {NODE_KIND_LABEL[selectedNode.kind]}
                  </Badge>
                ) : null}
              </div>
              <SheetDescription>
                点击地图地点后查看驻留角色与能力信息。
              </SheetDescription>
            </SheetHeader>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {selectedNode ? (
                <CharacterRoster characters={selectedCharacters} />
              ) : (
                <Card size="sm">
                  <CardHeader>
                    <CardTitle>地点详情</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">请选择地图上的地点。</p>
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
