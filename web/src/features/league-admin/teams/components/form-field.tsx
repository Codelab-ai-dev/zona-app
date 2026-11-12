import type { ComponentProps, ReactNode } from 'react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type FormFieldProps = Omit<ComponentProps<typeof Input>, 'id'> & {
  id: string
  label: ReactNode
  error?: string
}

/** Label + input + inline error wired with aria-invalid / aria-describedby. */
export function FormField({ id, label, error, ...inputProps }: FormFieldProps) {
  const errorId = `${id}-error`
  return (
    <div>
      <Label htmlFor={id} className="mb-1.5 block text-[10px] text-gray-400 md:text-xs">
        {label}
      </Label>
      <Input id={id} aria-invalid={error ? true : undefined} aria-describedby={error ? errorId : undefined} className="h-9 border-white/10 bg-slate-800/50 text-sm text-white placeholder:text-gray-500" {...inputProps} />
      {error && (
        <p id={errorId} className="mt-1 text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}
