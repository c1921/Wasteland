import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  WASTELAND_MAP_OBSTACLES,
  WASTELAND_MAP_NODES,
  WASTELAND_WORLD_CONFIG,
} from "@/components/panels/map-data"
import { PanelShell } from "@/components/panels/panel-shell"
import { PixiMapCanvas } from "@/components/panels/pixi-map-canvas"

export function MapPanel() {
  return (
    <PanelShell title="地图" description="浏览连续废土世界，规划路线并进行自由探索。">
      <Card size="sm">
        <CardHeader>
          <CardTitle>废土连续世界地图</CardTitle>
          <CardDescription>
            支持左键拖拽、滚轮缩放、右键自动寻路，并包含不可通行区域。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PixiMapCanvas
            world={WASTELAND_WORLD_CONFIG}
            nodes={WASTELAND_MAP_NODES}
            obstacles={WASTELAND_MAP_OBSTACLES}
            className="h-[68vh] min-h-[460px] max-h-[760px]"
          />
        </CardContent>
      </Card>
    </PanelShell>
  )
}
