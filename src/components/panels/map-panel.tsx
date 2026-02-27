import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { PanelShell } from "@/components/panels/panel-shell"

export function MapPanel() {
  return (
    <PanelShell title="地图" description="查看废土区域、资源点和任务坐标。">
      <Card size="sm">
        <CardHeader>
          <CardTitle>区域总览</CardTitle>
          <CardDescription>
            后续接入地图瓦片、迷雾、地点标记和实时事件追踪。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            当前为地图占位面板，等待接入实际世界数据。
          </p>
        </CardContent>
      </Card>
    </PanelShell>
  )
}
