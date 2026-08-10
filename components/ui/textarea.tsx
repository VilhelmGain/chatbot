import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full resize-none rounded-lg border border-input bg-foreground/4 px-4 py-3 text-base outline-none placeholder:text-muted-foreground/60 transition-all duration-200 focus-visible:border-primary/40 focus-visible:bg-foreground/6 focus-visible:ring-[3px] focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-error/50 aria-invalid:ring-[3px] aria-invalid:ring-error/20 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
