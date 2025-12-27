import { useState, useEffect } from "react"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { adminApiCall } from "@/utils/adminApi"
import { toast } from "sonner"
import { Shield, Users, Crown, UserCog, AlertCircle, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface UserRole {
  user_id: string
  user_email: string
  user_name: string
  role: 'admin' | 'moderator' | 'user'
  created_at: string
}

const AdminRoles = () => {
  const [isLoading, setIsLoading] = useState(true)
  const [users, setUsers] = useState<UserRole[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserRole[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUser, setSelectedUser] = useState<UserRole | null>(null)
  const [newRole, setNewRole] = useState<string>('')
  const [showRoleDialog, setShowRoleDialog] = useState(false)
  const [updatingRole, setUpdatingRole] = useState(false)

  useEffect(() => {
    loadUsersWithRoles()
  }, [])

  useEffect(() => {
    if (searchTerm) {
      const filtered = users.filter(user =>
        user.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.user_name.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredUsers(filtered)
    } else {
      setFilteredUsers(users)
    }
  }, [searchTerm, users])

  const loadUsersWithRoles = async () => {
    try {
      const response = await adminApiCall('admin-get-users', { includeRoles: true })

      if (response.error || !response.data?.success) {
        throw new Error(response.error || response.data?.error || 'Erro ao carregar usuários')
      }

      // Mapear users para incluir role
      const usersWithRoles = response.data.users.map((user: any) => ({
        user_id: user.id,
        user_email: user.email,
        user_name: user.nome || 'Sem nome',
        role: user.role || 'user',
        created_at: user.created_at
      }))

      setUsers(usersWithRoles)
      setFilteredUsers(usersWithRoles)
    } catch (error: any) {
      console.error('[Admin Roles] Error:', error)
      toast.error(error.message || 'Erro ao carregar usuários')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChangeRole = async () => {
    if (!selectedUser || !newRole) return

    setUpdatingRole(true)
    try {
      const response = await adminApiCall('admin-update-user', {
        userId: selectedUser.user_id,
        role: newRole
      })

      if (response.error || !response.data?.success) {
        throw new Error(response.error || response.data?.error || 'Erro ao atualizar role')
      }

      toast.success('Role atualizada com sucesso!')
      setShowRoleDialog(false)
      loadUsersWithRoles()
    } catch (error: any) {
      console.error('[Admin Roles] Error updating role:', error)
      toast.error(error.message || 'Erro ao atualizar role')
    } finally {
      setUpdatingRole(false)
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-red-600"><Crown className="h-3 w-3 mr-1" />Admin</Badge>
      case 'moderator':
        return <Badge className="bg-blue-600"><UserCog className="h-3 w-3 mr-1" />Moderator</Badge>
      default:
        return <Badge variant="outline"><Users className="h-3 w-3 mr-1" />User</Badge>
    }
  }

  const roleStats = {
    admins: users.filter(u => u.role === 'admin').length,
    moderators: users.filter(u => u.role === 'moderator').length,
    users: users.filter(u => u.role === 'user').length,
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Carregando...</div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            Gerenciamento de Roles
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie permissões e roles dos usuários
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Administradores</CardTitle>
              <Crown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{roleStats.admins}</div>
              <p className="text-xs text-muted-foreground">Acesso total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Moderadores</CardTitle>
              <UserCog className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{roleStats.moderators}</div>
              <p className="text-xs text-muted-foreground">Acesso moderado</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Usuários</CardTitle>
              <Users className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{roleStats.users}</div>
              <p className="text-xs text-muted-foreground">Acesso padrão</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou e-mail..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-md"
              />
            </div>
          </CardHeader>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Usuários e Permissões</CardTitle>
            <CardDescription>
              Mostrando {filteredUsers.length} de {users.length} usuários
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                      <TableRow key={user.user_id}>
                        <TableCell className="font-medium">{user.user_name}</TableCell>
                        <TableCell>{user.user_email}</TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(user.created_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedUser(user)
                              setNewRole(user.role)
                              setShowRoleDialog(true)
                            }}
                          >
                            Alterar Role
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-2 py-8">
                          <AlertCircle className="h-8 w-8" />
                          <p>Nenhum usuário encontrado</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Change Role Dialog */}
        <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Alterar Role do Usuário</DialogTitle>
              <DialogDescription>
                Altere a role de {selectedUser?.user_name} ({selectedUser?.user_email})
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nova Role</label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>User - Acesso Padrão</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="moderator">
                      <div className="flex items-center gap-2">
                        <UserCog className="h-4 w-4" />
                        <span>Moderator - Acesso Moderado</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Crown className="h-4 w-4" />
                        <span>Admin - Acesso Total</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRoleDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleChangeRole} disabled={updatingRole}>
                {updatingRole ? 'Atualizando...' : 'Salvar Alteração'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}

export default AdminRoles
