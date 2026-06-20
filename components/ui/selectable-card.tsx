import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const selectableCardVariants = cva(
  "rounded-2xl border text-left transition-all",
  {
    variants: {
      selected: {
        true: "border-primary bg-primary/5 ring-1 ring-primary shadow-sm",
        false: "border-border hover:border-primary/40 hover:bg-muted/30",
      },
    },
    defaultVariants: {
      selected: false,
    },
  }
)

function SelectableCard({
  className,
  selected,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof selectableCardVariants>) {
  return (
    <button
      type="button"
      data-slot="selectable-card"
      className={cn(selectableCardVariants({ selected }), className)}
      {...props}
    />
  )
}

export { SelectableCard, selectableCardVariants }
