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
      <SliderTrack className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-white/10">
        <SliderRange className="absolute h-full bg-gradient-to-r from-primary to-primary-fixed-dim shadow-[0_0_12px_rgba(0,240,255,0.35)]" />
      </SliderTrack>
      <SliderThumb className="block h-4 w-4 rounded-full border border-primary/50 bg-surface shadow-[0_0_12px_rgba(0,240,255,0.35)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:pointer-events-none disabled:opacity-50" />
    </SliderRoot>
  )
}

export { SliderComponent as Slider }
