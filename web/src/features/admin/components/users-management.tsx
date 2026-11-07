import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { QueryState } from '@/components/states'
import { useAdminUsers } from '../api'
import type { User } from '../types'
import { UsersTable } from './users-table'
import { CreateUserDialog } from './create-user-dialog'
import { EditUserDialog } from './edit-user-dialog'
import { DeactivateUserDialog } from './deactivate-user-dialog'

export function UsersManagement() {
  const users = useAdminUsers()
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [deactivateConfirm, setDeactivateConfirm] = useState<User | null>(null)

  const handleEditClick = (user: User) => {
    setEditingUser(user)
    setEditOpen(true)
  }

  const handleDeactivateClick = (user: User) => {
    setDeactivateConfirm(user)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Gestión de Usuarios</h2>
          <p className="text-sm text-muted-foreground">Administra usuarios del sistema</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Usuario
        </Button>
      </div>

      <QueryState query={users} loadingLabel="Cargando usuarios…" isEmpty={(res) => res.data.length === 0}>
        {(res) => (
          <UsersTable
            users={res.data}
            onEditClick={handleEditClick}
            onDeactivateClick={handleDeactivateClick}
          />
        )}
      </QueryState>

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} />
      <EditUserDialog open={editOpen} onOpenChange={setEditOpen} user={editingUser} />
      <DeactivateUserDialog open={!!deactivateConfirm} onOpenChange={() => setDeactivateConfirm(null)} user={deactivateConfirm} />
    </div>
  )
}
