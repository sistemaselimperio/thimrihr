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
      app_settings: {
        Row: {
          created_at: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      companies: {
        Row: {
          created_at: string
          id: string
          islero_logo_name: string | null
          islero_logo_path: string | null
          logo_name: string | null
          logo_path: string | null
          name: string
          nit: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          islero_logo_name?: string | null
          islero_logo_path?: string | null
          logo_name?: string | null
          logo_path?: string | null
          name: string
          nit?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          islero_logo_name?: string | null
          islero_logo_path?: string | null
          logo_name?: string | null
          logo_path?: string | null
          name?: string
          nit?: string | null
        }
        Relationships: []
      }
      document_templates: {
        Row: {
          body: string
          category: string
          company_id: string | null
          created_at: string
          description: string | null
          file_path: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          body?: string
          category?: string
          company_id?: string | null
          created_at?: string
          description?: string | null
          file_path?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          body?: string
          category?: string
          company_id?: string | null
          created_at?: string
          description?: string | null
          file_path?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          cedula: string
          company_id: string | null
          contract_end_date: string | null
          contract_type: string
          created_at: string
          email: string | null
          exit_date: string | null
          first_name: string | null
          folder_number: string | null
          full_name: string
          hire_date: string | null
          id: string
          landline: string | null
          id_issue_place: string | null
          address: string | null
          contact1_name: string | null
          contact1_relationship: string | null
          contact1_phone: string | null
          contact2_name: string | null
          contact2_relationship: string | null
          contact2_phone: string | null
          bank_name: string | null
          bank_account_type: string | null
          bank_account_number: string | null
          eps: string | null
          pension_fund: string | null
          severance_fund: string | null
          arl: string | null
          compensation_fund: string | null
          last_name: string | null
          municipality: string | null
          notes: string | null
          phone: string | null
          position: string | null
          status: string
          updated_at: string
          work_location: string | null
          work_schedule: string | null
        }
        Insert: {
          cedula: string
          company_id?: string | null
          contract_end_date?: string | null
          contract_type?: string
          created_at?: string
          email?: string | null
          exit_date?: string | null
          first_name?: string | null
          folder_number?: string | null
          full_name: string
          hire_date?: string | null
          id?: string
          landline?: string | null
          id_issue_place?: string | null
          address?: string | null
          contact1_name?: string | null
          contact1_relationship?: string | null
          contact1_phone?: string | null
          contact2_name?: string | null
          contact2_relationship?: string | null
          contact2_phone?: string | null
          bank_name?: string | null
          bank_account_type?: string | null
          bank_account_number?: string | null
          eps?: string | null
          pension_fund?: string | null
          severance_fund?: string | null
          arl?: string | null
          compensation_fund?: string | null
          last_name?: string | null
          municipality?: string | null
          notes?: string | null
          phone?: string | null
          position?: string | null
          status?: string
          updated_at?: string
          work_location?: string | null
          work_schedule?: string | null
        }
        Update: {
          cedula?: string
          company_id?: string | null
          contract_end_date?: string | null
          contract_type?: string
          created_at?: string
          email?: string | null
          exit_date?: string | null
          first_name?: string | null
          folder_number?: string | null
          full_name?: string
          hire_date?: string | null
          id?: string
          landline?: string | null
          id_issue_place?: string | null
          address?: string | null
          contact1_name?: string | null
          contact1_relationship?: string | null
          contact1_phone?: string | null
          contact2_name?: string | null
          contact2_relationship?: string | null
          contact2_phone?: string | null
          bank_name?: string | null
          bank_account_type?: string | null
          bank_account_number?: string | null
          eps?: string | null
          pension_fund?: string | null
          severance_fund?: string | null
          arl?: string | null
          compensation_fund?: string | null
          last_name?: string | null
          municipality?: string | null
          notes?: string | null
          phone?: string | null
          position?: string | null
          status?: string
          updated_at?: string
          work_location?: string | null
          work_schedule?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_documents: {
        Row: {
          company_name: string | null
          content: string
          created_at: string
          employee_id: string | null
          employee_name: string
          id: string
          template_id: string | null
          template_name: string
        }
        Insert: {
          company_name?: string | null
          content: string
          created_at?: string
          employee_id?: string | null
          employee_name: string
          id?: string
          template_id?: string | null
          template_name: string
        }
        Update: {
          company_name?: string | null
          content?: string
          created_at?: string
          employee_id?: string | null
          employee_name?: string
          id?: string
          template_id?: string | null
          template_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      holidays: {
        Row: {
          created_at: string
          date: string
          name: string
          source: string
          year: number
        }
        Insert: {
          created_at?: string
          date: string
          name: string
          source?: string
          year: number
        }
        Update: {
          created_at?: string
          date?: string
          name?: string
          source?: string
          year?: number
        }
        Relationships: []
      }
      import_batches: {
        Row: {
          created_at: string
          created_by: string | null
          created_count: number
          error_count: number
          errors: Json
          file_name: string
          id: string
          total_rows: number
          updated_count: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          created_count?: number
          error_count?: number
          errors?: Json
          file_name: string
          id?: string
          total_rows?: number
          updated_count?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          created_count?: number
          error_count?: number
          errors?: Json
          file_name?: string
          id?: string
          total_rows?: number
          updated_count?: number
        }
        Relationships: []
      }
      incapacities: {
        Row: {
          certificate_path: string | null
          created_at: string
          employee_id: string
          end_date: string
          id: string
          notes: string | null
          start_date: string
          type: string
          updated_at: string
        }
        Insert: {
          certificate_path?: string | null
          created_at?: string
          employee_id: string
          end_date: string
          id?: string
          notes?: string | null
          start_date: string
          type?: string
          updated_at?: string
        }
        Update: {
          certificate_path?: string | null
          created_at?: string
          employee_id?: string
          end_date?: string
          id?: string
          notes?: string | null
          start_date?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incapacities_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      leaves: {
        Row: {
          created_at: string
          days: number
          employee_id: string
          end_date: string
          id: string
          notes: string | null
          reason: string
          start_date: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          days?: number
          employee_id: string
          end_date: string
          id?: string
          notes?: string | null
          reason?: string
          start_date: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          days?: number
          employee_id?: string
          end_date?: string
          id?: string
          notes?: string | null
          reason?: string
          start_date?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leaves_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      licenses: {
        Row: {
          created_at: string
          days: number
          employee_id: string
          end_date: string
          id: string
          notes: string | null
          reason: string
          start_date: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          days?: number
          employee_id: string
          end_date: string
          id?: string
          notes?: string | null
          reason?: string
          start_date: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          days?: number
          employee_id?: string
          end_date?: string
          id?: string
          notes?: string | null
          reason?: string
          start_date?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "licenses_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_periods: {
        Row: {
          base_days: number
          created_at: string
          employee_id: string
          id: string
          notes: string | null
          period_key: string
          updated_at: string
        }
        Insert: {
          base_days?: number
          created_at?: string
          employee_id: string
          id?: string
          notes?: string | null
          period_key: string
          updated_at?: string
        }
        Update: {
          base_days?: number
          created_at?: string
          employee_id?: string
          id?: string
          notes?: string | null
          period_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_periods_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_liquidaciones: {
        Row: {
          created_at: string
          created_by: string | null
          data: Json
          employee_id: string | null
          employee_name: string
          firma: string | null
          id: string
          logo_path: string | null
          signed_at: string | null
          token: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data: Json
          employee_id?: string | null
          employee_name: string
          firma?: string | null
          id?: string
          logo_path?: string | null
          signed_at?: string | null
          token?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data?: Json
          employee_id?: string | null
          employee_name?: string
          firma?: string | null
          id?: string
          logo_path?: string | null
          signed_at?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_liquidaciones_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      terminations: {
        Row: {
          created_at: string
          employee_id: string
          exit_date: string
          id: string
          notes: string | null
          reason: string | null
          settlement_paid: boolean
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          exit_date: string
          id?: string
          notes?: string | null
          reason?: string | null
          settlement_paid?: boolean
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          exit_date?: string
          id?: string
          notes?: string | null
          reason?: string | null
          settlement_paid?: boolean
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "terminations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vacation_entitlements: {
        Row: {
          created_at: string
          employee_id: string
          entitled_days: number
          id: string
          year: number
        }
        Insert: {
          created_at?: string
          employee_id: string
          entitled_days?: number
          id?: string
          year: number
        }
        Update: {
          created_at?: string
          employee_id?: string
          entitled_days?: number
          id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "vacation_entitlements_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      vacations: {
        Row: {
          created_at: string
          days: number
          destination: string | null
          employee_id: string
          end_date: string
          id: string
          notes: string | null
          start_date: string
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          days?: number
          destination?: string | null
          employee_id: string
          end_date: string
          id?: string
          notes?: string | null
          start_date: string
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          days?: number
          destination?: string | null
          employee_id?: string
          end_date?: string
          id?: string
          notes?: string | null
          start_date?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "vacations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_hr_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "rrhh"
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
      app_role: ["admin", "rrhh"],
    },
  },
} as const
