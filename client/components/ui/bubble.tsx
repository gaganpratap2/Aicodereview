import type * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const bubbleVariants = cva(
  "max-w-[80%] rounded-2xl border px-4 py-2.5 text-sm shadow-xs",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        muted: "border-border bg-muted text-foreground",
      },
      align: {
        start: "self-start rounded-bl-sm",
        end: "self-end rounded-br-sm",
      },
    },
    defaultVariants: {
      variant: "muted",
      align: "start",
    },
  }
)

function Bubble({
  className,
  variant,
  align,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof bubbleVariants>) {
  return (
    <div
      data-slot="bubble"
      data-align={align}
      className={cn(bubbleVariants({ variant, align }), className)}
      {...props}
    />
  )
}

function BubbleContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="bubble-content"
      className={cn("min-w-0 [overflow-wrap:anywhere]", className)}
      {...props}
    />
  )
}

export { Bubble, BubbleContent }