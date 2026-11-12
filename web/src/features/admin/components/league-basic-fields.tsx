import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export interface LeagueDraft {
  name: string
  slug: string
  description: string
}

const inputClass = 'bg-slate-700/50 border-white/10 text-white placeholder:text-gray-500'

/** Name, public URL and description of a league. */
export function LeagueBasicFields({
  value,
  errors,
  onNameChange,
  onChange,
}: {
  value: LeagueDraft
  errors: Record<string, string>
  onNameChange: (name: string) => void
  onChange: (patch: Partial<LeagueDraft>) => void
}) {
  return (
    <>
      <div>
        <Label htmlFor="name" className="text-gray-400 text-sm">Nombre de la Liga *</Label>
        <Input
          className={inputClass}
          id="name"
          value={value.name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Liga Premier Mexicana"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'name-error' : undefined}
        />
        {errors.name && <p id="name-error" className="text-xs text-destructive mt-1">{errors.name}</p>}
      </div>

      <div>
        <Label htmlFor="slug" className="text-gray-400 text-sm">URL Personalizada *</Label>
        <Input
          className={inputClass}
          id="slug"
          value={value.slug}
          onChange={(e) => onChange({ slug: e.target.value.toLowerCase() })}
          placeholder="liga-premier-mexicana"
          aria-invalid={!!errors.slug}
          aria-describedby={errors.slug ? 'slug-error' : undefined}
        />
        {errors.slug && <p id="slug-error" className="text-xs text-destructive mt-1">{errors.slug}</p>}
      </div>

      <div>
        <Label htmlFor="description" className="text-gray-400 text-sm">Descripción *</Label>
        <Textarea
          className={inputClass}
          id="description"
          value={value.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Descripción de la liga…"
          aria-invalid={!!errors.description}
          aria-describedby={errors.description ? 'description-error' : undefined}
        />
        {errors.description && <p id="description-error" className="text-xs text-destructive mt-1">{errors.description}</p>}
      </div>
    </>
  )
}
