import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-lg bg-gradient-to-r from-white/5 via-primary/10 to-white/5 bg-[length:200%_100%]", className)}
      {...props}
    />
  )
}

export { Skeleton }
