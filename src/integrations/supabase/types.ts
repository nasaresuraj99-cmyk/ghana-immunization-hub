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
    PostgrestVersion: "14.1"
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_facility_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_facility_admin: {
        Args: { _facility_id: string; _user_id: string }
        Returns: boolean
      }
      user_in_facility: {
        Args: { _facility_id: string; _user_id: string }
        Returns: boolean
      }
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
      app_role: ["facility_admin", "staff", "read_only"],
    },
  },
} as const
