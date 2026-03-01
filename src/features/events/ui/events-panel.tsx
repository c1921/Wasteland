import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { PanelShell } from "@/shared/ui/panel-shell"

export function EventsPanel() {
  return (
    <PanelShell>
      <Card size="sm">
        <CardHeader>
          <CardTitle>事件时间线</CardTitle>
          <CardDescription>
            后续接入事件列表筛选、优先级标记与过期处理。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            当前为事件占位面板，等待任务与世界事件源接入。
          </p>
        </CardContent>
      </Card>
    </PanelShell>
  )
}
