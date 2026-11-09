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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      datasets: {
        Row: {
          client_id: string
          column_mapping: Json
          created_at: string
          date_max: string | null
          date_min: string | null
          filename: string
          id: string
          product_count: number
          row_count: number
        }
        Insert: {
          client_id: string
          column_mapping?: Json
          created_at?: string
          date_max?: string | null
          date_min?: string | null
          filename: string
          id?: string
          product_count?: number
          row_count?: number
        }
        Update: {
          client_id?: string
          column_mapping?: Json
          created_at?: string
          date_max?: string | null
          date_min?: string | null
          filename?: string
          id?: string
          product_count?: number
          row_count?: number
        }
        Relationships: []
      }
      forecasts: {
        Row: {
          client_id: string
          created_at: string
          horizon_days: number
          id: string
          metrics: Json
          model_id: string
          product: string
          series: Json
        }
        Insert: {
          client_id: string
          created_at?: string
          horizon_days?: number
          id?: string
          metrics?: Json
          model_id: string
          product: string
          series: Json
        }
        Update: {
          client_id?: string
          created_at?: string
          horizon_days?: number
          id?: string
          metrics?: Json
          model_id?: string
          product?: string
          series?: Json
        }
        Relationships: [
          {
            foreignKeyName: "forecasts_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "ml_models"
            referencedColumns: ["id"]
          },
        ]
      }
      ml_models: {
        Row: {
          client_id: string
          created_at: string
          dataset_id: string
          error: string | null
          id: string
          metrics: Json
          remote_model_id: string | null
          status: string
          trained_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          dataset_id: string
          error?: string | null
          id?: string
          metrics?: Json
          remote_model_id?: string | null
          status?: string
          trained_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          dataset_id?: string
          error?: string | null
          id?: string
          metrics?: Json
          remote_model_id?: string | null
          status?: string
          trained_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ml_models_dataset_id_fkey"
            columns: ["dataset_id"]
            isOneToOne: false
            referencedRelation: "datasets"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          id: string
          full_name: string | null
          company_name: string | null
          created_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          company_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          company_name?: string | null
          created_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          id: string
          user_id: string
          name: string
          sku: string | null
          category: string | null
          lead_time_days: number
          holding_cost: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          sku?: string | null
          category?: string | null
          lead_time_days?: number
          holding_cost?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          sku?: string | null
          category?: string | null
          lead_time_days?: number
          holding_cost?: number | null
          created_at?: string
        }
        Relationships: []
      }
      historical_sales: {
        Row: {
          id: string
          user_id: string
          product_id: string | null
          product_name: string
          sale_date: string
          sales_volume: number
          unit_price: number | null
          promo_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          product_id?: string | null
          product_name: string
          sale_date: string
          sales_volume: number
          unit_price?: number | null
          promo_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          product_id?: string | null
          product_name?: string
          sale_date?: string
          sales_volume?: number
          unit_price?: number | null
          promo_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      forecast_results: {
        Row: {
          id: string
          user_id: string
          product_name: string
          session_id: string
          horizon_days: number
          series: unknown
          history: unknown
          metrics: unknown
          metrics_quantity: unknown | null
          metrics_price: unknown | null
          generated_at: string
          source: string | null
        }
        Insert: {
          id?: string
          user_id: string
          product_name: string
          session_id?: string
          horizon_days?: number
          series?: unknown
          history?: unknown
          metrics?: unknown
          metrics_quantity?: unknown | null
          metrics_price?: unknown | null
          generated_at?: string
          source?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          product_name?: string
          session_id?: string
          horizon_days?: number
          series?: unknown
          history?: unknown
          metrics?: unknown
          metrics_quantity?: unknown | null
          metrics_price?: unknown | null
          generated_at?: string
          source?: string | null
        }
        Relationships: []
      }
      inventory_overrides: {
        Row: {
          id: string
          user_id: string
          product_name: string
          current_stock: number | null
          unit_price: number | null
          lead_time_days: number | null
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          product_name: string
          current_stock?: number | null
          unit_price?: number | null
          lead_time_days?: number | null
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          product_name?: string
          current_stock?: number | null
          unit_price?: number | null
          lead_time_days?: number | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
