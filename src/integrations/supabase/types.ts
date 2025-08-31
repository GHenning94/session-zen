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
          updated_at?: string
          user_id?: string
          valor_padrao?: number | null
          valor_primeira_consulta?: number | null
          whatsapp_contato_pacientes?: string | null
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
          public_avatar_url: string | null
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
          public_avatar_url?: string | null
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
          public_avatar_url?: string | null
          subscription_plan?: string | null
          telefone?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_public_profile_by_slug: {
        Args: { page_slug: string }
        Returns: Json
      }
      get_safe_booking_data: {
        Args: { page_slug: string }
        Returns: Json
      }
      send_session_reminders: {
        Args: Record<PropertyKey, never>
        Returns: undefined
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
