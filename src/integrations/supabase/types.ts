export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_login_attempts: {
        Row: {
          attempted_at: string
          email_hash: string
          id: string
          ip_address: unknown
          success: boolean
        }
        Insert: {
          attempted_at?: string
          email_hash: string
          id?: string
          ip_address: unknown
          success?: boolean
        }
        Update: {
          attempted_at?: string
          email_hash?: string
          id?: string
          ip_address?: unknown
          success?: boolean
        }
        Relationships: []
      }
      admin_notifications: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          message: string
          metadata: Json | null
          read: boolean
          severity: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          message: string
          metadata?: Json | null
          read?: boolean
          severity?: string
          title: string
          type: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          read?: boolean
          severity?: string
          title?: string
          type?: string
        }
        Relationships: []
      }
      admin_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          ip_address: unknown
          revoked: boolean | null
          revoked_at: string | null
          session_token: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          ip_address?: unknown
          revoked?: boolean | null
          revoked_at?: string | null
          session_token: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: unknown
          revoked?: boolean | null
          revoked_at?: string | null
          session_token?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      anamneses: {
        Row: {
          antecedentes_relevantes: string | null
          client_id: string
          created_at: string
          diagnostico_inicial: string | null
          historico_familiar: string | null
          historico_medico: string | null
          id: string
          motivo_consulta: string | null
          observacoes_adicionais: string | null
          queixa_principal: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          antecedentes_relevantes?: string | null
          client_id: string
          created_at?: string
          diagnostico_inicial?: string | null
          historico_familiar?: string | null
          historico_medico?: string | null
          id?: string
          motivo_consulta?: string | null
          observacoes_adicionais?: string | null
          queixa_principal?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          antecedentes_relevantes?: string | null
          client_id?: string
          created_at?: string
          diagnostico_inicial?: string | null
          historico_familiar?: string | null
          historico_medico?: string | null
          id?: string
          motivo_consulta?: string | null
          observacoes_adicionais?: string | null
          queixa_principal?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      bank_details_audit_log: {
        Row: {
          action: string
          changed_fields: string[] | null
          created_at: string
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action?: string
          changed_fields?: string[] | null
          created_at?: string
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          changed_fields?: string[] | null
          created_at?: string
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          ativo: boolean
          avatar_url: string | null
          contato_emergencia_1_nome: string | null
          contato_emergencia_1_telefone: string | null
          contato_emergencia_2_nome: string | null
          contato_emergencia_2_telefone: string | null
          cpf: string | null
          created_at: string | null
          dados_clinicos: string | null
          data_nascimento: string | null
          eh_crianca_adolescente: boolean | null
          email: string | null
          emergencia_igual_pais: boolean | null
          endereco: string | null
          genero: string | null
          historico: string | null
          id: string
          medicamentos: string[] | null
          nome: string
          nome_mae: string | null
          nome_pai: string | null
          pais: string | null
          plano_saude: string | null
          profissao: string | null
          telefone: string | null
          telefone_mae: string | null
          telefone_pai: string | null
          tratamento: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ativo?: boolean
          avatar_url?: string | null
          contato_emergencia_1_nome?: string | null
          contato_emergencia_1_telefone?: string | null
          contato_emergencia_2_nome?: string | null
          contato_emergencia_2_telefone?: string | null
          cpf?: string | null
          created_at?: string | null
          dados_clinicos?: string | null
          data_nascimento?: string | null
          eh_crianca_adolescente?: boolean | null
          email?: string | null
          emergencia_igual_pais?: boolean | null
          endereco?: string | null
          genero?: string | null
          historico?: string | null
          id?: string
          medicamentos?: string[] | null
          nome: string
          nome_mae?: string | null
          nome_pai?: string | null
          pais?: string | null
          plano_saude?: string | null
          profissao?: string | null
          telefone?: string | null
          telefone_mae?: string | null
          telefone_pai?: string | null
          tratamento?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ativo?: boolean
          avatar_url?: string | null
          contato_emergencia_1_nome?: string | null
          contato_emergencia_1_telefone?: string | null
          contato_emergencia_2_nome?: string | null
          contato_emergencia_2_telefone?: string | null
          cpf?: string | null
          created_at?: string | null
          dados_clinicos?: string | null
          data_nascimento?: string | null
          eh_crianca_adolescente?: boolean | null
          email?: string | null
          emergencia_igual_pais?: boolean | null
          endereco?: string | null
          genero?: string | null
          historico?: string | null
          id?: string
          medicamentos?: string[] | null
          nome?: string
          nome_mae?: string | null
          nome_pai?: string | null
          pais?: string | null
          plano_saude?: string | null
          profissao?: string | null
          telefone?: string | null
          telefone_mae?: string | null
          telefone_pai?: string | null
          tratamento?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      configuracoes: {
        Row: {
          aceita_cartao: boolean | null
          aceita_dinheiro: boolean | null
          aceita_pix: boolean | null
          aceita_transferencia: boolean | null
          background_color: string | null
          background_image: string | null
          booking_enabled: boolean | null
          brand_color: string | null
          chave_pix: string | null
          created_at: string
          custom_css: string | null
          custom_domain: string | null
          custom_footer: string | null
          dados_bancarios: string | null
          dias_atendimento_array: string[] | null
          duracao_sessao: number | null
          email_contato_pacientes: string | null
          horario_fim: string | null
          horario_inicio: string | null
          horarios_por_dia: Json | null
          id: string
          intervalo_sessoes: number | null
          lembrete_24h: boolean | null
          link_agendamento: string | null
          logo_url: string | null
          notificacao_email: boolean | null
          notificacao_whatsapp: boolean | null
          page_description: string | null
          page_title: string | null
          relatorio_semanal: boolean | null
          show_duration: boolean | null
          show_photo: boolean | null
          show_price: boolean | null
          slug: string | null
          theme_preference: string | null
          updated_at: string
          user_id: string
          valor_padrao: number | null
          valor_primeira_consulta: number | null
          whatsapp_contato_pacientes: string | null
        }
        Insert: {
          aceita_cartao?: boolean | null
          aceita_dinheiro?: boolean | null
          aceita_pix?: boolean | null
          aceita_transferencia?: boolean | null
          background_color?: string | null
          background_image?: string | null
          booking_enabled?: boolean | null
          brand_color?: string | null
          chave_pix?: string | null
          created_at?: string
          custom_css?: string | null
          custom_domain?: string | null
          custom_footer?: string | null
          dados_bancarios?: string | null
          dias_atendimento_array?: string[] | null
          duracao_sessao?: number | null
          email_contato_pacientes?: string | null
          horario_fim?: string | null
          horario_inicio?: string | null
          horarios_por_dia?: Json | null
          id?: string
          intervalo_sessoes?: number | null
          lembrete_24h?: boolean | null
          link_agendamento?: string | null
          logo_url?: string | null
          notificacao_email?: boolean | null
          notificacao_whatsapp?: boolean | null
          page_description?: string | null
          page_title?: string | null
          relatorio_semanal?: boolean | null
          show_duration?: boolean | null
          show_photo?: boolean | null
          show_price?: boolean | null
          slug?: string | null
          theme_preference?: string | null
          updated_at?: string
          user_id: string
          valor_padrao?: number | null
          valor_primeira_consulta?: number | null
          whatsapp_contato_pacientes?: string | null
        }
        Update: {
          aceita_cartao?: boolean | null
          aceita_dinheiro?: boolean | null
          aceita_pix?: boolean | null
          aceita_transferencia?: boolean | null
          background_color?: string | null
          background_image?: string | null
          booking_enabled?: boolean | null
          brand_color?: string | null
          chave_pix?: string | null
          created_at?: string
          custom_css?: string | null
          custom_domain?: string | null
          custom_footer?: string | null
          dados_bancarios?: string | null
          dias_atendimento_array?: string[] | null
          duracao_sessao?: number | null
          email_contato_pacientes?: string | null
          horario_fim?: string | null
          horario_inicio?: string | null
          horarios_por_dia?: Json | null
          id?: string
          intervalo_sessoes?: number | null
          lembrete_24h?: boolean | null
          link_agendamento?: string | null
          logo_url?: string | null
          notificacao_email?: boolean | null
          notificacao_whatsapp?: boolean | null
          page_description?: string | null
          page_title?: string | null
          relatorio_semanal?: boolean | null
          show_duration?: boolean | null
          show_photo?: boolean | null
          show_price?: boolean | null
          slug?: string | null
          theme_preference?: string | null
          updated_at?: string
          user_id?: string
          valor_padrao?: number | null
          valor_primeira_consulta?: number | null
          whatsapp_contato_pacientes?: string | null
        }
        Relationships: []
      }
      edge_rate_limits: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          ip: unknown
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          ip: unknown
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          ip?: unknown
        }
        Relationships: []
      }
      events: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          end_time: string | null
          event_date: string
          id: string
          is_public: boolean | null
          is_recurring: boolean | null
          location: string | null
          recurring_end_date: string | null
          recurring_interval: number | null
          recurring_type: string | null
          registration_link: string | null
          start_time: string | null
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          event_date: string
          id?: string
          is_public?: boolean | null
          is_recurring?: boolean | null
          location?: string | null
          recurring_end_date?: string | null
          recurring_interval?: number | null
          recurring_type?: string | null
          registration_link?: string | null
          start_time?: string | null
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          end_time?: string | null
          event_date?: string
          id?: string
          is_public?: boolean | null
          is_recurring?: boolean | null
          location?: string | null
          recurring_end_date?: string | null
          recurring_interval?: number | null
          recurring_type?: string | null
          registration_link?: string | null
          start_time?: string | null
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      evolucoes: {
        Row: {
          client_id: string
          created_at: string
          data_sessao: string
          evolucao: string
          id: string
          session_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          data_sessao: string
          evolucao: string
          id?: string
          session_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          data_sessao?: string
          evolucao?: string
          id?: string
          session_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      filled_records: {
        Row: {
          client_id: string
          content: Json
          created_at: string
          id: string
          session_id: string | null
          template_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          content: Json
          created_at?: string
          id?: string
          session_id?: string | null
          template_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          content?: Json
          created_at?: string
          id?: string
          session_id?: string | null
          template_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "filled_records_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "filled_records_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "filled_records_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "record_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_audit_log: {
        Row: {
          access_timestamp: string
          action: string
          client_id: string
          field_accessed: string | null
          id: string
          ip_address: unknown
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          access_timestamp?: string
          action: string
          client_id: string
          field_accessed?: string | null
          id?: string
          ip_address?: unknown
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          access_timestamp?: string
          action?: string
          client_id?: string
          field_accessed?: string | null
          id?: string
          ip_address?: unknown
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      metas: {
        Row: {
          ativa: boolean
          concluida: boolean
          created_at: string
          data_conclusao: string | null
          data_inicio: string
          id: string
          notificado_50: boolean
          periodo: string
          tipo: string
          updated_at: string
          user_id: string
          valor_meta: number
          versao: number
        }
        Insert: {
          ativa?: boolean
          concluida?: boolean
          created_at?: string
          data_conclusao?: string | null
          data_inicio?: string
          id?: string
          notificado_50?: boolean
          periodo?: string
          tipo: string
          updated_at?: string
          user_id: string
          valor_meta: number
          versao?: number
        }
        Update: {
          ativa?: boolean
          concluida?: boolean
          created_at?: string
          data_conclusao?: string | null
          data_inicio?: string
          id?: string
          notificado_50?: boolean
          periodo?: string
          tipo?: string
          updated_at?: string
          user_id?: string
          valor_meta?: number
          versao?: number
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          created_at: string
          enabled: boolean | null
          events: string[] | null
          frequency: string | null
          id: string
          time: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean | null
          events?: string[] | null
          frequency?: string | null
          id?: string
          time?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean | null
          events?: string[] | null
          frequency?: string | null
          id?: string
          time?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          conteudo: string
          data: string | null
          id: string
          lida: boolean | null
          titulo: string
          user_id: string
        }
        Insert: {
          conteudo: string
          data?: string | null
          id?: string
          lida?: boolean | null
          titulo: string
          user_id: string
        }
        Update: {
          conteudo?: string
          data?: string | null
          id?: string
          lida?: boolean | null
          titulo?: string
          user_id?: string
        }
        Relationships: []
      }
      packages: {
        Row: {
          client_id: string
          created_at: string | null
          data_fim: string | null
          data_inicio: string | null
          id: string
          metodo_pagamento: string | null
          nome: string
          observacoes: string | null
          sessoes_consumidas: number | null
          status: string | null
          total_sessoes: number
          updated_at: string | null
          user_id: string
          valor_por_sessao: number | null
          valor_total: number
        }
        Insert: {
          client_id: string
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          metodo_pagamento?: string | null
          nome: string
          observacoes?: string | null
          sessoes_consumidas?: number | null
          status?: string | null
          total_sessoes: number
          updated_at?: string | null
          user_id: string
          valor_por_sessao?: number | null
          valor_total: number
        }
        Update: {
          client_id?: string
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          metodo_pagamento?: string | null
          nome?: string
          observacoes?: string | null
          sessoes_consumidas?: number | null
          status?: string | null
          total_sessoes?: number
          updated_at?: string | null
          user_id?: string
          valor_por_sessao?: number | null
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "packages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          client_id: string
          created_at: string | null
          data_pagamento: string | null
          data_vencimento: string | null
          id: string
          metodo_pagamento: string | null
          observacoes: string | null
          package_id: string | null
          session_id: string | null
          status: string | null
          updated_at: string | null
          user_id: string
          valor: number
        }
        Insert: {
          client_id: string
          created_at?: string | null
          data_pagamento?: string | null
          data_vencimento?: string | null
          id?: string
          metodo_pagamento?: string | null
          observacoes?: string | null
          package_id?: string | null
          session_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
          valor: number
        }
        Update: {
          client_id?: string
          created_at?: string | null
          data_pagamento?: string | null
          data_vencimento?: string | null
          id?: string
          metodo_pagamento?: string | null
          observacoes?: string | null
          package_id?: string | null
          session_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          agencia: string | null
          avatar_url: string | null
          banco: string | null
          bank_details_updated_at: string | null
          bank_details_validated: boolean | null
          billing_interval: string | null
          bio: string | null
          chave_pix: string | null
          conta: string | null
          cpf_cnpj: string | null
          created_at: string
          crp: string | null
          email_change_nonce: string | null
          email_change_nonce_expires_at: string | null
          email_confirmation_nonce: string | null
          email_confirmation_nonce_expires_at: string | null
          email_confirmed_strict: boolean
          especialidade: string | null
          first_login_completed: boolean | null
          id: string
          is_referral_partner: boolean | null
          left_referral_program_at: string | null
          nome: string
          nome_titular: string | null
          pending_new_email: string | null
          profissao: string | null
          public_avatar_url: string | null
          referral_code: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_cancel_at: string | null
          subscription_end_date: string | null
          subscription_plan: string | null
          telefone: string | null
          tipo_conta: string | null
          tipo_pessoa: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agencia?: string | null
          avatar_url?: string | null
          banco?: string | null
          bank_details_updated_at?: string | null
          bank_details_validated?: boolean | null
          billing_interval?: string | null
          bio?: string | null
          chave_pix?: string | null
          conta?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          crp?: string | null
          email_change_nonce?: string | null
          email_change_nonce_expires_at?: string | null
          email_confirmation_nonce?: string | null
          email_confirmation_nonce_expires_at?: string | null
          email_confirmed_strict?: boolean
          especialidade?: string | null
          first_login_completed?: boolean | null
          id?: string
          is_referral_partner?: boolean | null
          left_referral_program_at?: string | null
          nome: string
          nome_titular?: string | null
          pending_new_email?: string | null
          profissao?: string | null
          public_avatar_url?: string | null
          referral_code?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_cancel_at?: string | null
          subscription_end_date?: string | null
          subscription_plan?: string | null
          telefone?: string | null
          tipo_conta?: string | null
          tipo_pessoa?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agencia?: string | null
          avatar_url?: string | null
          banco?: string | null
          bank_details_updated_at?: string | null
          bank_details_validated?: boolean | null
          billing_interval?: string | null
          bio?: string | null
          chave_pix?: string | null
          conta?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          crp?: string | null
          email_change_nonce?: string | null
          email_change_nonce_expires_at?: string | null
          email_confirmation_nonce?: string | null
          email_confirmation_nonce_expires_at?: string | null
          email_confirmed_strict?: boolean
          especialidade?: string | null
          first_login_completed?: boolean | null
          id?: string
          is_referral_partner?: boolean | null
          left_referral_program_at?: string | null
          nome?: string
          nome_titular?: string | null
          pending_new_email?: string | null
          profissao?: string | null
          public_avatar_url?: string | null
          referral_code?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_cancel_at?: string | null
          subscription_end_date?: string | null
          subscription_plan?: string | null
          telefone?: string | null
          tipo_conta?: string | null
          tipo_pessoa?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      record_templates: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_public: boolean | null
          template_content: Json
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          template_content: Json
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_public?: boolean | null
          template_content?: Json
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      recurring_sessions: {
        Row: {
          client_id: string
          created_at: string | null
          dia_da_semana: number | null
          google_calendar_sync: boolean | null
          horario: string
          id: string
          metodo_pagamento: string | null
          parent_session_id: string | null
          recurrence_count: number | null
          recurrence_end_date: string | null
          recurrence_interval: number | null
          recurrence_type: string
          status: string | null
          updated_at: string | null
          user_id: string
          valor: number | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          dia_da_semana?: number | null
          google_calendar_sync?: boolean | null
          horario: string
          id?: string
          metodo_pagamento?: string | null
          parent_session_id?: string | null
          recurrence_count?: number | null
          recurrence_end_date?: string | null
          recurrence_interval?: number | null
          recurrence_type: string
          status?: string | null
          updated_at?: string | null
          user_id: string
          valor?: number | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          dia_da_semana?: number | null
          google_calendar_sync?: boolean | null
          horario?: string
          id?: string
          metodo_pagamento?: string | null
          parent_session_id?: string | null
          recurrence_count?: number | null
          recurrence_end_date?: string | null
          recurrence_interval?: number | null
          recurrence_type?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "recurring_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_sessions_parent_session_id_fkey"
            columns: ["parent_session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_audit_log: {
        Row: {
          action: string
          billing_interval: string | null
          commission_amount: number | null
          commission_rate: number | null
          created_at: string
          days_remaining: number | null
          discount_amount: number | null
          discount_applied: boolean | null
          failure_reason: string | null
          gateway: string | null
          gateway_customer_id: string | null
          gateway_fee: number | null
          gateway_payment_id: string | null
          gateway_subscription_id: string | null
          gross_amount: number | null
          id: string
          ineligibility_reason: string | null
          ip_address: unknown
          metadata: Json | null
          net_amount: number | null
          new_plan: string | null
          payout_id: string | null
          previous_plan: string | null
          proration_charge: number | null
          proration_credit: number | null
          referral_id: string | null
          referred_user_id: string | null
          referrer_user_id: string | null
          status: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          billing_interval?: string | null
          commission_amount?: number | null
          commission_rate?: number | null
          created_at?: string
          days_remaining?: number | null
          discount_amount?: number | null
          discount_applied?: boolean | null
          failure_reason?: string | null
          gateway?: string | null
          gateway_customer_id?: string | null
          gateway_fee?: number | null
          gateway_payment_id?: string | null
          gateway_subscription_id?: string | null
          gross_amount?: number | null
          id?: string
          ineligibility_reason?: string | null
          ip_address?: unknown
          metadata?: Json | null
          net_amount?: number | null
          new_plan?: string | null
          payout_id?: string | null
          previous_plan?: string | null
          proration_charge?: number | null
          proration_credit?: number | null
          referral_id?: string | null
          referred_user_id?: string | null
          referrer_user_id?: string | null
          status?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          billing_interval?: string | null
          commission_amount?: number | null
          commission_rate?: number | null
          created_at?: string
          days_remaining?: number | null
          discount_amount?: number | null
          discount_applied?: boolean | null
          failure_reason?: string | null
          gateway?: string | null
          gateway_customer_id?: string | null
          gateway_fee?: number | null
          gateway_payment_id?: string | null
          gateway_subscription_id?: string | null
          gross_amount?: number | null
          id?: string
          ineligibility_reason?: string | null
          ip_address?: unknown
          metadata?: Json | null
          net_amount?: number | null
          new_plan?: string | null
          payout_id?: string | null
          previous_plan?: string | null
          proration_charge?: number | null
          proration_credit?: number | null
          referral_id?: string | null
          referred_user_id?: string | null
          referrer_user_id?: string | null
          status?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_audit_log_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "referral_payouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_audit_log_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_payouts: {
        Row: {
          amount: number
          asaas_transfer_id: string | null
          created_at: string
          currency: string | null
          failure_reason: string | null
          id: string
          paid_at: string | null
          payment_method: string | null
          period_end: string | null
          period_start: string | null
          referral_id: string | null
          referred_plan: string | null
          referred_user_name: string | null
          referrer_user_id: string
          status: string
          stripe_transfer_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          asaas_transfer_id?: string | null
          created_at?: string
          currency?: string | null
          failure_reason?: string | null
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          period_end?: string | null
          period_start?: string | null
          referral_id?: string | null
          referred_plan?: string | null
          referred_user_name?: string | null
          referrer_user_id: string
          status?: string
          stripe_transfer_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          asaas_transfer_id?: string | null
          created_at?: string
          currency?: string | null
          failure_reason?: string | null
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          period_end?: string | null
          period_start?: string | null
          referral_id?: string | null
          referred_plan?: string | null
          referred_user_name?: string | null
          referrer_user_id?: string
          status?: string
          stripe_transfer_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_payouts_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          commission_amount: number | null
          commission_rate: number | null
          created_at: string
          first_payment_date: string | null
          id: string
          referral_code: string
          referred_user_id: string
          referrer_user_id: string
          status: string
          subscription_amount: number | null
          subscription_plan: string | null
          updated_at: string
        }
        Insert: {
          commission_amount?: number | null
          commission_rate?: number | null
          created_at?: string
          first_payment_date?: string | null
          id?: string
          referral_code: string
          referred_user_id: string
          referrer_user_id: string
          status?: string
          subscription_amount?: number | null
          subscription_plan?: string | null
          updated_at?: string
        }
        Update: {
          commission_amount?: number | null
          commission_rate?: number | null
          created_at?: string
          first_payment_date?: string | null
          id?: string
          referral_code?: string
          referred_user_id?: string
          referrer_user_id?: string
          status?: string
          subscription_amount?: number | null
          subscription_plan?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      registration_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          token: string
          used: boolean
          used_at: string | null
          used_by_client_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          token: string
          used?: boolean
          used_at?: string | null
          used_by_client_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
          used?: boolean
          used_at?: string | null
          used_by_client_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      session_notes: {
        Row: {
          client_id: string
          created_at: string
          id: string
          is_private: boolean | null
          notes: string
          session_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          is_private?: boolean | null
          notes: string
          session_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          is_private?: boolean | null
          notes?: string
          session_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_notes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          anotacoes: string | null
          client_id: string
          created_at: string | null
          data: string
          google_attendees: Json | null
          google_event_id: string | null
          google_html_link: string | null
          google_ignored: boolean | null
          google_last_synced: string | null
          google_location: string | null
          google_recurrence_id: string | null
          google_sync_type: string | null
          horario: string
          id: string
          is_modified: boolean | null
          metodo_pagamento: string | null
          package_id: string | null
          recurring_session_id: string | null
          session_type: string | null
          status: string | null
          updated_at: string | null
          user_id: string
          valor: number | null
        }
        Insert: {
          anotacoes?: string | null
          client_id: string
          created_at?: string | null
          data: string
          google_attendees?: Json | null
          google_event_id?: string | null
          google_html_link?: string | null
          google_ignored?: boolean | null
          google_last_synced?: string | null
          google_location?: string | null
          google_recurrence_id?: string | null
          google_sync_type?: string | null
          horario: string
          id?: string
          is_modified?: boolean | null
          metodo_pagamento?: string | null
          package_id?: string | null
          recurring_session_id?: string | null
          session_type?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
          valor?: number | null
        }
        Update: {
          anotacoes?: string | null
          client_id?: string
          created_at?: string | null
          data?: string
          google_attendees?: Json | null
          google_event_id?: string | null
          google_html_link?: string | null
          google_ignored?: boolean | null
          google_last_synced?: string | null
          google_location?: string | null
          google_recurrence_id?: string | null
          google_sync_type?: string | null
          horario?: string
          id?: string
          is_modified?: boolean | null
          metodo_pagamento?: string | null
          package_id?: string | null
          recurring_session_id?: string | null
          session_type?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_recurring_session_id_fkey"
            columns: ["recurring_session_id"]
            isOneToOne: false
            referencedRelation: "recurring_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_connect_accounts: {
        Row: {
          account_status: string
          charges_enabled: boolean | null
          country: string | null
          created_at: string
          details_submitted: boolean | null
          id: string
          payouts_enabled: boolean | null
          stripe_account_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_status?: string
          charges_enabled?: boolean | null
          country?: string | null
          created_at?: string
          details_submitted?: boolean | null
          id?: string
          payouts_enabled?: boolean | null
          stripe_account_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_status?: string
          charges_enabled?: boolean | null
          country?: string | null
          created_at?: string
          details_submitted?: boolean | null
          id?: string
          payouts_enabled?: boolean | null
          stripe_account_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_2fa_backup_codes: {
        Row: {
          code: string
          created_at: string | null
          id: string
          used: boolean | null
          used_at: string | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          used?: boolean | null
          used_at?: string | null
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          used?: boolean | null
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_2fa_email_codes: {
        Row: {
          code: string
          created_at: string | null
          expires_at: string
          id: string
          used: boolean | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string | null
          expires_at: string
          id?: string
          used?: boolean | null
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          used?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      user_2fa_reset_requests: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          expires_at: string
          id: string
          reset_token: string
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          expires_at: string
          id?: string
          reset_token: string
          user_id: string
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          expires_at?: string
          id?: string
          reset_token?: string
          user_id?: string
        }
        Relationships: []
      }
      user_2fa_settings: {
        Row: {
          authenticator_2fa_enabled: boolean | null
          authenticator_secret: string | null
          created_at: string | null
          email_2fa_enabled: boolean | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          authenticator_2fa_enabled?: boolean | null
          authenticator_secret?: string | null
          created_at?: string | null
          email_2fa_enabled?: boolean | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          authenticator_2fa_enabled?: boolean | null
          authenticator_secret?: string | null
          created_at?: string | null
          email_2fa_enabled?: boolean | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_coupons: {
        Row: {
          code: string
          coupon_type: string
          created_at: string
          description: string
          discount: string
          expires_at: string | null
          id: string
          is_used: boolean
          updated_at: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          code: string
          coupon_type?: string
          created_at?: string
          description: string
          discount: string
          expires_at?: string | null
          id?: string
          is_used?: boolean
          updated_at?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          code?: string
          coupon_type?: string
          created_at?: string
          description?: string
          discount?: string
          expires_at?: string | null
          id?: string
          is_used?: boolean
          updated_at?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      clients_safe: {
        Row: {
          ativo: boolean | null
          avatar_url: string | null
          created_at: string | null
          dados_clinicos_status: string | null
          email: string | null
          has_medical_data: boolean | null
          historico_status: string | null
          id: string | null
          nome: string | null
          telefone: string | null
          updated_at: string | null
          user_id: string | null
          view_accessed_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_access_client_safe_view: {
        Args: { client_user_id: string }
        Returns: boolean
      }
      check_admin_lockout: {
        Args: {
          p_email_hash: string
          p_ip: unknown
          p_lockout_minutes?: number
          p_max_attempts?: number
        }
        Returns: boolean
      }
      check_overdue_payments: { Args: never; Returns: undefined }
      check_rate_limit: {
        Args: {
          p_endpoint: string
          p_ip: unknown
          p_max_requests?: number
          p_window_minutes?: number
        }
        Returns: boolean
      }
      check_unauthorized_attempts: { Args: never; Returns: undefined }
      check_usage_spikes: { Args: never; Returns: undefined }
      cleanup_expired_2fa_codes: { Args: never; Returns: undefined }
      cleanup_expired_registration_tokens: { Args: never; Returns: undefined }
      cleanup_old_notifications: { Args: never; Returns: undefined }
      clear_admin_lockout: {
        Args: { p_email_hash: string; p_ip: unknown }
        Returns: undefined
      }
      create_admin_notification: {
        Args: {
          p_message: string
          p_metadata?: Json
          p_severity?: string
          p_title: string
          p_type: string
        }
        Returns: string
      }
      current_user_has_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      export_client_data_secure: {
        Args: { p_client_id: string }
        Returns: Json
      }
      generate_unique_referral_code: { Args: never; Returns: string }
      get_client_medical_data: { Args: { p_client_id: string }; Returns: Json }
      get_client_summary: { Args: { client_id: string }; Returns: Json }
      get_clients_safe_data: {
        Args: never
        Returns: {
          ativo: boolean
          avatar_url: string
          created_at: string
          dados_clinicos_status: string
          email: string
          has_medical_data: boolean
          historico_status: string
          id: string
          nome: string
          telefone: string
          updated_at: string
          user_id: string
          view_accessed_at: string
        }[]
      }
      get_clients_safe_security_status: { Args: never; Returns: Json }
      get_public_profile_by_slug: { Args: { page_slug: string }; Returns: Json }
      get_referrer_public_info: {
        Args: { referral_code: string }
        Returns: {
          avatar_url: string
          nome: string
          profissao: string
          user_id: string
        }[]
      }
      get_safe_booking_data: { Args: { page_slug: string }; Returns: Json }
      get_safe_clients: {
        Args: never
        Returns: {
          ativo: boolean
          avatar_url: string
          created_at: string
          dados_clinicos_status: string
          email: string
          has_medical_data: boolean
          historico_status: string
          id: string
          nome: string
          telefone: string
          updated_at: string
          user_id: string
          view_accessed_at: string
        }[]
      }
      get_security_summary: { Args: never; Returns: Json }
      grant_user_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_medical_data_access: {
        Args: {
          p_action: string
          p_client_id: string
          p_field_accessed?: string
        }
        Returns: undefined
      }
      record_admin_login_attempt: {
        Args: { p_email_hash: string; p_ip: unknown; p_success: boolean }
        Returns: undefined
      }
      register_client_from_token: {
        Args: { p_client_data: Json; p_token: string }
        Returns: Json
      }
      revoke_user_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      sanitize_medical_text: { Args: { input_text: string }; Returns: string }
      sanitize_text: { Args: { input_text: string }; Returns: string }
      secure_client_data_access_validator: { Args: never; Returns: boolean }
      secure_client_query_validator: {
        Args: { requested_user_id: string }
        Returns: boolean
      }
      send_session_reminders: { Args: never; Returns: undefined }
      update_client_medical_data: {
        Args: {
          p_client_id: string
          p_dados_clinicos?: string
          p_historico?: string
        }
        Returns: boolean
      }
      validate_clients_safe_security: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
