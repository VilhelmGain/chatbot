"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type CheckboxProps = {
  checked?: boolean;
  className?: string;
  disabled?: boolean;
  id?: string;
  onCheckedChange?: (checked: boolean) => void;
} & React.ComponentPropsWithoutRef<"button">;

function Checkbox({
  checked = false,
  className,
  disabled,
  id,
  onCheckedChange,
  ...props
}: CheckboxProps) {
  return (
    <button
      type="button"
      id={id}
      role="checkbox"
      aria-checked={checked}
      data-state={checked ? "checked" : "unchecked"}
      disabled={disabled}
      className={cn(
        "peer size-4 shrink-0 rounded-md border border-white/20 bg-white/5 shadow-xs transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=checked]:shadow-[0_0_12px_rgba(0,240,255,0.35)]",
        className
      )}
      onClick={() => onCheckedChange?.(!checked)}
      {...props}
    >
      {checked ? (
        <span className="flex items-center justify-center text-current">
          <Check className="size-3" />
        </span>
      ) : null}
    </button>
  );
}

export { Checkbox };
