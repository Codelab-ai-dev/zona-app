import * as React from "react"

import { cn } from "@/lib/utils"

interface InputProps extends React.ComponentProps<"input"> {
  forceLowercase?: boolean
}

function Input({ className, type, onChange, forceLowercase, ...props }: InputProps) {
  // Check if this is a password field by id or name
  const isPasswordField =
    props.id?.toLowerCase().includes('password') ||
    props.name?.toLowerCase().includes('password')

  // Fields that should NOT be uppercased
  const isExcluded =
    forceLowercase || // Respect the prop explicitly
    isPasswordField || // Password fields (even when type is "text" for visibility toggle)
    type === "password" ||
    type === "email" ||
    type === "url" ||
    type === "file" ||
    type === "date" ||
    type === "datetime-local" ||
    type === "month" ||
    type === "week" ||
    type === "time" ||
    type === "number" ||
    type === "color" ||
    type === "range" ||
    type === "hidden"

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (forceLowercase && e.target.value) {
      e.target.value = e.target.value.toLowerCase()
    } else if (!isExcluded && e.target.value) {
      // Force uppercase for non-excluded fields
      e.target.value = e.target.value.toUpperCase()
    }

    // Call the original onChange handler
    if (onChange) {
      onChange(e)
    }
  }

  return (
    <input
      type={type}
      data-slot="input"
      onChange={handleChange}
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-10 md:h-9 w-full min-w-0 border bg-transparent px-3 py-2 md:py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm touch-manipulation",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        // Apply uppercase class visually if not excluded
        !isExcluded && "uppercase placeholder:normal-case",
        // Apply lowercase class visually if forced
        forceLowercase && "lowercase placeholder:normal-case",
        className
      )}
      {...props}
    />
  )
}

export { Input }
