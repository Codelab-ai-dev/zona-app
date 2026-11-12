import { Search } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { statusFilterLabels, transactionTypes } from './transaction-types'

export interface TransactionFilterState {
  search: string
  status: string
  type: string
}

export const noFilters: TransactionFilterState = { search: '', status: 'all', type: 'all' }

const glassField = 'backdrop-blur-md bg-white/10 border-white/20 text-white'

/** Search (`q`), status and type: all server-side filters. */
export function FinanceFilters({ value, onChange }: { value: TransactionFilterState; onChange: (next: TransactionFilterState) => void }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="relative sm:flex-1">
        <Label htmlFor="filter-search" className="sr-only">
          Buscar transacciones
        </Label>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" aria-hidden="true" />
        <Input
          id="filter-search"
          placeholder="Buscar por descripción, equipo..."
          value={value.search}
          onChange={(e) => onChange({ ...value, search: e.target.value })}
          className={`pl-10 placeholder:text-white/50 ${glassField}`}
        />
      </div>
      <div className="sm:w-48">
        <Label htmlFor="filter-status" className="sr-only">
          Filtrar por estado
        </Label>
        <Select value={value.status} onValueChange={(status) => onChange({ ...value, status })}>
          <SelectTrigger id="filter-status" className={`w-full ${glassField}`}>
            <SelectValue placeholder="Todos los estados" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-white/20 text-white">
            <SelectItem value="all">Todos los estados</SelectItem>
            {Object.entries(statusFilterLabels).map(([status, label]) => (
              <SelectItem key={status} value={status}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="sm:w-56">
        <Label htmlFor="filter-type" className="sr-only">
          Filtrar por tipo
        </Label>
        <Select value={value.type} onValueChange={(type) => onChange({ ...value, type })}>
          <SelectTrigger id="filter-type" className={`w-full ${glassField}`}>
            <SelectValue placeholder="Todos los tipos" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-white/20 text-white max-h-72">
            <SelectItem value="all">Todos los tipos</SelectItem>
            {transactionTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
