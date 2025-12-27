import { useState, useEffect } from "react"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Users, Search, Loader2, CheckCircle2, XCircle, Calendar } from "lucide-react"
import { adminApiCall } from "@/utils/adminApi"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface User {
  id: string
  email: string
  created_at: string
  last_sign_in: string
  confirmed: boolean
  banned: boolean
  nome: string
  profissao: string
  subscription_plan: string
}

const AdminUsers = () => {
  const [isLoading, setIsLoading] = useState(true)
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [searchTerm, setSearchTerm] = useState('')

  const fetchUsers = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await adminApiCall('admin-get-users')

      if (error || !data?.success) {
        throw new Error(error?.message || data?.error || 'Erro ao buscar usuários')
      }

      setUsers(data.users)
      setFilteredUsers(data.users)
    } catch (error: any) {
      console.error('[Admin Users] Error:', error)
      toast.error(error.message || 'Erro ao carregar usuários')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    if (searchTerm) {
      const filtered = users.filter(user =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.profissao.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredUsers(filtered)
    } else {
      setFilteredUsers(users)
    }
  }, [searchTerm, users])

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case 'premium': return <Badge className="bg-purple-600">Premium</Badge>
      case 'pro': return <Badge className="bg-blue-600">Pro</Badge>
      default: return <Badge variant="outline">Básico</Badge>
    }
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              Gerenciamento de Usuários
            </h1>
            <p className="text-muted-foreground mt-1">
              Total de {users.length} usuários cadastrados
            </p>
          </div>
          <Button onClick={fetchUsers} variant="outline">
            Atualizar
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total de Usuários</CardDescription>
              <CardTitle className="text-3xl">{users.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>E-mail Confirmado</CardDescription>
              <CardTitle className="text-3xl text-green-600">
                {users.filter(u => u.confirmed).length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Plano Premium</CardDescription>
              <CardTitle className="text-3xl text-purple-600">
                {users.filter(u => u.subscription_plan === 'premium').length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Plano Pro</CardDescription>
              <CardTitle className="text-3xl text-blue-600">
                {users.filter(u => u.subscription_plan === 'pro').length}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, e-mail ou profissão..."
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
            <CardTitle>Lista de Usuários</CardTitle>
            <CardDescription>
              Mostrando {filteredUsers.length} de {users.length} usuários
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Profissão</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cadastro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.nome}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell className="capitalize">{user.profissao}</TableCell>
                      <TableCell>{getPlanBadge(user.subscription_plan)}</TableCell>
                      <TableCell>
                        {user.confirmed ? (
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle2 className="h-4 w-4" />
                            Confirmado
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-orange-600">
                            <XCircle className="h-4 w-4" />
                            Pendente
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {new Date(user.created_at).toLocaleDateString('pt-BR')}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}

export default AdminUsers