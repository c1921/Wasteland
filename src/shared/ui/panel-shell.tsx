import type { ReactNode } from "react"

type PanelShellProps = {
  children: ReactNode
}

export function PanelShell({ children }: PanelShellProps) {
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      {children}
    </section>
  )
}
