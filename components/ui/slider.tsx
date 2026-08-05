"use client"

import * as React from "react"
import { Slider } from "radix-ui"

const {
  Root: SliderRoot,
  Track: SliderTrack,
  Range: SliderRange,
  Thumb: SliderThumb,
} = Slider

import { cn } from "@/lib/utils"

function SliderComponent({
  className,
  ...props
}: React.ComponentProps<typeof SliderRoot>) {
  return (
    <SliderRoot
      data-slot="slider"
      className={cn(
        "relative flex w-full touch-none select-none items-center data-[disabled]:opacity-50",
        className
      )}
      {...props}
    >
      <SliderTrack className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-muted">
        <SliderRange className="absolute h-full bg-primary" />
      </SliderTrack>
      <SliderThumb className="block h-4 w-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50" />
    </SliderRoot>
  )
}

export { SliderComponent as Slider }
