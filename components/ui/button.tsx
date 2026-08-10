"use client";

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-semibold whitespace-nowrap transition-all duration-200 outline-none select-none active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground glow-primary transition-all duration-200 hover:glow-primary-strong hover:-translate-y-px hover:brightness-105 active:scale-[0.97]",
        outline:
          "border border-primary/40 bg-primary/5 text-primary backdrop-blur-md transition-all duration-200 hover:bg-primary/10 hover:border-primary/60 hover:-translate-y-px hover:glow-primary aria-expanded:bg-primary/10 aria-expanded:text-primary",
        secondary:
          "bg-secondary/15 text-secondary-foreground border border-secondary/30 backdrop-blur-md transition-all duration-200 hover:bg-secondary/25 hover:-translate-y-px hover:shadow-[0_0_16px_rgba(112,0,255,0.15)] aria-expanded:bg-secondary/20 aria-expanded:text-secondary-foreground",
        ghost:
          "transition-all duration-200 hover:bg-muted hover:text-foreground hover:-translate-y-px aria-expanded:bg-muted aria-expanded:text-foreground",
        destructive:
          "bg-error/10 text-error border border-error/20 transition-all duration-200 hover:bg-error/20 hover:-translate-y-px focus-visible:border-error/40 focus-visible:ring-error/20",
        link: "text-primary underline-offset-4 hover:underline",
        glass:
          "glass-surface text-foreground transition-all duration-200 hover:glass-floating hover:-translate-y-px",
      },
      size: {
        default:
          "h-9 gap-1.5 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-6 gap-1 px-2.5 text-xs has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 min-w-fit gap-1 px-3 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        lg: "h-10 min-w-fit gap-1.5 px-5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        icon: "size-9",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
