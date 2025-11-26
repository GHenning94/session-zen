/**
 * Definição explícita de campos para consultas
 * Reduz drasticamente o egress eliminando SELECT *
 */

export const QUERY_FIELDS = {
  // Clientes
  clients: {
    // Lista de clientes (view principal)
    list: 'id, nome, email, telefone, ativo, avatar_url, created_at, updated_at',
    
    // Detalhes completos do cliente
    details: `id, nome, email, telefone, ativo, avatar_url, cpf, data_nascimento, 
              endereco, pais, genero, profissao, plano_saude, tratamento, medicamentos,
              contato_emergencia_1_nome, contato_emergencia_1_telefone,
              contato_emergencia_2_nome, contato_emergencia_2_telefone,
              nome_pai, telefone_pai, nome_mae, telefone_mae,
              eh_crianca_adolescente, emergencia_igual_pais,
              dados_clinicos, historico, created_at, updated_at, user_id`,
    
    // Dropdown/seleção (apenas o essencial)
    dropdown: 'id, nome, ativo, avatar_url',
    
    // Para dashboard
    dashboard: 'id, nome, avatar_url',
    
    // Para cards
    card: 'id, nome, email, telefone, ativo, avatar_url, created_at'
  },

  // Sessões
  sessions: {
    // Lista básica
    list: 'id, data, horario, status, valor, client_id, package_id, created_at',
    
    // Calendário (apenas o necessário)
    calendar: 'id, data, horario, status, client_id, google_event_id, anotacoes',
    
    // Dashboard (com cliente)
    dashboard: 'id, data, horario, status, valor, client_id, clients(nome, avatar_url)',
    
    // Detalhes completos
    details: `id, data, horario, status, valor, anotacoes, client_id, package_id,
              metodo_pagamento, session_type, google_event_id, google_sync_type,
              recurring_session_id, is_modified, created_at, updated_at`,
    
    // Para histórico com cliente
    history: `id, data, horario, status, valor, anotacoes, client_id, package_id,
              clients(nome, ativo, avatar_url)`,
    
    // Para pagamentos
    payments: 'id, data, horario, status, valor, metodo_pagamento, client_id'
  },

  // Pagamentos
  payments: {
    // Lista básica
    list: `id, valor, status, metodo_pagamento, data_vencimento, data_pagamento,
           observacoes, created_at, session_id, package_id, client_id`,
    
    // Com relacionamentos (para página de pagamentos)
    withRelations: `id, valor, status, metodo_pagamento, data_vencimento, data_pagamento,
                    observacoes, created_at, session_id, package_id, client_id,
                    packages:package_id (nome, total_sessoes, sessoes_consumidas, data_fim, data_inicio),
                    sessions:session_id (data, horario, status, valor, metodo_pagamento)`,
    
    // Dashboard
    dashboard: 'id, valor, status, data_pagamento, created_at, session_id, client_id'
  },

  // Pacotes
  packages: {
    // Lista
    list: `id, nome, total_sessoes, sessoes_consumidas, valor_total, valor_por_sessao,
           status, data_inicio, data_fim, client_id, created_at`,
    
    // Detalhes
    details: `id, nome, total_sessoes, sessoes_consumidas, valor_total, valor_por_sessao,
              status, data_inicio, data_fim, observacoes, client_id, user_id, created_at, updated_at`,
    
    // Dashboard
    dashboard: 'id, nome, total_sessoes, sessoes_consumidas, status, client_id'
  },

  // Anotações de sessão
  sessionNotes: {
    list: `id, notes, created_at, session_id, client_id,
           clients(nome, avatar_url),
           sessions(data, horario, status)`,
    
    details: 'id, notes, is_private, created_at, updated_at, session_id, client_id, user_id'
  },

  // Perfis
  profiles: {
    own: `id, nome, email, telefone, avatar_url, bio, profissao, especialidade, crp,
          subscription_plan, billing_interval, created_at`,
    
    public: 'id, nome, profissao, especialidade, bio, public_avatar_url',
    
    settings: `id, nome, email, telefone, avatar_url, profissao, especialidade, crp,
               cpf_cnpj, banco, agencia, conta, tipo_conta, subscription_plan, billing_interval`
  },

  // Notificações
  notifications: {
    list: 'id, titulo, conteudo, lida, data, created_at',
    unread: 'id, titulo, conteudo, data, created_at'
  },

  // Metas
  metas: {
    list: `id, tipo, valor_meta, ativa, concluida, data_inicio, data_conclusao,
           versao, created_at, updated_at`,
    active: 'id, tipo, valor_meta, data_inicio, versao'
  },

  // Configurações
  configuracoes: {
    full: `id, booking_enabled, show_price, show_duration, show_photo,
           valor_padrao, valor_primeira_consulta, duracao_sessao, intervalo_sessoes,
           horario_inicio, horario_fim, dias_atendimento_array, horarios_por_dia,
           aceita_pix, aceita_cartao, aceita_dinheiro, aceita_transferencia,
           page_title, page_description, brand_color, background_color, background_image,
           logo_url, custom_css, custom_footer, chave_pix, dados_bancarios,
           email_contato_pacientes, whatsapp_contato_pacientes, slug, theme_preference`,
    
    booking: `booking_enabled, show_price, show_duration, show_photo,
              valor_padrao, valor_primeira_consulta, duracao_sessao, intervalo_sessoes,
              horario_inicio, horario_fim, dias_atendimento_array, horarios_por_dia,
              page_title, page_description, brand_color, logo_url`
  },

  // Eventos
  events: {
    list: `id, title, description, event_date, start_time, end_time, location,
           category, is_public, is_recurring, recurring_type, recurring_interval,
           recurring_end_date, registration_link, created_at`,
    
    public: `id, title, description, event_date, start_time, end_time, location,
             category, registration_link`
  },

  // Prontuários
  anamneses: {
    list: 'id, client_id, queixa_principal, diagnostico_inicial, created_at, updated_at',
    details: `id, client_id, queixa_principal, motivo_consulta, historico_medico,
              historico_familiar, antecedentes_relevantes, diagnostico_inicial,
              observacoes_adicionais, created_at, updated_at`
  },

  evolucoes: {
    list: 'id, client_id, data_sessao, evolucao, session_id, created_at',
    details: 'id, client_id, data_sessao, evolucao, session_id, created_at, updated_at'
  }
} as const

/**
 * Helper para obter campos por contexto
 */
export const getFields = (
  table: keyof typeof QUERY_FIELDS,
  context: string = 'list'
): string => {
  const fields = QUERY_FIELDS[table]
  if (!fields) return '*'
  
  // @ts-ignore - dynamic access
  return fields[context] || fields.list || '*'
}
