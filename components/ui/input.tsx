import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-text-muted selection:bg-navy/10 selection:text-text-primary border-ds-border h-9 w-full min-w-0 rounded-lg border bg-white px-3.5 py-2.5 text-sm text-text-primary shadow-sm transition-[color,box-shadow,border-color] duration-150 outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-navy focus-visible:ring-[3px] focus-visible:ring-navy/10",
        "aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
