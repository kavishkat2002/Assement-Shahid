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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          entity: string
          entity_id: string | null
          id: number
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity: string
          entity_id?: string | null
          id?: never
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity?: string
          entity_id?: string | null
          id?: never
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          body: string
          cover_url: string | null
          created_at: string
          excerpt: string
          id: string
          is_published: boolean
          published_at: string
          slug: string
          title: string
          topic: string
        }
        Insert: {
          body: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string
          id?: string
          is_published?: boolean
          published_at?: string
          slug: string
          title: string
          topic?: string
        }
        Update: {
          body?: string
          cover_url?: string | null
          created_at?: string
          excerpt?: string
          id?: string
          is_published?: boolean
          published_at?: string
          slug?: string
          title?: string
          topic?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          cancellation_requested: boolean
          created_at: string
          customer_id: string
          customer_notes: string | null
          deposit_lkr: number
          id: string
          picked_up_at: string | null
          pickup_date: string
          pickup_location: string
          reference: string
          rental_amount_lkr: number
          rental_days: number
          return_date: string
          return_location: string
          returned_at: string | null
          staff_notes: string | null
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          cancellation_requested?: boolean
          created_at?: string
          customer_id: string
          customer_notes?: string | null
          deposit_lkr: number
          id?: string
          picked_up_at?: string | null
          pickup_date: string
          pickup_location: string
          reference?: string
          rental_amount_lkr: number
          rental_days: number
          return_date: string
          return_location: string
          returned_at?: string | null
          staff_notes?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          cancellation_requested?: boolean
          created_at?: string
          customer_id?: string
          customer_notes?: string | null
          deposit_lkr?: number
          id?: string
          picked_up_at?: string | null
          pickup_date?: string
          pickup_location?: string
          reference?: string
          rental_amount_lkr?: number
          rental_days?: number
          return_date?: string
          return_location?: string
          returned_at?: string | null
          staff_notes?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_policies: {
        Row: {
          additional_driver_fee_lkr: number
          cancellation_terms: string
          default_deposit_lkr: number
          deposit_terms: string
          free_cancellation_hours: number
          id: number
          late_return_fee_per_day_lkr: number
          max_rental_days: number
          min_rental_days: number
          updated_at: string
        }
        Insert: {
          additional_driver_fee_lkr?: number
          cancellation_terms?: string
          default_deposit_lkr?: number
          deposit_terms?: string
          free_cancellation_hours?: number
          id?: number
          late_return_fee_per_day_lkr?: number
          max_rental_days?: number
          min_rental_days?: number
          updated_at?: string
        }
        Update: {
          additional_driver_fee_lkr?: number
          cancellation_terms?: string
          default_deposit_lkr?: number
          deposit_terms?: string
          free_cancellation_hours?: number
          id?: number
          late_return_fee_per_day_lkr?: number
          max_rental_days?: number
          min_rental_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_lkr: number
          booking_id: string
          created_at: string
          currency: string
          id: string
          kind: string
          method: string
          provider_reference: string | null
          recorded_by: string | null
          status: Database["public"]["Enums"]["payment_status"]
        }
        Insert: {
          amount_lkr: number
          booking_id: string
          created_at?: string
          currency?: string
          id?: string
          kind: string
          method: string
          provider_reference?: string | null
          recorded_by?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Update: {
          amount_lkr?: number
          booking_id?: string
          created_at?: string
          currency?: string
          id?: string
          kind?: string
          method?: string
          provider_reference?: string | null
          recorded_by?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          created_at: string
          driving_licence: string | null
          full_name: string
          id: string
          nic_or_passport: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          driving_licence?: string | null
          full_name?: string
          id: string
          nic_or_passport?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          driving_licence?: string | null
          full_name?: string
          id?: string
          nic_or_passport?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rental_inquiries: {
        Row: {
          category: string
          created_at: string
          email: string
          id: string
          message: string
          name: string
          phone: string | null
          responded_at: string | null
          responded_by: string | null
          staff_response: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          category: string
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
          responded_at?: string | null
          responded_by?: string | null
          staff_response?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
          responded_at?: string | null
          responded_by?: string | null
          staff_response?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rental_inquiries_responded_by_fkey"
            columns: ["responded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_inquiries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          booking_id: string
          comment: string
          created_at: string
          customer_id: string
          display_name: string
          id: string
          is_published: boolean
          rating: number
        }
        Insert: {
          booking_id: string
          comment: string
          created_at?: string
          customer_id: string
          display_name: string
          id?: string
          is_published?: boolean
          rating: number
        }
        Update: {
          booking_id?: string
          comment?: string
          created_at?: string
          customer_id?: string
          display_name?: string
          id?: string
          is_published?: boolean
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicle_categories: {
        Row: {
          description: string
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          description?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          description?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      vehicle_condition_reports: {
        Row: {
          booking_id: string
          condition: string
          created_at: string
          damage_notes: string | null
          fuel_level: string
          id: string
          kind: string
          mileage_km: number
          recorded_by: string
        }
        Insert: {
          booking_id: string
          condition: string
          created_at?: string
          damage_notes?: string | null
          fuel_level: string
          id?: string
          kind: string
          mileage_km: number
          recorded_by: string
        }
        Update: {
          booking_id?: string
          condition?: string
          created_at?: string
          damage_notes?: string | null
          fuel_level?: string
          id?: string
          kind?: string
          mileage_km?: number
          recorded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_condition_reports_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_condition_reports_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_images: {
        Row: {
          alt: string
          created_at: string
          id: string
          sort_order: number
          storage_path: string | null
          url: string
          vehicle_id: string
        }
        Insert: {
          alt?: string
          created_at?: string
          id?: string
          sort_order?: number
          storage_path?: string | null
          url: string
          vehicle_id: string
        }
        Update: {
          alt?: string
          created_at?: string
          id?: string
          sort_order?: number
          storage_path?: string | null
          url?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_images_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          category_id: string
          created_at: string
          daily_rate_lkr: number
          deposit_lkr: number | null
          description: string
          features: string[]
          fuel_type: string
          id: string
          is_active: boolean
          is_demo: boolean
          location: string
          luggage: number
          make: string
          mileage_km: number
          model: string
          registration_no: string
          seats: number
          transmission: string
          updated_at: string
          weekly_rate_lkr: number | null
          year: number
        }
        Insert: {
          category_id: string
          created_at?: string
          daily_rate_lkr: number
          deposit_lkr?: number | null
          description?: string
          features?: string[]
          fuel_type: string
          id?: string
          is_active?: boolean
          is_demo?: boolean
          location?: string
          luggage?: number
          make: string
          mileage_km?: number
          model: string
          registration_no: string
          seats: number
          transmission: string
          updated_at?: string
          weekly_rate_lkr?: number | null
          year: number
        }
        Update: {
          category_id?: string
          created_at?: string
          daily_rate_lkr?: number
          deposit_lkr?: number | null
          description?: string
          features?: string[]
          fuel_type?: string
          id?: string
          is_active?: boolean
          is_demo?: boolean
          location?: string
          luggage?: number
          make?: string
          mileage_km?: number
          model?: string
          registration_no?: string
          seats?: number
          transmission?: string
          updated_at?: string
          weekly_rate_lkr?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "vehicle_categories"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_list_staff: {
        Args: never
        Returns: {
          email: string
          full_name: string
          roles: string[]
          user_id: string
        }[]
      }
      admin_set_role: {
        Args: {
          _email: string
          _grant: boolean
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: undefined
      }
      calc_rental: {
        Args: { _pickup: string; _return: string; _vehicle_id: string }
        Returns: {
          deposit_lkr: number
          rental_amount_lkr: number
          rental_days: number
        }[]
      }
      create_booking: {
        Args: {
          _notes: string
          _pickup: string
          _pickup_location: string
          _return: string
          _return_location: string
          _vehicle_id: string
        }
        Returns: Json
      }
      customer_cancel_booking: {
        Args: { _booking_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      is_vehicle_available: {
        Args: { _pickup: string; _return: string; _vehicle_id: string }
        Returns: boolean
      }
      log_audit: {
        Args: {
          _action: string
          _details: Json
          _entity: string
          _entity_id: string
        }
        Returns: undefined
      }
      quote_rental: {
        Args: { _pickup: string; _return: string; _vehicle_id: string }
        Returns: Json
      }
      record_handover: {
        Args: {
          _booking_id: string
          _condition: string
          _damage: string
          _fuel: string
          _kind: string
          _mileage: number
        }
        Returns: undefined
      }
      record_payment: {
        Args: {
          _amount: number
          _booking_id: string
          _kind: string
          _method: string
          _reference: string
        }
        Returns: undefined
      }
      set_booking_status: {
        Args: {
          _booking_id: string
          _note: string
          _status: Database["public"]["Enums"]["booking_status"]
        }
        Returns: undefined
      }
      unavailable_vehicle_ids: {
        Args: { _pickup: string; _return: string }
        Returns: string[]
      }
      vehicle_booked_ranges: {
        Args: { _vehicle_id: string }
        Returns: {
          pickup_date: string
          return_date: string
        }[]
      }
    }
    Enums: {
      app_role: "customer" | "staff" | "admin"
      booking_status:
        | "pending"
        | "confirmed"
        | "active"
        | "completed"
        | "cancelled"
        | "rejected"
      payment_status: "pending" | "succeeded" | "failed" | "refunded"
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
      app_role: ["customer", "staff", "admin"],
      booking_status: [
        "pending",
        "confirmed",
        "active",
        "completed",
        "cancelled",
        "rejected",
      ],
      payment_status: ["pending", "succeeded", "failed", "refunded"],
    },
  },
} as const
