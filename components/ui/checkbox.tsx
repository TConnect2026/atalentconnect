"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=checked]:border-[#1F3C62] data-[state=unchecked]:border-gray-400",
        className
      )}
      style={{
        width: '18px',
        height: '18px',
        minWidth: '18px',
        minHeight: '18px',
        borderWidth: '2px',
        borderStyle: 'solid',
        borderRadius: '3px',
        backgroundColor: 'white',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        padding: 0,
        appearance: 'none',
      }}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center"
        style={{ color: '#1F3C62' }}
      >
        <Check style={{ width: '14px', height: '14px', strokeWidth: 3 }} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
