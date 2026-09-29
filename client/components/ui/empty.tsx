import type * as React from "react"

import { cn } from "@/lib/utils"

function Empty({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty"
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center",
        className
      )}
      {...props}
    />
  )
}

function EmptyHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-header"
      className={cn(
        "flex flex-col items-center justify-center gap-1 text-center",
        className
      )}
      {...props}
    />
  )
}

function EmptyMedia({
  variant = "icon",
  className,
  ...props
}: React.ComponentProps<"div"> & {
  variant?: "icon" | "image"
}) {
  return (
    <div
      data-slot="empty-media"
      data-variant={variant}
      className={cn(
        "flex items-center justify-center rounded-full border border-dashed bg-muted/40 text-muted-foreground",
        variant === "icon"
          ? "size-12 [&_svg]:size-5 [&_svg]:shrink-0"
          : "aspect-video w-full max-w-64 rounded-xl border-solid",
        className
      )}
      {...props}
    />
  )
}

function EmptyTitle({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="empty-title"
      className={cn("font-heading text-base font-medium text-foreground", className)}
      {...props}
    />
  )
}

function EmptyDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="empty-description"
      className={cn("max-w-sm text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription }