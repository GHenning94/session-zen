import { Layout } from "@/components/Layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  BookOpen, 
  Users, 
  Calendar, 
  CreditCard, 
  FileText, 
  Settings, 
  Zap, 
  BarChart3,
  Package,
  Repeat,
  Target,
  Globe,
  Bell,
  Shield,
  Smartphone,
  HelpCircle,
  ArrowLeft
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useNavigate } from "react-router-dom"

const documentationSections = [
  {
    id: "getting-started",
    title: "Primeiros Passos",
    icon: BookOpen,
    description: "Comece a usar o TherapyPro rapidamente",
    content: [
      {
        title: "Criando sua Conta",
        text: "Para começar a usar o TherapyPro, acesse a página de cadastro e preencha seus dados básicos. Você receberá um e-mail de confirmação para ativar sua conta. Após confirmar, faça login e complete seu perfil com suas informações profissionais."
      },
      {
        title: "Configurando seu Perfil",
        text: "Acesse 'Configurações' > 'Meu Perfil' para adicionar sua foto, especialidade, CRP/registro profissional e biografia. Essas informações aparecerão na sua página pública de agendamento."
      },
      {
        title: "Personalizando sua Página Pública",
        text: "Em 'Página Pública', você pode criar um link personalizado para seus pacientes agendarem consultas. Configure cores, logo, horários de atendimento e valores. Compartilhe o link gerado com seus pacientes."
      },
      {
        title: "Cadastrando seu Primeiro Cliente",
        text: "Na página 'Clientes', clique em 'Novo Cliente' e preencha os dados básicos. Você pode adicionar informações clínicas, contatos de emergência e medicamentos posteriormente."
      }
    ]
  },
  {
    id: "clients",
    title: "Gestão de Clientes",
    icon: Users,
    description: "Gerencie seus pacientes de forma organizada",
    content: [
      {
        title: "Cadastro Completo de Clientes",
        text: "O TherapyPro permite cadastrar informações completas de cada paciente: dados pessoais, contatos de emergência, histórico médico, medicamentos em uso, plano de saúde e muito mais. Todos os dados são criptografados e protegidos."
      },
      {
        title: "Link de Auto-Cadastro",
        text: "Gere um link único para que novos pacientes preencham seus próprios dados antes da primeira consulta. Acesse o menu do cliente e selecione 'Gerar Link de Cadastro'. O paciente receberá um formulário seguro para preencher."
      },
      {
        title: "Ativação e Desativação",
        text: "Pacientes podem ser desativados temporariamente sem perder o histórico. Use o menu de três pontos ao lado do cliente para ativar/desativar. Clientes inativos não aparecem nas listas de agendamento."
      },
      {
        title: "Pesquisa e Filtros",
        text: "Use a barra de pesquisa para encontrar clientes por nome, e-mail ou telefone. Filtre por status (ativo/inativo) para organizar sua visualização."
      }
    ]
  },
  {
    id: "agenda",
    title: "Agenda e Sessões",
    icon: Calendar,
    description: "Organize seus atendimentos",
    content: [
      {
        title: "Visualização da Agenda",
        text: "A agenda oferece três visualizações: dia, semana e mês. Clique em qualquer horário para criar uma nova sessão. Arraste e solte para reagendar (funcionalidade premium)."
      },
      {
        title: "Criando Sessões",
        text: "Clique em 'Nova Sessão' ou diretamente no horário desejado. Selecione o cliente, defina horário, duração e valor. Você pode adicionar observações e vincular a um pacote."
      },
      {
        title: "Status das Sessões",
        text: "Cada sessão possui um status: Agendada (azul), Realizada (verde), Cancelada (vermelho) ou Falta (amarelo). O sistema atualiza automaticamente sessões passadas que não foram marcadas."
      },
      {
        title: "Sincronização com Google Calendar",
        text: "Conecte sua conta Google em 'Integrações' para sincronizar automaticamente. Eventos criados no TherapyPro aparecem no Google Calendar e vice-versa. Configure importação automática ou manual."
      }
    ]
  },
  {
    id: "recurring",
    title: "Sessões Recorrentes",
    icon: Repeat,
    description: "Configure atendimentos periódicos",
    content: [
      {
        title: "Criando Recorrência",
        text: "Para pacientes com atendimento regular, crie uma sessão recorrente. Defina o dia da semana, horário, intervalo (semanal, quinzenal, mensal) e data de término. O sistema gera automaticamente as sessões futuras."
      },
      {
        title: "Gerenciando Recorrências",
        text: "Na página 'Sessões Recorrentes', visualize todas as recorrências ativas. Você pode editar, pausar ou encerrar uma recorrência. Alterações podem afetar apenas sessões futuras."
      },
      {
        title: "Exceções",
        text: "Sessões individuais de uma recorrência podem ser editadas separadamente. Marque como 'modificada' para que alterações na recorrência não afetem essa sessão específica."
      }
    ]
  },
  {
    id: "packages",
    title: "Pacotes de Sessões",
    icon: Package,
    description: "Ofereça pacotes promocionais",
    content: [
      {
        title: "Criando Pacotes",
        text: "Pacotes permitem vender múltiplas sessões com desconto. Defina nome, número de sessões, valor total e validade. O sistema calcula automaticamente o valor por sessão."
      },
      {
        title: "Vinculando Sessões",
        text: "Ao criar uma sessão, selecione o pacote do cliente. O consumo é atualizado automaticamente quando a sessão é marcada como realizada. Acompanhe o progresso na página de Pacotes."
      },
      {
        title: "Controle de Consumo",
        text: "Visualize quantas sessões foram consumidas de cada pacote. O sistema alerta quando um pacote está próximo do fim ou expirado. Renove pacotes facilmente."
      }
    ]
  },
  {
    id: "payments",
    title: "Pagamentos",
    icon: CreditCard,
    description: "Controle financeiro completo",
    content: [
      {
        title: "Registro de Pagamentos",
        text: "Pagamentos são criados automaticamente para cada sessão agendada. Marque como 'Pago' quando receber, selecionando o método (PIX, cartão, dinheiro, transferência)."
      },
      {
        title: "Pagamentos de Pacotes",
        text: "Pacotes geram um pagamento único do valor total. Você pode parcelar manualmente criando múltiplos pagamentos associados ao mesmo pacote."
      },
      {
        title: "Geração de Recibos",
        text: "Gere recibos profissionais em PDF para pagamentos confirmados. O recibo inclui seus dados profissionais, dados do paciente, valor e data do pagamento."
      },
      {
        title: "Relatório Financeiro",
        text: "Acompanhe receita recebida, pendente e cancelada. Filtre por período, cliente ou método de pagamento. Exporte relatórios em PDF ou Excel."
      }
    ]
  },
  {
    id: "records",
    title: "Prontuários e Evoluções",
    icon: FileText,
    description: "Documentação clínica segura",
    content: [
      {
        title: "Anamnese",
        text: "Registre a anamnese completa de cada paciente: motivo da consulta, queixa principal, histórico médico e familiar, diagnóstico inicial e observações adicionais."
      },
      {
        title: "Evoluções",
        text: "Após cada sessão, registre a evolução do tratamento. Vincule evoluções às sessões para manter um histórico cronológico. Use o editor rico para formatação."
      },
      {
        title: "Templates de Prontuário",
        text: "Crie templates personalizados para diferentes tipos de avaliação. Utilize templates públicos da comunidade ou crie os seus próprios."
      },
      {
        title: "Segurança dos Dados",
        text: "Todos os dados clínicos são criptografados em trânsito e em repouso. Apenas você tem acesso às informações dos seus pacientes. Logs de acesso são registrados para auditoria."
      }
    ]
  },
  {
    id: "goals",
    title: "Metas",
    icon: Target,
    description: "Defina e acompanhe objetivos",
    content: [
      {
        title: "Tipos de Metas",
        text: "Crie metas mensais para faturamento, número de sessões ou novos clientes. Acompanhe o progresso em tempo real no dashboard."
      },
      {
        title: "Acompanhamento",
        text: "Visualize o percentual atingido de cada meta. O sistema mostra gráficos de progresso e estimativas para atingir o objetivo no período."
      },
      {
        title: "Histórico",
        text: "Consulte metas anteriores para analisar sua evolução profissional ao longo do tempo."
      }
    ]
  },
  {
    id: "public-page",
    title: "Página Pública",
    icon: Globe,
    description: "Sua vitrine profissional online",
    content: [
      {
        title: "Configuração da Página",
        text: "Personalize sua página de agendamento com cores da sua marca, logo, foto profissional e descrição. Defina um slug personalizado (ex: therapypro.app/agendar/seu-nome)."
      },
      {
        title: "Horários de Atendimento",
        text: "Configure dias e horários disponíveis para agendamento. Defina intervalos entre sessões e duração padrão. Bloqueie horários específicos quando necessário."
      },
      {
        title: "Agendamento pelo Paciente",
        text: "Pacientes podem agendar diretamente pela sua página pública. Eles veem apenas horários disponíveis e podem escolher o tipo de atendimento."
      },
      {
        title: "Formas de Pagamento",
        text: "Informe as formas de pagamento aceitas (PIX, cartão, dinheiro, transferência). Adicione sua chave PIX e dados bancários para facilitar pagamentos."
      }
    ]
  },
  {
    id: "integrations",
    title: "Integrações",
    icon: Zap,
    description: "Conecte com outras ferramentas",
    content: [
      {
        title: "Google Calendar",
        text: "Sincronize sua agenda com o Google Calendar. Eventos criados em qualquer plataforma aparecem em ambas. Configure sincronização automática ou manual."
      },
      {
        title: "WhatsApp",
        text: "Envie lembretes de sessão automaticamente via WhatsApp. Configure quantas horas antes da sessão o lembrete deve ser enviado."
      }
    ]
  },
  {
    id: "notifications",
    title: "Notificações",
    icon: Bell,
    description: "Fique sempre informado",
    content: [
      {
        title: "Tipos de Notificação",
        text: "Receba alertas sobre novas sessões agendadas, pagamentos pendentes, pacotes expirando e lembretes de sessões do dia."
      },
      {
        title: "Configuração",
        text: "Em 'Configurações' > 'Notificações', escolha quais alertas deseja receber por e-mail, push notification ou ambos. Configure horários de lembrete."
      },
      {
        title: "Push Notifications",
        text: "Ative notificações push no navegador para receber alertas em tempo real mesmo quando não estiver usando o TherapyPro."
      }
    ]
  },
  {
    id: "reports",
    title: "Relatórios",
    icon: BarChart3,
    description: "Análises e insights",
    content: [
      {
        title: "Dashboard",
        text: "O dashboard apresenta uma visão geral: sessões do dia, faturamento do mês, pacientes ativos e metas. Gráficos mostram a evolução ao longo do tempo."
      },
      {
        title: "Relatórios Financeiros",
        text: "Gere relatórios detalhados de faturamento por período, cliente ou método de pagamento. Exporte em PDF ou Excel para sua contabilidade."
      },
      {
        title: "Relatórios de Sessões",
        text: "Analise o número de sessões realizadas, canceladas e faltas. Identifique padrões e otimize sua agenda."
      }
    ]
  },
  {
    id: "security",
    title: "Segurança",
    icon: Shield,
    description: "Proteção dos seus dados",
    content: [
      {
        title: "Autenticação Segura",
        text: "O TherapyPro utiliza autenticação segura com criptografia. Ative a autenticação em duas etapas (2FA) para proteção extra via e-mail ou aplicativo autenticador."
      },
      {
        title: "Criptografia de Dados",
        text: "Todos os dados sensíveis são criptografados em trânsito (HTTPS) e em repouso. Utilizamos padrões bancários de segurança (AES-256)."
      },
      {
        title: "Privacidade",
        text: "Seus dados e de seus pacientes são completamente privados. Não compartilhamos informações com terceiros. Você pode exportar ou excluir seus dados a qualquer momento."
      },
      {
        title: "Conformidade LGPD",
        text: "O TherapyPro está em conformidade com a Lei Geral de Proteção de Dados (LGPD). Implementamos todas as medidas técnicas e organizacionais necessárias."
      }
    ]
  },
  {
    id: "mobile",
    title: "Acesso Mobile",
    icon: Smartphone,
    description: "Use em qualquer dispositivo",
    content: [
      {
        title: "Design Responsivo",
        text: "O TherapyPro funciona perfeitamente em smartphones, tablets e computadores. A interface se adapta automaticamente ao tamanho da tela."
      },
      {
        title: "Instalação como App",
        text: "No celular, você pode instalar o TherapyPro como um aplicativo. Acesse pelo navegador e toque em 'Adicionar à Tela Inicial' para acesso rápido."
      },
      {
        title: "Offline",
        text: "Algumas funcionalidades estão disponíveis offline após a primeira carga. Dados são sincronizados automaticamente quando a conexão é restabelecida."
      }
    ]
  },
  {
    id: "subscription",
    title: "Planos e Assinatura",
    icon: CreditCard,
    description: "Escolha o plano ideal",
    content: [
      {
        title: "Plano Básico",
        text: "Plano gratuito com funcionalidades essenciais: agenda básica, até 5 clientes, pagamentos simples. Ideal para quem está começando ou testando a plataforma."
      },
      {
        title: "Plano Profissional",
        text: "Até 20 clientes, sessões ilimitadas, histórico básico, pacotes de sessões e suporte por e-mail. Perfeito para profissionais em crescimento."
      },
      {
        title: "Plano Premium",
        text: "Clientes ilimitados, todas as funcionalidades: sessões recorrentes, integrações completas (Google Calendar, WhatsApp), relatórios avançados em PDF, prontuários completos e suporte prioritário."
      },
      {
        title: "Gerenciando Assinatura",
        text: "Em 'Configurações' > 'Assinatura', visualize seu plano atual, histórico de pagamentos e gerencie métodos de pagamento. Faça upgrade ou cancele a qualquer momento."
      }
    ]
  }
]

export default function Documentacao() {
  const navigate = useNavigate()

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/suporte')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <BookOpen className="h-8 w-8 text-primary" />
              Documentação
            </h1>
            <p className="text-muted-foreground">
              Guia completo de uso do TherapyPro
            </p>
          </div>
        </div>

        {/* Quick Navigation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Navegação Rápida</CardTitle>
            <CardDescription>Clique em um tópico para ir diretamente</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {documentationSections.map((section) => (
                <Badge 
                  key={section.id}
                  variant="outline" 
                  className="cursor-pointer hover:bg-primary/10 transition-colors"
                  onClick={() => {
                    document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' })
                  }}
                >
                  <section.icon className="h-3 w-3 mr-1" />
                  {section.title}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Documentation Sections */}
        <div className="space-y-6">
          {documentationSections.map((section) => (
            <Card key={section.id} id={section.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <section.icon className="h-5 w-5 text-primary" />
                  {section.title}
                </CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {section.content.map((item, index) => (
                    <AccordionItem key={index} value={`${section.id}-${index}`}>
                      <AccordionTrigger className="text-left font-medium">
                        {item.title}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground leading-relaxed">
                        {item.text}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Footer Help */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <HelpCircle className="h-8 w-8 text-primary" />
                <div>
                  <h3 className="font-semibold">Ainda tem dúvidas?</h3>
                  <p className="text-sm text-muted-foreground">Entre em contato com nosso suporte</p>
                </div>
              </div>
              <Button onClick={() => navigate('/suporte')}>
                Acessar Suporte
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}