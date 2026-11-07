import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Plus, Edit, ToggleLeft } from 'lucide-react'
import { QueryState } from '@/components/states'
import { toast } from 'sonner'
import { useAdminUsers, useCreateLeagueAdmin, useUpdateUser, useDeactivateUser } from '../api'
import type { User, CreateUserRequest, UpdateUserRequest } from '../types'
import { ApiError } from '@/lib/api/client'
import { Loader2 } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function UsersManagement() {
  const users = useAdminUsers()
  const createUser = useCreateLeagueAdmin()
  const updateUser = useUpdateUser()
  const deactivateUser = useDeactivateUser()

  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [deactivateConfirm, setDeactivateConfirm] = useState<User | null>(null)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [createForm, setCreateForm] = useState<Partial<CreateUserRequest> & { confirmPassword?: string }>({
    role: 'league_admin',
  })
  const [editForm, setEditForm] = useState<Partial<UpdateUserRequest>>({})

  const handleCreateSubmit = async () => {
    setFormErrors({})

    if (!createForm.email || !createForm.password || !createForm.name) {
      setFormErrors({
        email: createForm.email ? '' : 'requerido',
        password: createForm.password ? '' : 'requerido',
        name: createForm.name ? '' : 'requerido',
      })
      return
    }

    if ((createForm.password?.length ?? 0) < 10) {
      setFormErrors({ password: 'mínimo 10 caracteres' })
      return
    }

    if (createForm.password !== createForm.confirmPassword) {
      setFormErrors({ confirmPassword: 'no coincide' })
      return
    }

    try {
      const { email, password, name, role, phone, league_id } = createForm
      await createUser.mutateAsync({ email, password, name, role, phone, league_id } as CreateUserRequest)
      toast.success('Usuario creado exitosamente')
      setCreateOpen(false)
      setCreateForm({ role: 'league_admin' })
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.isValidation && err.fields) {
          setFormErrors(err.fields)
        } else if (err.status === 409) {
          setFormErrors({ email: 'ya existe' })
        } else {
          toast.error(err.message)
        }
      } else {
        toast.error('Error al crear el usuario')
      }
    }
  }

  const handleEditSubmit = async () => {
    if (!editingUser) return

    setFormErrors({})
    try {
      await updateUser.mutateAsync({ id: editingUser.id, data: editForm as UpdateUserRequest })
      toast.success('Usuario actualizado exitosamente')
      setEditOpen(false)
      setEditingUser(null)
      setEditForm({})
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.isValidation && err.fields) {
          setFormErrors(err.fields)
        } else if (err.status === 409) {
          setFormErrors({ email: 'ya existe' })
        } else {
          toast.error(err.message)
        }
      } else {
        toast.error('Error al actualizar el usuario')
      }
    }
  }

  const handleDeactivate = async () => {
    if (!deactivateConfirm) return

    try {
      await deactivateUser.mutateAsync(deactivateConfirm.id)
      toast.success('Usuario desactivado exitosamente')
      setDeactivateConfirm(null)
    } catch {
      toast.error('Error al desactivar el usuario')
    }
  }

  const handleEditClick = (user: User) => {
    setEditingUser(user)
    setEditForm({
      name: user.name,
      email: user.email,
      phone: user.phone,
      is_active: user.is_active,
    })
    setFormErrors({})
    setEditOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Gestión de Usuarios</h2>
          <p className="text-sm text-muted-foreground">Administra usuarios del sistema</p>
        </div>
        <Button onClick={() => {
          setCreateForm({ role: 'league_admin' })
          setFormErrors({})
          setCreateOpen(true)
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Usuario
        </Button>
      </div>

      <QueryState query={users} loadingLabel="Cargando usuarios…" isEmpty={(res) => res.data.length === 0}>
        {(res) => (
          <div className="border rounded-lg overflow-hidden">
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
                {res.data.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-sm">{user.email}</TableCell>
                    <TableCell className="text-sm capitalize">{user.role.replace('_', ' ')}</TableCell>
                    <TableCell className="text-sm">{user.phone || '—'}</TableCell>
                    <TableCell className="text-sm">
                      {user.is_active ? (
                        <span className="text-green-600">Activo</span>
                      ) : (
                        <span className="text-gray-500">Inactivo</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(user)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      {user.is_active && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeactivateConfirm(user)}
                          className="text-destructive hover:text-destructive"
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
        )}
      </QueryState>

      {/* Create User Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Crear Usuario</DialogTitle>
            <DialogDescription>Crea un nuevo usuario en el sistema</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="create-name">Nombre Completo *</Label>
              <Input
                id="create-name"
                value={createForm.name || ''}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Juan Pérez"
                aria-invalid={!!formErrors.name}
              />
              {formErrors.name && <p className="text-xs text-destructive mt-1">{formErrors.name}</p>}
            </div>

            <div>
              <Label htmlFor="create-email">Email *</Label>
              <Input
                id="create-email"
                type="email"
                value={createForm.email || ''}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="juan@ejemplo.com"
                aria-invalid={!!formErrors.email}
              />
              {formErrors.email && <p className="text-xs text-destructive mt-1">{formErrors.email}</p>}
            </div>

            <div>
              <Label htmlFor="create-password">Contraseña (mín. 10 caracteres) *</Label>
              <Input
                id="create-password"
                type="password"
                value={createForm.password || ''}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="••••••••••"
                aria-invalid={!!formErrors.password}
              />
              {formErrors.password && <p className="text-xs text-destructive mt-1">{formErrors.password}</p>}
            </div>

            <div>
              <Label htmlFor="create-confirm">Confirmar Contraseña *</Label>
              <Input
                id="create-confirm"
                type="password"
                value={createForm.confirmPassword || ''}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="••••••••••"
                aria-invalid={!!formErrors.confirmPassword}
              />
              {formErrors.confirmPassword && <p className="text-xs text-destructive mt-1">{formErrors.confirmPassword}</p>}
            </div>

            <div>
              <Label htmlFor="create-role">Rol *</Label>
              <Select
                value={createForm.role || ''}
                onValueChange={(v) => setCreateForm((prev) => ({ ...prev, role: v as 'league_admin' | 'team_owner' }))}
              >
                <SelectTrigger id="create-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="league_admin">Administrador de Liga</SelectItem>
                  <SelectItem value="team_owner">Propietario de Equipo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="create-phone">Teléfono</Label>
              <Input
                id="create-phone"
                value={createForm.phone || ''}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="+52 555 123 4567"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={createUser.isPending}>
                Cancelar
              </Button>
              <Button onClick={handleCreateSubmit} disabled={createUser.isPending}>
                {createUser.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>Modifica la información del usuario</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Nombre Completo</Label>
              <Input
                id="edit-name"
                value={editForm.name || ''}
                onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                aria-invalid={!!formErrors.name}
              />
              {formErrors.name && <p className="text-xs text-destructive mt-1">{formErrors.name}</p>}
            </div>

            <div>
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email || ''}
                onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                aria-invalid={!!formErrors.email}
              />
              {formErrors.email && <p className="text-xs text-destructive mt-1">{formErrors.email}</p>}
            </div>

            <div>
              <Label htmlFor="edit-phone">Teléfono</Label>
              <Input
                id="edit-phone"
                value={editForm.phone || ''}
                onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setEditOpen(false)} disabled={updateUser.isPending}>
                Cancelar
              </Button>
              <Button onClick={handleEditSubmit} disabled={updateUser.isPending}>
                {updateUser.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Actualizar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation */}
      <AlertDialog open={!!deactivateConfirm} onOpenChange={() => setDeactivateConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desactivar usuario</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres desactivar a "{deactivateConfirm?.name}"? No podrá acceder al sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex justify-end gap-3">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivate}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Desactivar
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
