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
import { PixiMapCanvas } from "@/features/map/ui/pixi-map-canvas"
import { useMapPanelModel } from "@/features/map/ui/use-map-panel-model"

export function MapPanel() {
  const {
    world,
    nodes,
    obstacles,
    npcSquads,
    isDetailsOpen,
    selectedNode,
    selectedSquad,
    selectedCharacters,
    handleNodeSelect,
    handleSquadSelect,
    handleDetailsOpenChange,
  } = useMapPanelModel()

  return (
    <>
      <section className="h-full w-full">
        <PixiMapCanvas
          world={world}
          nodes={nodes}
          obstacles={obstacles}
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
