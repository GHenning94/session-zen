import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Briefcase, 
  Calendar,
  Shield,
  Heart,
  Pill,
  AlertTriangle,
  Edit2,
  Trash2,
  UserX,
  UserCheck,
  FileText,
  Cake
} from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { useAvatarUrl } from "@/hooks/useAvatarUrl"

interface ClientDetailsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  client: any
  onEdit: (client: any) => void
  onDelete: (clientId: string) => void
  onToggleStatus: (clientId: string, currentStatus: boolean) => void
  onOpenProntuario: (clientId: string) => void
}

export const ClientDetailsModal = ({
  open,
  onOpenChange,
  client,
  onEdit,
  onDelete,
  onToggleStatus,
  onOpenProntuario
}: ClientDetailsModalProps) => {
  if (!client) return null

  const { avatarUrl } = useAvatarUrl(client?.avatar_url)
  const hasMedications = client.medicamentos && client.medicamentos.length > 0

  // Check if client has birthday this month
  const isBirthdayThisMonth = () => {
    if (!client.data_nascimento) return false
    const today = new Date()
    const birthDate = new Date(client.data_nascimento)
    return birthDate.getMonth() === today.getMonth()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden">
              {avatarUrl ? (
                <img 
                  src={avatarUrl}
                  alt={client.nome}
                  className="w-full h-full rounded-full object-cover"
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none'
                  }}
                />
              ) : (
                <User className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <DialogTitle className="text-2xl">{client.nome}</DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge 
                  variant={client.ativo !== false ? "default" : "secondary"}
                  className={client.ativo === false ? "bg-yellow-500 text-white hover:bg-yellow-500/80" : ""}
                >
                  {client.ativo !== false ? "Ativo" : "Inativo"}
                </Badge>
                {isBirthdayThisMonth() && (
                  <Badge className="bg-pink-500/10 text-pink-600 hover:bg-pink-500/20 flex items-center gap-1">
                    <Cake className="w-3 h-3" />
                    Aniversariante do mês
                  </Badge>
                )}
                {hasMedications && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Pill className="w-3 h-3" />
                    Medicamentos
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Informações Pessoais */}
            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <User className="w-5 h-5" />
                Informações Pessoais
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {client.cpf && (
                  <div>
                    <label className="text-sm text-muted-foreground">CPF</label>
                    <p className="font-medium">{client.cpf}</p>
                  </div>
                )}
                {client.data_nascimento && (
                  <div>
                    <label className="text-sm text-muted-foreground">Data de Nascimento</label>
                    <p className="font-medium">
                      {format(new Date(client.data_nascimento), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                )}
                {client.genero && (
                  <div>
                    <label className="text-sm text-muted-foreground">Gênero</label>
                    <p className="font-medium">{client.genero}</p>
                  </div>
                )}
                {client.profissao && (
                  <div>
                    <label className="text-sm text-muted-foreground">Profissão</label>
                    <p className="font-medium">{client.profissao}</p>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Contato */}
            <div>
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <Phone className="w-5 h-5" />
                Contato
              </h3>
              <div className="space-y-3">
                {client.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{client.email}</span>
                  </div>
                )}
                {client.telefone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{client.telefone}</span>
                  </div>
                )}
                {client.endereco && (
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>{client.endereco}</span>
                  </div>
                )}
                {client.pais && (
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>{client.pais}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Contatos de Emergência ou Pais */}
            {((client.contato_emergencia_1_nome || client.contato_emergencia_2_nome) || 
              (client.nome_pai || client.nome_mae)) && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    {client.eh_crianca_adolescente ? "Responsáveis" : "Contatos de Emergência"}
                  </h3>
                  <div className="space-y-4">
                    {client.eh_crianca_adolescente ? (
                      <>
                        {client.nome_pai && (
                          <div>
                            <label className="text-sm text-muted-foreground">Pai</label>
                            <p className="font-medium">{client.nome_pai}</p>
                            {client.telefone_pai && (
                              <p className="text-sm text-muted-foreground">{client.telefone_pai}</p>
                            )}
                          </div>
                        )}
                        {client.nome_mae && (
                          <div>
                            <label className="text-sm text-muted-foreground">Mãe</label>
                            <p className="font-medium">{client.nome_mae}</p>
                            {client.telefone_mae && (
                              <p className="text-sm text-muted-foreground">{client.telefone_mae}</p>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {client.contato_emergencia_1_nome && (
                          <div>
                            <label className="text-sm text-muted-foreground">Contato 1</label>
                            <p className="font-medium">{client.contato_emergencia_1_nome}</p>
                            {client.contato_emergencia_1_telefone && (
                              <p className="text-sm text-muted-foreground">{client.contato_emergencia_1_telefone}</p>
                            )}
                          </div>
                        )}
                        {client.contato_emergencia_2_nome && (
                          <div>
                            <label className="text-sm text-muted-foreground">Contato 2</label>
                            <p className="font-medium">{client.contato_emergencia_2_nome}</p>
                            {client.contato_emergencia_2_telefone && (
                              <p className="text-sm text-muted-foreground">{client.contato_emergencia_2_telefone}</p>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Informações Médicas */}
            {(client.plano_saude || client.tratamento || hasMedications) && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <Heart className="w-5 h-5" />
                    Informações Médicas
                  </h3>
                  <div className="space-y-3">
                    {client.plano_saude && (
                      <div>
                        <label className="text-sm text-muted-foreground">Plano de Saúde</label>
                        <p className="font-medium">{client.plano_saude}</p>
                      </div>
                    )}
                    {client.tratamento && (
                      <div>
                        <label className="text-sm text-muted-foreground">Tratamento</label>
                        <p className="font-medium">{client.tratamento}</p>
                      </div>
                    )}
                    {hasMedications && (
                      <div>
                        <label className="text-sm text-muted-foreground">Medicamentos</label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {client.medicamentos.map((med: string, index: number) => (
                            <Badge key={index} variant="outline" className="flex items-center gap-1">
                              <Pill className="w-3 h-3" />
                              {med}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Observações */}
            {client.dados_clinicos && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold text-lg mb-3">Observações</h3>
                  <p className="text-muted-foreground">{client.dados_clinicos}</p>
                </div>
              </>
            )}

            {/* Informações do Sistema */}
            <Separator />
            <div>
              <h3 className="font-semibold text-lg mb-3">Informações do Sistema</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="text-muted-foreground">Cadastrado em</label>
                  <p className="font-medium">
                    {format(new Date(client.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <label className="text-muted-foreground">Última atualização</label>
                  <p className="font-medium">
                    {format(new Date(client.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Ações */}
        <div className="flex flex-wrap gap-2 pt-4 border-t mt-6">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
              onEdit(client)
            }}
            className="flex items-center gap-2"
          >
            <Edit2 className="w-4 h-4" />
            Editar
          </Button>
          
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
              onOpenProntuario(client.id)
            }}
            className="flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Prontuário
          </Button>
          
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
              onToggleStatus(client.id, client.ativo !== false)
            }}
            className="flex items-center gap-2"
          >
            {client.ativo !== false ? (
              <>
                <UserX className="w-4 h-4 text-warning" />
                <span className="text-warning">Desativar</span>
              </>
            ) : (
              <>
                <UserCheck className="w-4 h-4 text-success" />
                <span className="text-success">Ativar</span>
              </>
            )}
          </Button>
          
          <Button
            variant="destructive"
            onClick={() => onDelete(client.id)}
            className="flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}