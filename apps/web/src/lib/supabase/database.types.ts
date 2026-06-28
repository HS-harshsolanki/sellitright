export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      listings: {
        Row: {
          id: string
          seller_id: string
          title: string
          description: string
          price: number
          property_type: string
          bhk_type: string | null
          built_up_area: number | null
          carpet_area: number | null
          floor: number | null
          total_floors: number | null
          facing: string | null
          furnishing: string | null
          age_of_property: number | null
          bathrooms: number | null
          balconies: number | null
          parking: string | null
          address: string | null
          city: string
          locality: string
          state: string | null
          pincode: string | null
          latitude: number | null
          longitude: number | null
          amenities: string[]
          image_urls: string[]
          status: string
          is_verified: boolean
          rejection_reason: string | null
          view_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          seller_id: string
          title: string
          description: string
          price: number
          property_type: string
          bhk_type?: string | null
          built_up_area?: number | null
          carpet_area?: number | null
          floor?: number | null
          total_floors?: number | null
          facing?: string | null
          furnishing?: string | null
          age_of_property?: number | null
          bathrooms?: number | null
          balconies?: number | null
          parking?: string | null
          address?: string | null
          city: string
          locality: string
          state?: string | null
          pincode?: string | null
          latitude?: number | null
          longitude?: number | null
          amenities?: string[]
          image_urls?: string[]
          status?: string
          is_verified?: boolean
          rejection_reason?: string | null
          view_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          seller_id?: string
          title?: string
          description?: string
          price?: number
          property_type?: string
          bhk_type?: string | null
          built_up_area?: number | null
          carpet_area?: number | null
          floor?: number | null
          total_floors?: number | null
          facing?: string | null
          furnishing?: string | null
          age_of_property?: number | null
          bathrooms?: number | null
          balconies?: number | null
          parking?: string | null
          address?: string | null
          city?: string
          locality?: string
          state?: string | null
          pincode?: string | null
          latitude?: number | null
          longitude?: number | null
          amenities?: string[]
          image_urls?: string[]
          status?: string
          is_verified?: boolean
          rejection_reason?: string | null
          view_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      buyer_interest: {
        Row: {
          id: string
          listing_id: string
          buyer_id: string
          seller_id: string
          full_name: string
          purpose: string
          timeline: string
          funding: string
          message: string | null
          status: string
          contact_unlocked: boolean
          seller_phone: string | null
          seller_email: string | null
          buyer_phone: string | null
          buyer_email: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          listing_id: string
          buyer_id: string
          seller_id: string
          full_name: string
          purpose: string
          timeline: string
          funding: string
          message?: string | null
          status?: string
          contact_unlocked?: boolean
          seller_phone?: string | null
          seller_email?: string | null
          buyer_phone?: string | null
          buyer_email?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          listing_id?: string
          buyer_id?: string
          seller_id?: string
          full_name?: string
          purpose?: string
          timeline?: string
          funding?: string
          message?: string | null
          status?: string
          contact_unlocked?: boolean
          seller_phone?: string | null
          seller_email?: string | null
          buyer_phone?: string | null
          buyer_email?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          id: string
          buyer_id: string
          seller_id: string
          listing_id: string
          interest_id: string
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          status: string
          amount: number
          currency: string
          paid_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          buyer_id: string
          seller_id: string
          listing_id: string
          interest_id: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          status?: string
          amount?: number
          currency?: string
          paid_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          buyer_id?: string
          seller_id?: string
          listing_id?: string
          interest_id?: string
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          status?: string
          amount?: number
          currency?: string
          paid_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          type: string
          entity_type: string | null
          entity_id: string | null
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message: string
          type: string
          entity_type?: string | null
          entity_id?: string | null
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          message?: string
          type?: string
          entity_type?: string | null
          entity_id?: string | null
          read?: boolean
          created_at?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          id: string
          listing_id: string
          listing_title: string
          action: string
          previous_status: string | null
          new_status: string | null
          actor_id: string
          actor_role: string
          reason: string | null
          metadata: Json
          entity_type: string | null
          entity_id: string | null
          previous_value: Json | null
          new_value: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          listing_id: string
          listing_title: string
          action: string
          previous_status?: string | null
          new_status?: string | null
          actor_id: string
          actor_role?: string
          reason?: string | null
          metadata?: Json
          entity_type?: string | null
          entity_id?: string | null
          previous_value?: Json | null
          new_value?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          listing_id?: string
          listing_title?: string
          action?: string
          previous_status?: string | null
          new_status?: string | null
          actor_id?: string
          actor_role?: string
          reason?: string | null
          metadata?: Json
          entity_type?: string | null
          entity_id?: string | null
          previous_value?: Json | null
          new_value?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      admin_roles: {
        Row: {
          id: string
          user_id: string
          role: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: string
          created_at?: string
        }
        Relationships: []
      }
      activity_logs: {
        Row: {
          id: string
          user_id: string
          action: string
          entity_type: string | null
          entity_id: string | null
          ip_address: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          action: string
          entity_type?: string | null
          entity_id?: string | null
          ip_address?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          action?: string
          entity_type?: string | null
          entity_id?: string | null
          ip_address?: string | null
          metadata?: Json
          created_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          id: string
          reporter_id: string
          reporter_role: string
          target_user_id: string | null
          target_listing_id: string | null
          reason: string
          details: string | null
          status: string
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          reporter_id: string
          reporter_role: string
          target_user_id?: string | null
          target_listing_id?: string | null
          reason: string
          details?: string | null
          status?: string
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          reporter_id?: string
          reporter_role?: string
          target_user_id?: string | null
          target_listing_id?: string | null
          reason?: string
          details?: string | null
          status?: string
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      blocked_users: {
        Row: {
          id: string
          blocker_id: string
          blockee_id: string
          reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          blocker_id: string
          blockee_id: string
          reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          blocker_id?: string
          blockee_id?: string
          reason?: string | null
          created_at?: string
        }
        Relationships: []
      }
      risk_scores: {
        Row: {
          user_id: string
          score: number
          level: string
          signals: Json
          last_computed_at: string
          created_at: string
        }
        Insert: {
          user_id: string
          score?: number
          level?: string
          signals?: Json
          last_computed_at?: string
          created_at?: string
        }
        Update: {
          user_id?: string
          score?: number
          level?: string
          signals?: Json
          last_computed_at?: string
          created_at?: string
        }
        Relationships: []
      }
      user_flags: {
        Row: {
          id: string
          user_id: string
          flag: string
          reason: string | null
          flagged_by: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          flag: string
          reason?: string | null
          flagged_by?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          flag?: string
          reason?: string | null
          flagged_by?: string
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      latest_user_flag: {
        Row: {
          user_id: string
          flag: string
          reason: string | null
          flagged_by: string
          created_at: string
        }
        Relationships: []
      }
      daily_interest_counts: {
        Row: {
          user_id: string
          count: number
          date: string
        }
        Relationships: []
      }
      pending_per_listing: {
        Row: {
          listing_id: string
          pending_count: number
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]?: never
    }
    Enums: {
      [_ in never]?: never
    }
  }
}
