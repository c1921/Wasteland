import { RotateCw, Trash2, Undo2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BASE_EQUIPMENT_DEFINITION_IDS, BASE_FURNITURE_DEFINITION_IDS } from "@/features/base/constants"
import { getBuildingDefinitionById } from "@/features/base/lib/layout"
import { PixiBaseCanvas } from "@/features/base/ui/pixi-base-canvas"
import { useBasePanelModel } from "@/features/base/ui/use-base-panel-model"
import { cn } from "@/lib/utils"

function formatFootprint(
  footprint: import("@/features/base/types").PlacedBuilding["footprint"],
  subgridDivisions: number
) {
  const widthCells = footprint.widthSubcells / subgridDivisions
  const heightCells = footprint.heightSubcells / subgridDivisions

  if (Number.isInteger(widthCells) && Number.isInteger(heightCells)) {
    return `${widthCells}x${heightCells}格`
  }

  return `${footprint.widthSubcells}x${footprint.heightSubcells}子格`
}

function DefinitionPalette({
  title,
  definitionIds,
  activeDefinitionId,
  onSelect,
}: {
  title: string
  definitionIds: readonly string[]
  activeDefinitionId: string | null
  onSelect: (definitionId: string) => void
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {definitionIds.map((definitionId) => {
          const definition = getBuildingDefinitionById(definitionId)

          if (!definition) {
            return null
          }

          return (
            <Button
              key={definition.id}
              size="sm"
              variant={activeDefinitionId === definition.id ? "default" : "outline"}
              onClick={() => {
                onSelect(definition.id)
              }}
            >
              {definition.label}
            </Button>
          )
        })}
      </CardContent>
    </Card>
  )
}

export function BasePanel() {
  const {
    world,
    terrain,
    layout,
    buildingDefinitions,
    tool,
    toolOrder,
    toolLabelMap,
    editorState,
    preview,
    previewMessage,
    selectedBuilding,
    selectedBuildingDefinition,
    selectedTerrain,
    selectedTerrainLabel,
    canRotate,
    buildingCounts,
    setSelection,
    setPreview,
    setRotation,
    setActiveDefinitionId,
    applyTool,
    handleLayoutChange,
    handleRemoveSelected,
    handleResetLayout,
  } = useBasePanelModel()

  const currentDefinition = editorState.activeDefinitionId
    ? getBuildingDefinitionById(editorState.activeDefinitionId)
    : null

  return (
    <section className="grid h-full w-full grid-rows-[auto_minmax(320px,1fr)_auto] bg-[#0d1116] lg:grid-cols-[260px_minmax(0,1fr)_340px] lg:grid-rows-1">
      <aside className="overflow-y-auto border-b border-white/8 bg-[#111821] px-3 py-3 lg:border-r lg:border-b-0">
        <div className="space-y-3">
          <Card size="sm">
            <CardHeader>
              <CardTitle>建造工具</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {toolOrder.map((toolKey) => (
                <Button
                  key={toolKey}
                  size="sm"
                  variant={tool === toolKey ? "default" : "outline"}
                  onClick={() => {
                    applyTool(toolKey)
                  }}
                >
                  {toolLabelMap[toolKey]}
                </Button>
              ))}
            </CardContent>
          </Card>

          <DefinitionPalette
            title="家具"
            definitionIds={BASE_FURNITURE_DEFINITION_IDS}
            activeDefinitionId={editorState.activeDefinitionId}
            onSelect={(definitionId) => {
              applyTool("furniture")
              setActiveDefinitionId(definitionId)
            }}
          />

          <DefinitionPalette
            title="设备"
            definitionIds={BASE_EQUIPMENT_DEFINITION_IDS}
            activeDefinitionId={editorState.activeDefinitionId}
            onSelect={(definitionId) => {
              applyTool("equipment")
              setActiveDefinitionId(definitionId)
            }}
          />

          <Card size="sm">
            <CardHeader>
              <CardTitle>操作状态</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">工具: {toolLabelMap[tool]}</Badge>
                {currentDefinition ? (
                  <Badge variant="secondary">对象: {currentDefinition.label}</Badge>
                ) : null}
                <Badge variant="secondary">旋转: {editorState.rotation}°</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!canRotate}
                  onClick={() => {
                    setRotation((editorState.rotation + 90) % 360 as 0 | 90 | 180 | 270)
                  }}
                >
                  <RotateCw />
                  旋转
                </Button>
                <Button size="sm" variant="outline" onClick={handleResetLayout}>
                  <Undo2 />
                  重置布局
                </Button>
              </div>
              <p className="text-muted-foreground text-xs">
                `Esc` 返回选择工具，`R` 旋转支持朝向的家具或设备。
              </p>
            </CardContent>
          </Card>
        </div>
      </aside>

      <div className="min-h-0 min-w-0 p-2 lg:p-3">
        <PixiBaseCanvas
          world={world}
          terrain={terrain}
          layout={layout}
          buildingDefinitions={buildingDefinitions}
          editorState={editorState}
          onLayoutChange={handleLayoutChange}
          onSelectionChange={setSelection}
          onPreviewChange={setPreview}
          className="h-full min-h-[320px] w-full"
        />
      </div>

      <aside className="overflow-y-auto border-t border-white/8 bg-[#10161f] px-3 py-3 lg:border-t-0 lg:border-l">
        <div className="space-y-3">
          <Card size="sm">
            <CardHeader>
              <CardTitle>基地概览</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-md border border-white/8 bg-black/10 px-3 py-2">
                总建筑
                <div className="mt-1 text-lg font-semibold">{buildingCounts.total}</div>
              </div>
              <div className="rounded-md border border-white/8 bg-black/10 px-3 py-2">
                结构
                <div className="mt-1 text-lg font-semibold">{buildingCounts.structure}</div>
              </div>
              <div className="rounded-md border border-white/8 bg-black/10 px-3 py-2">
                家具
                <div className="mt-1 text-lg font-semibold">{buildingCounts.furniture}</div>
              </div>
              <div className="rounded-md border border-white/8 bg-black/10 px-3 py-2">
                设备
                <div className="mt-1 text-lg font-semibold">{buildingCounts.equipment}</div>
              </div>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>放置预览</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{toolLabelMap[tool]}</Badge>
                {preview?.valid === true ? (
                  <Badge variant="secondary" className="bg-emerald-500/15 text-emerald-200">
                    可放置
                  </Badge>
                ) : preview ? (
                  <Badge variant="secondary" className="bg-rose-500/15 text-rose-200">
                    不可放置
                  </Badge>
                ) : null}
              </div>
              <p className="text-muted-foreground text-sm">{previewMessage}</p>
            </CardContent>
          </Card>

          <Card size="sm">
            <CardHeader>
              <CardTitle>当前选中</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedBuilding && selectedBuildingDefinition ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{selectedBuildingDefinition.label}</Badge>
                    <Badge variant="secondary">
                      {selectedBuildingDefinition.category === "structure"
                        ? "结构"
                        : selectedBuildingDefinition.category === "furniture"
                          ? "家具"
                          : "设备"}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p>占地: {formatFootprint(selectedBuilding.footprint, world.subgridDivisions)}</p>
                    <p>旋转: {selectedBuilding.rotation}°</p>
                    <p>定义: {selectedBuilding.definitionId}</p>
                  </div>
                  <Button size="sm" variant="destructive" onClick={handleRemoveSelected}>
                    <Trash2 />
                    删除建筑
                  </Button>
                </>
              ) : selectedTerrain && selectedTerrainLabel ? (
                <div className="space-y-2 text-sm">
                  <Badge variant="secondary">{selectedTerrainLabel}</Badge>
                  <p>
                    地形: {selectedTerrainLabel}
                  </p>
                  <p className={cn(selectedTerrain === "grass" || selectedTerrain === "sand" ? "" : "text-rose-300")}>
                    {selectedTerrain === "grass" || selectedTerrain === "sand"
                      ? "可用于建造。"
                      : "当前地形不可建造。"}
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">
                  点击地形、墙门窗或家具设备查看详情。
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </aside>
    </section>
  )
}
