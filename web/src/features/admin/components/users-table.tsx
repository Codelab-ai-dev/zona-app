import { Button } from '@/components/ui/button'
import { Edit, ToggleLeft } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { User } from '../types'

interface UsersTableProps {
  users: User[]
  onEditClick: (user: User) => void
  onDeactivateClick: (user: User) => void
}

export function UsersTable({ users, onEditClick, onDeactivateClick }: UsersTableProps) {
  return (
    <div className="rounded-xl bg-slate-800/50 border border-white/10 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead>Teléfono</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id} className="border-white/5 hover:bg-slate-700/30">
              <TableCell className="font-medium text-white">{user.name}</TableCell>
              <TableCell className="text-sm text-gray-400">{user.email}</TableCell>
              <TableCell className="text-sm capitalize">{user.role.replace('_', ' ')}</TableCell>
              <TableCell className="text-sm">{user.phone || '—'}</TableCell>
              <TableCell className="text-sm">
                {user.is_active ? (
                  <span className="text-green-400">Activo</span>
                ) : (
                  <span className="text-gray-500">Inactivo</span>
                )}
              </TableCell>
              <TableCell className="text-right space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEditClick(user)}
                  aria-label="Editar usuario"
                >
                  <Edit className="h-3 w-3" />
                </Button>
                {user.is_active && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeactivateClick(user)}
                    className="text-destructive hover:text-destructive"
                    aria-label="Desactivar usuario"
                  >
                    <ToggleLeft className="h-3 w-3" />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
