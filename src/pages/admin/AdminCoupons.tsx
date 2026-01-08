import { useState, useEffect } from "react"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { supabase } from "@/integrations/supabase/client"
import { Ticket, Plus, Trash2, Users, BarChart3, Search, RefreshCw, Loader2 } from "lucide-react"

interface CouponStats {
  total: number
  used: number
  available: number
  byCode: Record<string, { total: number; used: number; available: number }>
}

interface Coupon {
  id: string
  user_id: string
  code: string
  discount: string
  description: string
  coupon_type: string
  is_used: boolean
  used_at: string | null
  expires_at: string | null
  created_at: string
  user_email?: string
  user_name?: string
}

interface UserOption {
  id: string
  email: string
  nome: string
}

export default function AdminCoupons() {
  const [stats, setStats] = useState<CouponStats | null>(null)
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  
  // Form states
  const [createType, setCreateType] = useState<'single' | 'batch' | 'all'>('single')
  const [code, setCode] = useState('')
  const [discount, setDiscount] = useState('')
  const [description, setDescription] = useState('')
  const [couponType, setCouponType] = useState('promotional')
  const [expiresAt, setExpiresAt] = useState('')
  const [filterPlan, setFilterPlan] = useState<string>('')
  
  // User selection
  const [userSearch, setUserSearch] = useState('')
  const [users, setUsers] = useState<UserOption[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [searchingUsers, setSearchingUsers] = useState(false)
  
  // Filter and search
  const [filterCode, setFilterCode] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'used'>('all')
  
  // Modals
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; type: 'single' | 'code'; id?: string; code?: string }>({ open: false, type: 'single' })

  const getSessionToken = () => {
    return sessionStorage.getItem('admin_session_token') || ''
  }

  const loadStats = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-manage-coupons', {
        body: { sessionToken: getSessionToken(), action: 'stats' }
      })
      
      if (error) throw error
      if (data?.stats) setStats(data.stats)
    } catch (err) {
      console.error('Error loading stats:', err)
    }
  }

  const loadCoupons = async () => {
    setLoading(true)
    try {
      const filters: Record<string, unknown> = {}
      if (filterCode) filters.code = filterCode
      if (filterStatus === 'available') filters.is_used = false
      if (filterStatus === 'used') filters.is_used = true
      
      const { data, error } = await supabase.functions.invoke('admin-manage-coupons', {
        body: { sessionToken: getSessionToken(), action: 'list', filters }
      })
      
      if (error) throw error
      if (data?.coupons) setCoupons(data.coupons)
    } catch (err) {
      console.error('Error loading coupons:', err)
      toast.error('Erro ao carregar cupons')
    } finally {
      setLoading(false)
    }
  }

  const searchUsers = async (query: string) => {
    if (!query || query.length < 2) {
      setUsers([])
      return
    }
    
    setSearchingUsers(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, nome')
        .ilike('nome', `%${query}%`)
        .limit(10)
      
      if (error) throw error
      
      // Get emails from auth (admin only)
      const { data: authData } = await supabase.functions.invoke('admin-get-users', {
        body: { sessionToken: getSessionToken(), search: query }
      })
      
      const usersList = (data || []).map(p => ({
        id: p.user_id,
        nome: p.nome || 'Sem nome',
        email: authData?.users?.find((u: { id: string; email: string }) => u.id === p.user_id)?.email || 'Email não disponível'
      }))
      
      setUsers(usersList)
    } catch (err) {
      console.error('Error searching users:', err)
    } finally {
      setSearchingUsers(false)
    }
  }

  const handleCreate = async () => {
    if (!code || !discount || !description) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }
    
    if (createType === 'single' && selectedUsers.length !== 1) {
      toast.error('Selecione um usuário')
      return
    }
    
    if (createType === 'batch' && selectedUsers.length === 0) {
      toast.error('Selecione pelo menos um usuário')
      return
    }
    
    setCreating(true)
    try {
      let body: Record<string, unknown> = {
        sessionToken: getSessionToken(),
        code: code.toUpperCase(),
        discount,
        description,
        coupon_type: couponType,
        expires_at: expiresAt || null
      }
      
      if (createType === 'single') {
        body.action = 'add_single'
        body.user_id = selectedUsers[0]
      } else if (createType === 'batch') {
        body.action = 'add_batch'
        body.user_ids = selectedUsers
      } else {
        body.action = 'add_to_all'
        if (filterPlan) body.filter_plan = filterPlan
      }
      
      const { data, error } = await supabase.functions.invoke('admin-manage-coupons', { body })
      
      if (error) throw error
      
      toast.success(data?.message || 'Cupom(s) criado(s) com sucesso!')
      
      // Reset form
      setCode('')
      setDiscount('')
      setDescription('')
      setExpiresAt('')
      setSelectedUsers([])
      setUsers([])
      setUserSearch('')
      
      // Reload data
      loadStats()
      loadCoupons()
    } catch (err: unknown) {
      console.error('Error creating coupon:', err)
      toast.error(err instanceof Error ? err.message : 'Erro ao criar cupom')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteModal.open) return
    
    setDeleting(deleteModal.id || deleteModal.code || '')
    try {
      const body: Record<string, unknown> = { sessionToken: getSessionToken() }
      
      if (deleteModal.type === 'single') {
        body.action = 'delete'
        body.coupon_id = deleteModal.id
      } else {
        body.action = 'delete_by_code'
        body.code = deleteModal.code
      }
      
      const { data, error } = await supabase.functions.invoke('admin-manage-coupons', { body })
      
      if (error) throw error
      
      toast.success(data?.message || 'Cupom(s) deletado(s) com sucesso!')
      setDeleteModal({ open: false, type: 'single' })
      
      loadStats()
      loadCoupons()
    } catch (err: unknown) {
      console.error('Error deleting coupon:', err)
      toast.error(err instanceof Error ? err.message : 'Erro ao deletar cupom')
    } finally {
      setDeleting(null)
    }
  }

  useEffect(() => {
    loadStats()
    loadCoupons()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => searchUsers(userSearch), 300)
    return () => clearTimeout(timer)
  }, [userSearch])

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Gestão de Cupons</h1>
          <p className="text-muted-foreground">Crie e gerencie cupons para usuários</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Ticket className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total de Cupons</p>
                  <p className="text-2xl font-bold">{stats?.total || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-emerald-500/10">
                  <BarChart3 className="h-6 w-6 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Disponíveis</p>
                  <p className="text-2xl font-bold text-emerald-500">{stats?.available || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-amber-500/10">
                  <Users className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Utilizados</p>
                  <p className="text-2xl font-bold text-amber-500">{stats?.used || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-blue-500/10">
                  <BarChart3 className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Códigos Únicos</p>
                  <p className="text-2xl font-bold text-blue-500">{stats?.byCode ? Object.keys(stats.byCode).length : 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Create Coupon Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Criar Cupom
            </CardTitle>
            <CardDescription>
              Crie cupons para usuários específicos ou em lote
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs value={createType} onValueChange={(v) => setCreateType(v as 'single' | 'batch' | 'all')}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="single">Individual</TabsTrigger>
                <TabsTrigger value="batch">Em Lote</TabsTrigger>
                <TabsTrigger value="all">Para Todos</TabsTrigger>
              </TabsList>
              
              <TabsContent value="single" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Buscar Usuário</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Digite o nome ou email do usuário..."
                      className="pl-10"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                    />
                  </div>
                  {searchingUsers && <p className="text-sm text-muted-foreground">Buscando...</p>}
                  {users.length > 0 && (
                    <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
                      {users.map(user => (
                        <button
                          key={user.id}
                          type="button"
                          className={`w-full text-left px-4 py-2 hover:bg-accent transition-colors ${selectedUsers.includes(user.id) ? 'bg-primary/10' : ''}`}
                          onClick={() => setSelectedUsers([user.id])}
                        >
                          <p className="font-medium text-sm">{user.nome}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedUsers.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {users.find(u => u.id === selectedUsers[0])?.nome || '1 usuário selecionado'}
                      </Badge>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedUsers([])}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="batch" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Buscar Usuários</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Digite o nome ou email do usuário..."
                      className="pl-10"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                    />
                  </div>
                  {users.length > 0 && (
                    <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
                      {users.map(user => (
                        <button
                          key={user.id}
                          type="button"
                          className={`w-full text-left px-4 py-2 hover:bg-accent transition-colors ${selectedUsers.includes(user.id) ? 'bg-primary/10' : ''}`}
                          onClick={() => {
                            if (selectedUsers.includes(user.id)) {
                              setSelectedUsers(selectedUsers.filter(id => id !== user.id))
                            } else {
                              setSelectedUsers([...selectedUsers, user.id])
                            }
                          }}
                        >
                          <p className="font-medium text-sm">{user.nome}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedUsers.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary">{selectedUsers.length} usuário(s) selecionado(s)</Badge>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedUsers([])}>
                        Limpar
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="all" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Filtrar por Plano (opcional)</Label>
                  <Select value={filterPlan} onValueChange={setFilterPlan}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os planos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos os planos</SelectItem>
                      <SelectItem value="basico">Básico</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Deixe vazio para criar cupom para todos os usuários
                  </p>
                </div>
              </TabsContent>
            </Tabs>
            
            {/* Common Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Código do Cupom *</Label>
                <Input
                  placeholder="Ex: PROMO20"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Desconto *</Label>
                <Input
                  placeholder="Ex: 20% ou R$ 10"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={couponType} onValueChange={setCouponType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="promotional">Promocional</SelectItem>
                    <SelectItem value="referral">Indicação</SelectItem>
                    <SelectItem value="loyalty">Fidelidade</SelectItem>
                    <SelectItem value="welcome">Boas-vindas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Data de Expiração (opcional)</Label>
                <Input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Textarea
                placeholder="Ex: 20% de desconto no próximo mês"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            
            <Button onClick={handleCreate} disabled={creating} className="w-full">
              {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Criar Cupom
            </Button>
          </CardContent>
        </Card>

        {/* Coupons List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Lista de Cupons</CardTitle>
                <CardDescription>Todos os cupons criados</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => { loadStats(); loadCoupons() }}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <Input
                  placeholder="Filtrar por código..."
                  value={filterCode}
                  onChange={(e) => setFilterCode(e.target.value.toUpperCase())}
                />
              </div>
              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as 'all' | 'available' | 'used')}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="available">Disponíveis</SelectItem>
                  <SelectItem value="used">Utilizados</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={loadCoupons}>
                <Search className="h-4 w-4 mr-2" />
                Buscar
              </Button>
            </div>
            
            {/* Table */}
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Desconto</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : coupons.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Nenhum cupom encontrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    coupons.map(coupon => (
                      <TableRow key={coupon.id}>
                        <TableCell className="font-mono font-bold">{coupon.code}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{coupon.user_name || 'Sem nome'}</p>
                            <p className="text-xs text-muted-foreground">{coupon.user_email || coupon.user_id.slice(0, 8)}</p>
                          </div>
                        </TableCell>
                        <TableCell>{coupon.discount}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{coupon.coupon_type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={coupon.is_used ? "secondary" : "default"} className={!coupon.is_used ? "bg-emerald-500" : ""}>
                            {coupon.is_used ? "Utilizado" : "Disponível"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(coupon.created_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteModal({ open: true, type: 'single', id: coupon.id })}
                            disabled={deleting === coupon.id}
                          >
                            {deleting === coupon.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            
            {/* Bulk Actions */}
            {stats?.byCode && Object.keys(stats.byCode).length > 0 && (
              <div className="pt-4 border-t">
                <h4 className="font-medium text-sm mb-3">Ações em Lote por Código</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(stats.byCode).map(([codeKey, codeStats]) => (
                    <Button
                      key={codeKey}
                      variant="outline"
                      size="sm"
                      className="text-destructive border-destructive/50 hover:bg-destructive/10"
                      onClick={() => setDeleteModal({ open: true, type: 'code', code: codeKey })}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      {codeKey} ({codeStats.total})
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModal.open} onOpenChange={(open) => setDeleteModal({ ...deleteModal, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              {deleteModal.type === 'single' 
                ? 'Tem certeza que deseja excluir este cupom?'
                : `Tem certeza que deseja excluir TODOS os cupons com o código "${deleteModal.code}"?`
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModal({ open: false, type: 'single' })}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={!!deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  )
}
