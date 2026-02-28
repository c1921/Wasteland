import type { LucideIcon } from "lucide-react"
import { Monitor, Moon, Sun } from "lucide-react"

import {
  useTheme,
  type BaseColor,
  type Theme,
} from "@/components/theme-context"
import { PanelShell } from "@/components/panels/panel-shell"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type ThemeOption = {
  value: Theme
  label: string
  icon: LucideIcon
}

type BaseColorOption = {
  value: BaseColor
  label: string
}

const themeOptions: ThemeOption[] = [
  { value: "light", label: "浅色", icon: Sun },
  { value: "dark", label: "深色", icon: Moon },
  { value: "system", label: "跟随系统", icon: Monitor },
]

const baseColorOptions: BaseColorOption[] = [
  { value: "gray", label: "Gray" },
  { value: "neutral", label: "Neutral" },
  { value: "slate", label: "Slate" },
  { value: "stone", label: "Stone" },
  { value: "zinc", label: "Zinc" },
]

const themeLabels: Record<Theme, string> = {
  light: "浅色",
  dark: "深色",
  system: "跟随系统",
}

const baseColorLabels: Record<BaseColor, string> = {
  gray: "Gray",
  neutral: "Neutral",
  slate: "Slate",
  stone: "Stone",
  zinc: "Zinc",
}

export function SettingsPanel() {
  const {
    theme,
    setTheme,
    baseColor,
    setBaseColor,
  } = useTheme()

  return (
    <PanelShell title="设置" description="调整视觉主题和基础偏好。">
      <Card size="sm">
        <CardHeader>
          <CardTitle>主题</CardTitle>
          <CardDescription>
            选择明暗模式与底色，设置会保存在本地浏览器。
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-3">
            <p className="text-xs font-semibold">明暗模式</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {themeOptions.map((option) => {
                const Icon = option.icon
                const isActive = theme === option.value

                return (
                  <Button
                    key={option.value}
                    type="button"
                    variant={isActive ? "default" : "outline"}
                    className="h-auto justify-start gap-2 py-2"
                    aria-pressed={isActive}
                    onClick={() => setTheme(option.value)}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                    {option.label}
                  </Button>
                )
              })}
            </div>
            <p className="text-muted-foreground text-xs">
              当前模式: {themeLabels[theme]}
            </p>
          </div>

          <div className="grid gap-3">
            <p className="text-xs font-semibold">底色（Base Color）</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {baseColorOptions.map((option) => {
                const isActive = baseColor === option.value

                return (
                  <Button
                    key={option.value}
                    type="button"
                    variant={isActive ? "default" : "outline"}
                    className="h-auto justify-center py-2"
                    aria-pressed={isActive}
                    onClick={() => setBaseColor(option.value)}
                  >
                    {option.label}
                  </Button>
                )
              })}
            </div>
            <p className="text-muted-foreground text-xs">
              当前底色: {baseColorLabels[baseColor]}
            </p>
          </div>
        </CardContent>
      </Card>
    </PanelShell>
  )
}
