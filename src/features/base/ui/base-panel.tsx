import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { PanelShell } from "@/shared/ui/panel-shell"

export function BasePanel() {
  return (
    <PanelShell>
      <Card size="sm">
        <CardHeader>
          <CardTitle>设施面板</CardTitle>
          <CardDescription>
            后续接入建筑升级、资源流转和驻防安排。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            当前为基地占位面板，等待基地系统接入。
          </p>
        </CardContent>
      </Card>
    </PanelShell>
  )
}
