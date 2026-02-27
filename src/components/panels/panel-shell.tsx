import type { ReactNode } from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type PanelShellProps = {
  title: string
  description: string
  children: ReactNode
}

export function PanelShell({ title, description, children }: PanelShellProps) {
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">{children}</CardContent>
      </Card>
    </section>
  )
}
