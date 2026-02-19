import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-ds-border placeholder:text-text-muted focus-visible:border-navy focus-visible:ring-[3px] focus-visible:ring-navy/10 aria-invalid:ring-destructive/20 aria-invalid:border-destructive flex field-sizing-content min-h-16 w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-text-primary shadow-sm transition-[color,box-shadow,border-color] duration-150 outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
