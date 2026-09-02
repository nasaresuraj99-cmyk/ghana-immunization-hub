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
      activity_logs: {
        Row: {
          action: string
          created_at: string
          description: string | null
          entity_id: string | null
          entity_type: string
          facility_id: string
          id: string
          new_data: Json | null
          old_data: Json | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type: string
          facility_id: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string
          facility_id?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      children: {
        Row: {
          community: string | null
          created_at: string
          created_by_user_id: string
          date_of_birth: string
          deleted_at: string | null
          deleted_by_user_id: string | null
          facility_id: string
          id: string
          is_deleted: boolean
          mother_name: string
          name: string
          reg_no: string
          sex: string
          telephone_address: string | null
          updated_at: string
          vaccines: Json
        }
        Insert: {
          community?: string | null
          created_at?: string
          created_by_user_id: string
          date_of_birth: string
          deleted_at?: string | null
          deleted_by_user_id?: string | null
          facility_id: string
          id?: string
          is_deleted?: boolean
          mother_name: string
          name: string
          reg_no: string
          sex: string
          telephone_address?: string | null
          updated_at?: string
          vaccines?: Json
        }
        Update: {
          community?: string | null
          created_at?: string
          created_by_user_id?: string
          date_of_birth?: string
          deleted_at?: string | null
          deleted_by_user_id?: string | null
          facility_id?: string
          id?: string
          is_deleted?: boolean
          mother_name?: string
          name?: string
          reg_no?: string
          sex?: string
          telephone_address?: string | null
          updated_at?: string
          vaccines?: Json
        }
        Relationships: [
          {
            foreignKeyName: "children_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      facilities: {
        Row: {
          address: string | null
          code: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          code: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          code?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory_stock_settings: {
        Row: {
          created_at: string
          critical_expiry_warning_days: number
          default_critical_stock: number
          default_minimum_stock: number
          facility_id: string
          id: string
          near_expiry_warning_days: number
          updated_at: string
          vaccine_specific_settings: Json | null
        }
        Insert: {
          created_at?: string
          critical_expiry_warning_days?: number
          default_critical_stock?: number
          default_minimum_stock?: number
          facility_id: string
          id?: string
          near_expiry_warning_days?: number
          updated_at?: string
          vaccine_specific_settings?: Json | null
        }
        Update: {
          created_at?: string
          critical_expiry_warning_days?: number
          default_critical_stock?: number
          default_minimum_stock?: number
          facility_id?: string
          id?: string
          near_expiry_warning_days?: number
          updated_at?: string
          vaccine_specific_settings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_stock_settings_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: true
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transactions: {
        Row: {
          batch_number: string | null
          child_id: string | null
          created_at: string
          facility_id: string
          id: string
          inventory_id: string
          new_quantity: number | null
          old_quantity: number | null
          outreach_session_id: string | null
          performed_by_user_id: string
          quantity: number
          reason: string | null
          session_id: string | null
          transaction_type: string
        }
        Insert: {
          batch_number?: string | null
          child_id?: string | null
          created_at?: string
          facility_id: string
          id?: string
          inventory_id: string
          new_quantity?: number | null
          old_quantity?: number | null
          outreach_session_id?: string | null
          performed_by_user_id: string
          quantity: number
          reason?: string | null
          session_id?: string | null
          transaction_type: string
        }
        Update: {
          batch_number?: string | null
          child_id?: string | null
          created_at?: string
          facility_id?: string
          id?: string
          inventory_id?: string
          new_quantity?: number | null
          old_quantity?: number | null
          outreach_session_id?: string | null
          performed_by_user_id?: string
          quantity?: number
          reason?: string | null
          session_id?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "vaccine_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_outreach_session_id_fkey"
            columns: ["outreach_session_id"]
            isOneToOne: false
            referencedRelation: "outreach_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_inventory_allocations: {
        Row: {
          allocated_quantity: number
          created_at: string
          created_by_user_id: string
          facility_id: string
          id: string
          inventory_id: string
          notes: string | null
          outreach_session_id: string
          reconciled_at: string | null
          reconciled_by_user_id: string | null
          returned_quantity: number
          status: string
          updated_at: string
          used_quantity: number
          wasted_quantity: number
        }
        Insert: {
          allocated_quantity: number
          created_at?: string
          created_by_user_id: string
          facility_id: string
          id?: string
          inventory_id: string
          notes?: string | null
          outreach_session_id: string
          reconciled_at?: string | null
          reconciled_by_user_id?: string | null
          returned_quantity?: number
          status?: string
          updated_at?: string
          used_quantity?: number
          wasted_quantity?: number
        }
        Update: {
          allocated_quantity?: number
          created_at?: string
          created_by_user_id?: string
          facility_id?: string
          id?: string
          inventory_id?: string
          notes?: string | null
          outreach_session_id?: string
          reconciled_at?: string | null
          reconciled_by_user_id?: string | null
          returned_quantity?: number
          status?: string
          updated_at?: string
          used_quantity?: number
          wasted_quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "outreach_inventory_allocations_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "vaccine_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outreach_inventory_allocations_outreach_session_id_fkey"
            columns: ["outreach_session_id"]
            isOneToOne: false
            referencedRelation: "outreach_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      outreach_sessions: {
        Row: {
          created_at: string
          created_by_user_id: string
          facility_id: string
          id: string
          location: string | null
          notes: string | null
          session_date: string
          session_name: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_user_id: string
          facility_id: string
          id?: string
          location?: string | null
          notes?: string | null
          session_date: string
          session_name: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string
          facility_id?: string
          id?: string
          location?: string | null
          notes?: string | null
          session_date?: string
          session_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outreach_sessions_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          facility_id: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          facility_id?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          facility_id?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_history: {
        Row: {
          completed_at: string | null
          error_message: string | null
          facility_id: string | null
          failed_count: number
          id: string
          started_at: string
          status: string
          synced_count: number
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          error_message?: string | null
          facility_id?: string | null
          failed_count?: number
          id?: string
          started_at?: string
          status: string
          synced_count?: number
          user_id: string
        }
        Update: {
          completed_at?: string | null
          error_message?: string | null
          facility_id?: string | null
          failed_count?: number
          id?: string
          started_at?: string
          status?: string
          synced_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_history_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          facility_id: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          facility_id: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          facility_id?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      vaccine_inventory: {
        Row: {
          batch_number: string
          created_at: string
          created_by_user_id: string
          critical_stock_level: number | null
          expiry_date: string
          facility_id: string
          id: string
          initial_quantity: number
          is_active: boolean
          manufacturer: string | null
          minimum_stock_level: number | null
          notes: string | null
          quantity: number
          received_date: string
          source: string | null
          status: string | null
          storage_location: string | null
          supplier: string | null
          temperature_requirement: string | null
          unit: string
          updated_at: string
          vaccine_name: string
        }
        Insert: {
          batch_number: string
          created_at?: string
          created_by_user_id: string
          critical_stock_level?: number | null
          expiry_date: string
          facility_id: string
          id?: string
          initial_quantity: number
          is_active?: boolean
          manufacturer?: string | null
          minimum_stock_level?: number | null
          notes?: string | null
          quantity?: number
          received_date?: string
          source?: string | null
          status?: string | null
          storage_location?: string | null
          supplier?: string | null
          temperature_requirement?: string | null
          unit?: string
          updated_at?: string
          vaccine_name: string
        }
        Update: {
          batch_number?: string
          created_at?: string
          created_by_user_id?: string
          critical_stock_level?: number | null
          expiry_date?: string
          facility_id?: string
          id?: string
          initial_quantity?: number
          is_active?: boolean
          manufacturer?: string | null
          minimum_stock_level?: number | null
          notes?: string | null
          quantity?: number
          received_date?: string
          source?: string | null
          status?: string | null
          storage_location?: string | null
          supplier?: string | null
          temperature_requirement?: string | null
          unit?: string
          updated_at?: string
          vaccine_name?: string
        }
        Relationships: []
      }
      vaccine_wastage: {
        Row: {
          created_at: string
          facility_id: string
          id: string
          inventory_id: string
          notes: string | null
          outreach_session_id: string | null
          quantity: number
          reason: string
          recorded_by_user_id: string
          wastage_type: string
        }
        Insert: {
          created_at?: string
          facility_id: string
          id?: string
          inventory_id: string
          notes?: string | null
          outreach_session_id?: string | null
          quantity: number
          reason: string
          recorded_by_user_id: string
          wastage_type: string
        }
        Update: {
          created_at?: string
          facility_id?: string
          id?: string
          inventory_id?: string
          notes?: string | null
          outreach_session_id?: string | null
          quantity?: number
          reason?: string
          recorded_by_user_id?: string
          wastage_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "vaccine_wastage_inventory_id_fkey"
            columns: ["inventory_id"]
            isOneToOne: false
            referencedRelation: "vaccine_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vaccine_wastage_outreach_session_id_fkey"
            columns: ["outreach_session_id"]
            isOneToOne: false
            referencedRelation: "outreach_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      deduct_vaccine_fefo:
        | {
            Args: {
              p_child_id?: string
              p_facility_id: string
              p_performed_by_user_id?: string
              p_quantity: number
              p_session_id?: string
              p_vaccine_name: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_child_id?: string
              p_facility_id: string
              p_performed_by_user_id?: string
              p_quantity: number
              p_session_id?: string
              p_vaccine_name: string
            }
            Returns: Json
          }
      get_user_facility_id:
        | {
            Args: { _user_id: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.get_user_facility_id(_user_id => text), public.get_user_facility_id(_user_id => uuid). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { _user_id: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.get_user_facility_id(_user_id => text), public.get_user_facility_id(_user_id => uuid). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
      get_vaccine_inventory_status: {
        Args: { p_facility_id: string; p_vaccine_name: string }
        Returns: Json
      }
      has_role:
        | {
            Args: {
              _role: Database["public"]["Enums"]["app_role"]
              _user_id: string
            }
            Returns: boolean
          }
        | {
            Args: {
              _role: Database["public"]["Enums"]["app_role"]
              _user_id: string
            }
            Returns: boolean
          }
      is_facility_admin:
        | { Args: { _facility_id: string; _user_id: string }; Returns: boolean }
        | { Args: { _facility_id: string; _user_id: string }; Returns: boolean }
      user_in_facility:
        | { Args: { _facility_id: string; _user_id: string }; Returns: boolean }
        | { Args: { _facility_id: string; _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "facility_admin" | "staff" | "read_only"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["facility_admin", "staff", "read_only"],
    },
  },
} as const
