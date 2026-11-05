import { cn } from "@/ui/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-sm bg-foreground/15", className)}
      {...props}
    />
  )
}

export { Skeleton }
