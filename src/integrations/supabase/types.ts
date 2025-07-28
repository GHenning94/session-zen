export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      clients: {
        Row: {
          created_at: string | null
          dados_clinicos: string | null
          email: string | null
          historico: string | null
          id: string
          nome: string
          telefone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          dados_clinicos?: string | null
          email?: string | null
          historico?: string | null
          id?: string
          nome: string
          telefone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          dados_clinicos?: string | null
          email?: string | null
          historico?: string | null
          id?: string
          nome?: string
          telefone?: string | null
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
          show_price: boolean | null
          slug: string | null
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
          show_price?: boolean | null
          slug?: string | null
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
          show_price?: boolean | null
          slug?: string | null
          updated_at?: string
          user_id?: string
          valor_padrao?: number | null
          valor_primeira_consulta?: number | null
          whatsapp_contato_pacientes?: string | null
        }
        Relationships: []
      }
      notificacoes: {
        Row: {
          data_envio: string
          id: string
          lida: boolean | null
          mensagem: string
          titulo: string
          user_id: string
        }
        Insert: {
          data_envio?: string
          id?: string
          lida?: boolean | null
          mensagem: string
          titulo: string
          user_id: string
        }
        Update: {
          data_envio?: string
          id?: string
          lida?: boolean | null
          mensagem?: string
          titulo?: string
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
      pacientes: {
        Row: {
          created_at: string
          email: string | null
          id: string
          nome: string
          observacoes: string | null
          telefone: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          telefone?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          telefone?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          crp: string | null
          especialidade: string | null
          id: string
          nome: string
          plano: string | null
          profissao: string | null
          subscription_plan: string | null
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          crp?: string | null
          especialidade?: string | null
          id?: string
          nome: string
          plano?: string | null
          profissao?: string | null
          subscription_plan?: string | null
          telefone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          crp?: string | null
          especialidade?: string | null
          id?: string
          nome?: string
          plano?: string | null
          profissao?: string | null
          subscription_plan?: string | null
          telefone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          anotacoes: string | null
          client_id: string
          created_at: string | null
          data: string
          horario: string
          id: string
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
          horario: string
          id?: string
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
          horario?: string
          id?: string
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
        ]
      }
      sessoes: {
        Row: {
          created_at: string
          data: string
          horario: string
          id: string
          observacoes: string | null
          paciente_id: string
          status_pagamento: string | null
          user_id: string
          valor: number | null
        }
        Insert: {
          created_at?: string
          data: string
          horario: string
          id?: string
          observacoes?: string | null
          paciente_id: string
          status_pagamento?: string | null
          user_id: string
          valor?: number | null
        }
        Update: {
          created_at?: string
          data?: string
          horario?: string
          id?: string
          observacoes?: string | null
          paciente_id?: string
          status_pagamento?: string | null
          user_id?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sessoes_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_public_profile_by_slug: {
        Args: { page_slug: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
