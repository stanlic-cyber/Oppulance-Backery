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
      admin_audit_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      ai_conversations: {
        Row: {
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_pending_actions: {
        Row: {
          action_type: string
          conversation_id: string | null
          created_at: string
          executed_at: string | null
          expires_at: string
          id: string
          payload: Json
          result: Json | null
          status: string
          user_id: string
        }
        Insert: {
          action_type: string
          conversation_id?: string | null
          created_at?: string
          executed_at?: string | null
          expires_at?: string
          id?: string
          payload?: Json
          result?: Json | null
          status?: string
          user_id: string
        }
        Update: {
          action_type?: string
          conversation_id?: string | null
          created_at?: string
          executed_at?: string | null
          expires_at?: string
          id?: string
          payload?: Json
          result?: Json | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_user_memory: {
        Row: {
          category: string | null
          created_at: string
          fact: string
          id: string
          importance: number
          last_used_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          fact: string
          id?: string
          importance?: number
          last_used_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          fact?: string
          id?: string
          importance?: number
          last_used_at?: string
          user_id?: string
        }
        Relationships: []
      }
      delivery_bids: {
        Row: {
          bid_price: number
          created_at: string
          driver_id: string
          eta_text: string | null
          id: string
          note: string | null
          request_id: string
          status: string
        }
        Insert: {
          bid_price: number
          created_at?: string
          driver_id: string
          eta_text?: string | null
          id?: string
          note?: string | null
          request_id: string
          status?: string
        }
        Update: {
          bid_price?: number
          created_at?: string
          driver_id?: string
          eta_text?: string | null
          id?: string
          note?: string | null
          request_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_bids_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "delivery_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_ratings: {
        Row: {
          comment: string | null
          created_at: string
          delivery_request_id: string
          driver_id: string
          id: string
          rater_id: string
          rating: number
        }
        Insert: {
          comment?: string | null
          created_at?: string
          delivery_request_id: string
          driver_id: string
          id?: string
          rater_id: string
          rating: number
        }
        Update: {
          comment?: string | null
          created_at?: string
          delivery_request_id?: string
          driver_id?: string
          id?: string
          rater_id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "delivery_ratings_delivery_request_id_fkey"
            columns: ["delivery_request_id"]
            isOneToOne: false
            referencedRelation: "delivery_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_requests: {
        Row: {
          agreed_price: number | null
          assigned_driver_id: string | null
          buyer_id: string
          cargo_quantity: string
          cargo_type: string
          cargo_weight: string | null
          created_at: string
          dropoff_province: string
          dropoff_town: string | null
          id: string
          order_id: string
          packaging_notes: string | null
          pickup_province: string
          pickup_town: string | null
          platform_fee_paid: boolean
          preferred_pickup_time: string | null
          seller_id: string
          special_instructions: string | null
          status: Database["public"]["Enums"]["delivery_status"]
          updated_at: string
        }
        Insert: {
          agreed_price?: number | null
          assigned_driver_id?: string | null
          buyer_id: string
          cargo_quantity: string
          cargo_type: string
          cargo_weight?: string | null
          created_at?: string
          dropoff_province: string
          dropoff_town?: string | null
          id?: string
          order_id: string
          packaging_notes?: string | null
          pickup_province: string
          pickup_town?: string | null
          platform_fee_paid?: boolean
          preferred_pickup_time?: string | null
          seller_id: string
          special_instructions?: string | null
          status?: Database["public"]["Enums"]["delivery_status"]
          updated_at?: string
        }
        Update: {
          agreed_price?: number | null
          assigned_driver_id?: string | null
          buyer_id?: string
          cargo_quantity?: string
          cargo_type?: string
          cargo_weight?: string | null
          created_at?: string
          dropoff_province?: string
          dropoff_town?: string | null
          id?: string
          order_id?: string
          packaging_notes?: string | null
          pickup_province?: string
          pickup_town?: string | null
          platform_fee_paid?: boolean
          preferred_pickup_time?: string | null
          seller_id?: string
          special_instructions?: string | null
          status?: Database["public"]["Enums"]["delivery_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_documents: {
        Row: {
          created_at: string
          doc_type: string
          driver_id: string
          expires_at: string | null
          file_url: string
          id: string
          notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          doc_type: string
          driver_id: string
          expires_at?: string | null
          file_url: string
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          doc_type?: string
          driver_id?: string
          expires_at?: string | null
          file_url?: string
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      driver_hire_requests: {
        Row: {
          buyer_id: string
          buyer_offer_amount: number | null
          created_at: string
          currency: string | null
          delivery_date: string
          delivery_time: string | null
          driver_counter_amount: number | null
          driver_id: string
          dropoff_location: string
          final_agreed_amount: number | null
          id: string
          negotiation_status: string | null
          notes: string | null
          pickup_location: string
          status: string
          updated_at: string
        }
        Insert: {
          buyer_id: string
          buyer_offer_amount?: number | null
          created_at?: string
          currency?: string | null
          delivery_date: string
          delivery_time?: string | null
          driver_counter_amount?: number | null
          driver_id: string
          dropoff_location: string
          final_agreed_amount?: number | null
          id?: string
          negotiation_status?: string | null
          notes?: string | null
          pickup_location: string
          status?: string
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          buyer_offer_amount?: number | null
          created_at?: string
          currency?: string | null
          delivery_date?: string
          delivery_time?: string | null
          driver_counter_amount?: number | null
          driver_id?: string
          dropoff_location?: string
          final_agreed_amount?: number | null
          id?: string
          negotiation_status?: string | null
          notes?: string | null
          pickup_location?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      driver_locations: {
        Row: {
          driver_id: string
          heading: number | null
          id: string
          is_available: boolean
          latitude: number
          longitude: number
          speed: number | null
          updated_at: string
        }
        Insert: {
          driver_id: string
          heading?: number | null
          id?: string
          is_available?: boolean
          latitude: number
          longitude: number
          speed?: number | null
          updated_at?: string
        }
        Update: {
          driver_id?: string
          heading?: number | null
          id?: string
          is_available?: boolean
          latitude?: number
          longitude?: number
          speed?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      driver_profiles: {
        Row: {
          average_rating: number | null
          created_at: string
          current_status: string
          id: string
          is_available: boolean
          is_online: boolean
          kyc_status: Database["public"]["Enums"]["kyc_status"]
          last_seen: string | null
          name: string
          nearest_town: string | null
          phone: string | null
          province: string
          rating_count: number
          total_deliveries: number
          total_earnings_usd: number
          updated_at: string
          user_id: string
          vehicle_desc: string | null
          vehicle_type: string
        }
        Insert: {
          average_rating?: number | null
          created_at?: string
          current_status?: string
          id?: string
          is_available?: boolean
          is_online?: boolean
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          last_seen?: string | null
          name: string
          nearest_town?: string | null
          phone?: string | null
          province: string
          rating_count?: number
          total_deliveries?: number
          total_earnings_usd?: number
          updated_at?: string
          user_id: string
          vehicle_desc?: string | null
          vehicle_type: string
        }
        Update: {
          average_rating?: number | null
          created_at?: string
          current_status?: string
          id?: string
          is_available?: boolean
          is_online?: boolean
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          last_seen?: string | null
          name?: string
          nearest_town?: string | null
          phone?: string | null
          province?: string
          rating_count?: number
          total_deliveries?: number
          total_earnings_usd?: number
          updated_at?: string
          user_id?: string
          vehicle_desc?: string | null
          vehicle_type?: string
        }
        Relationships: []
      }
      driver_request_messages: {
        Row: {
          created_at: string
          driver_request_id: string
          id: string
          message_text: string
          sender_id: string
          sender_role: string
        }
        Insert: {
          created_at?: string
          driver_request_id: string
          id?: string
          message_text: string
          sender_id: string
          sender_role: string
        }
        Update: {
          created_at?: string
          driver_request_id?: string
          id?: string
          message_text?: string
          sender_id?: string
          sender_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_request_messages_driver_request_id_fkey"
            columns: ["driver_request_id"]
            isOneToOne: false
            referencedRelation: "driver_hire_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_wallets: {
        Row: {
          balance_usd: number
          driver_id: string
          id: string
          updated_at: string
        }
        Insert: {
          balance_usd?: number
          driver_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          balance_usd?: number
          driver_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      escrow_disputes: {
        Row: {
          admin_notes: string | null
          created_at: string
          details: string | null
          escalated_at: string | null
          escalation_level: number
          escrow_hold_id: string
          evidence_urls: string[] | null
          id: string
          raised_by: string
          reason: string
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["dispute_status"]
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          details?: string | null
          escalated_at?: string | null
          escalation_level?: number
          escrow_hold_id: string
          evidence_urls?: string[] | null
          id?: string
          raised_by: string
          reason: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["dispute_status"]
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          details?: string | null
          escalated_at?: string | null
          escalation_level?: number
          escrow_hold_id?: string
          evidence_urls?: string[] | null
          id?: string
          raised_by?: string
          reason?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["dispute_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "escrow_disputes_escrow_hold_id_fkey"
            columns: ["escrow_hold_id"]
            isOneToOne: false
            referencedRelation: "escrow_holds"
            referencedColumns: ["id"]
          },
        ]
      }
      escrow_holds: {
        Row: {
          amount_usd: number
          buyer_id: string
          created_at: string
          id: string
          locked_at: string
          order_id: string
          refund_ledger_id: string | null
          refunded_at: string | null
          release_ledger_id: string | null
          released_at: string | null
          seller_id: string
          status: Database["public"]["Enums"]["escrow_status"]
          updated_at: string
        }
        Insert: {
          amount_usd: number
          buyer_id: string
          created_at?: string
          id?: string
          locked_at?: string
          order_id: string
          refund_ledger_id?: string | null
          refunded_at?: string | null
          release_ledger_id?: string | null
          released_at?: string | null
          seller_id: string
          status?: Database["public"]["Enums"]["escrow_status"]
          updated_at?: string
        }
        Update: {
          amount_usd?: number
          buyer_id?: string
          created_at?: string
          id?: string
          locked_at?: string
          order_id?: string
          refund_ledger_id?: string | null
          refunded_at?: string | null
          release_ledger_id?: string | null
          released_at?: string | null
          seller_id?: string
          status?: Database["public"]["Enums"]["escrow_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "escrow_holds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_transactions: {
        Row: {
          amount: number
          created_at: string
          delivery_request_id: string | null
          description: string | null
          fee_percent: number
          id: string
          order_id: string | null
          user_id: string
          user_type: string
        }
        Insert: {
          amount: number
          created_at?: string
          delivery_request_id?: string | null
          description?: string | null
          fee_percent: number
          id?: string
          order_id?: string | null
          user_id: string
          user_type: string
        }
        Update: {
          amount?: number
          created_at?: string
          delivery_request_id?: string | null
          description?: string | null
          fee_percent?: number
          id?: string
          order_id?: string | null
          user_id?: string
          user_type?: string
        }
        Relationships: []
      }
      kyc_submissions: {
        Row: {
          created_at: string
          id: string
          id_number: string | null
          id_photo_url: string | null
          licence_url: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          selfie_url: string | null
          status: Database["public"]["Enums"]["kyc_status"]
          submission_type: string
          updated_at: string
          user_id: string
          vehicle_plate: string | null
          vehicle_reg_url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          id_number?: string | null
          id_photo_url?: string | null
          licence_url?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url?: string | null
          status?: Database["public"]["Enums"]["kyc_status"]
          submission_type: string
          updated_at?: string
          user_id: string
          vehicle_plate?: string | null
          vehicle_reg_url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          id_number?: string | null
          id_photo_url?: string | null
          licence_url?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_url?: string | null
          status?: Database["public"]["Enums"]["kyc_status"]
          submission_type?: string
          updated_at?: string
          user_id?: string
          vehicle_plate?: string | null
          vehicle_reg_url?: string | null
        }
        Relationships: []
      }
      listing_moderation: {
        Row: {
          confidence: number | null
          created_at: string
          flags: Json
          id: string
          listing_id: string
          notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          flags?: Json
          id?: string
          listing_id: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          flags?: Json
          id?: string
          listing_id?: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      listings: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          farmer_id: string
          id: string
          nearest_town: string | null
          negotiable: boolean | null
          photos: string[] | null
          price_per_unit: number
          province: string
          quantity: number
          status: Database["public"]["Enums"]["listing_status"] | null
          title: string
          unit: string
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          farmer_id: string
          id?: string
          nearest_town?: string | null
          negotiable?: boolean | null
          photos?: string[] | null
          price_per_unit: number
          province: string
          quantity: number
          status?: Database["public"]["Enums"]["listing_status"] | null
          title: string
          unit: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          farmer_id?: string
          id?: string
          nearest_town?: string | null
          negotiable?: boolean | null
          photos?: string[] | null
          price_per_unit?: number
          province?: string
          quantity?: number
          status?: Database["public"]["Enums"]["listing_status"] | null
          title?: string
          unit?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      lovable_proof: {
        Row: {
          created_at: string | null
          id: string
          source: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          source: string
        }
        Update: {
          created_at?: string | null
          id?: string
          source?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          created_at: string | null
          id: string
          meta: Json | null
          order_id: string
          read_at: string | null
          sender_id: string
          text: string | null
          type: Database["public"]["Enums"]["message_type"]
        }
        Insert: {
          created_at?: string | null
          id?: string
          meta?: Json | null
          order_id: string
          read_at?: string | null
          sender_id: string
          text?: string | null
          type: Database["public"]["Enums"]["message_type"]
        }
        Update: {
          created_at?: string | null
          id?: string
          meta?: Json | null
          order_id?: string
          read_at?: string | null
          sender_id?: string
          text?: string | null
          type?: Database["public"]["Enums"]["message_type"]
        }
        Relationships: [
          {
            foreignKeyName: "messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message: string
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          buyer_id: string
          cancelled_at: string | null
          completed_at: string | null
          confirmed_at: string | null
          created_at: string | null
          id: string
          listing_id: string
          offered_price: number
          platform_fee_amount: number
          platform_fee_percent: number
          quantity: number
          status: Database["public"]["Enums"]["order_status"] | null
          subtotal: number | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          buyer_id: string
          cancelled_at?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          id?: string
          listing_id: string
          offered_price: number
          platform_fee_amount?: number
          platform_fee_percent?: number
          quantity: number
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal?: number | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          buyer_id?: string
          cancelled_at?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          id?: string
          listing_id?: string
          offered_price?: number
          platform_fee_amount?: number
          platform_fee_percent?: number
          quantity?: number
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal?: number | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_otps: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          phone: string
          user_id: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          phone: string
          user_id: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_payment_settings: {
        Row: {
          bank_account_name: string | null
          bank_account_number: string | null
          bank_branch: string | null
          bank_name: string | null
          currency: string
          driver_fee_percent: number
          ecocash_name: string | null
          ecocash_number: string | null
          id: string
          seller_fee_percent: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          currency?: string
          driver_fee_percent?: number
          ecocash_name?: string | null
          ecocash_number?: string | null
          id?: string
          seller_fee_percent?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          currency?: string
          driver_fee_percent?: number
          ecocash_name?: string | null
          ecocash_number?: string | null
          id?: string
          seller_fee_percent?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          farm_name: string | null
          id: string
          kyc_status: Database["public"]["Enums"]["kyc_status"]
          name: string
          nearest_town: string | null
          phone: string | null
          phone_verified_at: string | null
          preferred_language: string | null
          province: string | null
          suspended: boolean | null
          suspended_at: string | null
          suspended_reason: string | null
          updated_at: string | null
          verified: boolean | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          farm_name?: string | null
          id: string
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          name: string
          nearest_town?: string | null
          phone?: string | null
          phone_verified_at?: string | null
          preferred_language?: string | null
          province?: string | null
          suspended?: boolean | null
          suspended_at?: string | null
          suspended_reason?: string | null
          updated_at?: string | null
          verified?: boolean | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          farm_name?: string | null
          id?: string
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          name?: string
          nearest_town?: string | null
          phone?: string | null
          phone_verified_at?: string | null
          preferred_language?: string | null
          province?: string | null
          suspended?: boolean | null
          suspended_at?: string | null
          suspended_reason?: string | null
          updated_at?: string | null
          verified?: boolean | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_used_at: string | null
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_used_at?: string | null
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_used_at?: string | null
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          action: string
          created_at: string
          id: string
          identifier: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          identifier: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          identifier?: string
        }
        Relationships: []
      }
      recently_viewed_listings: {
        Row: {
          listing_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          listing_id: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          listing_id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: []
      }
      reported_listings: {
        Row: {
          created_at: string
          details: string | null
          id: string
          listing_id: string
          reason: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          listing_id: string
          reason: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          listing_id?: string
          reason?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reported_listings_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          category: string
          contact: string
          created_at: string | null
          id: string
          message: string
          name: string
          status: Database["public"]["Enums"]["ticket_status"] | null
          user_id: string | null
        }
        Insert: {
          category: string
          contact: string
          created_at?: string | null
          id?: string
          message: string
          name: string
          status?: Database["public"]["Enums"]["ticket_status"] | null
          user_id?: string | null
        }
        Update: {
          category?: string
          contact?: string
          created_at?: string | null
          id?: string
          message?: string
          name?: string
          status?: Database["public"]["Enums"]["ticket_status"] | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_fee_balances: {
        Row: {
          billing_start_date: string
          created_at: string
          current_balance: number
          id: string
          otp_code: string | null
          otp_expires_at: string | null
          payment_proof_url: string | null
          payment_reference: string | null
          proof_submitted_at: string | null
          status: Database["public"]["Enums"]["fee_status"]
          updated_at: string
          user_id: string
          user_type: string
          verification_notes: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          billing_start_date?: string
          created_at?: string
          current_balance?: number
          id?: string
          otp_code?: string | null
          otp_expires_at?: string | null
          payment_proof_url?: string | null
          payment_reference?: string | null
          proof_submitted_at?: string | null
          status?: Database["public"]["Enums"]["fee_status"]
          updated_at?: string
          user_id: string
          user_type: string
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          billing_start_date?: string
          created_at?: string
          current_balance?: number
          id?: string
          otp_code?: string | null
          otp_expires_at?: string | null
          payment_proof_url?: string | null
          payment_reference?: string | null
          proof_submitted_at?: string | null
          status?: Database["public"]["Enums"]["fee_status"]
          updated_at?: string
          user_id?: string
          user_type?: string
          verification_notes?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_wallets: {
        Row: {
          balance_usd: number
          created_at: string
          frozen: boolean
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_usd?: number
          created_at?: string
          frozen?: boolean
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_usd?: number
          created_at?: string
          frozen?: boolean
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wallet_ledger: {
        Row: {
          amount_usd: number
          balance_after: number
          created_at: string
          created_by: string | null
          description: string | null
          entry_type: Database["public"]["Enums"]["wallet_ledger_type"]
          id: string
          reference_id: string | null
          reference_type: string | null
          user_id: string
          wallet_id: string
        }
        Insert: {
          amount_usd: number
          balance_after: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          entry_type: Database["public"]["Enums"]["wallet_ledger_type"]
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          user_id: string
          wallet_id: string
        }
        Update: {
          amount_usd?: number
          balance_after?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          entry_type?: Database["public"]["Enums"]["wallet_ledger_type"]
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_ledger_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_topup_requests: {
        Row: {
          admin_notes: string | null
          amount_usd: number
          created_at: string
          id: string
          method: Database["public"]["Enums"]["topup_method"]
          payment_reference: string
          proof_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["topup_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount_usd: number
          created_at?: string
          id?: string
          method: Database["public"]["Enums"]["topup_method"]
          payment_reference: string
          proof_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["topup_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount_usd?: number
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["topup_method"]
          payment_reference?: string
          proof_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["topup_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          admin_id: string | null
          amount_usd: number
          created_at: string
          driver_id: string
          id: string
          proof_url: string | null
          reason: string
          related_delivery_id: string | null
          type: Database["public"]["Enums"]["wallet_transaction_type"]
        }
        Insert: {
          admin_id?: string | null
          amount_usd: number
          created_at?: string
          driver_id: string
          id?: string
          proof_url?: string | null
          reason: string
          related_delivery_id?: string | null
          type: Database["public"]["Enums"]["wallet_transaction_type"]
        }
        Update: {
          admin_id?: string | null
          amount_usd?: number
          created_at?: string
          driver_id?: string
          id?: string
          proof_url?: string | null
          reason?: string
          related_delivery_id?: string | null
          type?: Database["public"]["Enums"]["wallet_transaction_type"]
        }
        Relationships: []
      }
      wallet_withdrawal_requests: {
        Row: {
          admin_notes: string | null
          amount_usd: number
          bank_account_name: string | null
          bank_account_number: string | null
          bank_branch: string | null
          bank_name: string | null
          created_at: string
          ecocash_name: string | null
          ecocash_number: string | null
          hold_ledger_id: string | null
          id: string
          method: Database["public"]["Enums"]["withdrawal_method"]
          paid_at: string | null
          paid_ledger_id: string | null
          reversed_ledger_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["withdrawal_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount_usd: number
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          created_at?: string
          ecocash_name?: string | null
          ecocash_number?: string | null
          hold_ledger_id?: string | null
          id?: string
          method: Database["public"]["Enums"]["withdrawal_method"]
          paid_at?: string | null
          paid_ledger_id?: string | null
          reversed_ledger_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount_usd?: number
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          created_at?: string
          ecocash_name?: string | null
          ecocash_number?: string | null
          hold_ledger_id?: string | null
          id?: string
          method?: Database["public"]["Enums"]["withdrawal_method"]
          paid_at?: string | null
          paid_ledger_id?: string | null
          reversed_ledger_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      driver_profiles_public: {
        Row: {
          average_rating: number | null
          created_at: string | null
          current_status: string | null
          id: string | null
          is_available: boolean | null
          is_online: boolean | null
          last_seen: string | null
          name: string | null
          province: string | null
          rating_count: number | null
          total_deliveries: number | null
          user_id: string | null
          vehicle_desc: string | null
          vehicle_type: string | null
        }
        Insert: {
          average_rating?: number | null
          created_at?: string | null
          current_status?: string | null
          id?: string | null
          is_available?: boolean | null
          is_online?: boolean | null
          last_seen?: string | null
          name?: string | null
          province?: string | null
          rating_count?: number | null
          total_deliveries?: number | null
          user_id?: string | null
          vehicle_desc?: string | null
          vehicle_type?: string | null
        }
        Update: {
          average_rating?: number | null
          created_at?: string | null
          current_status?: string | null
          id?: string | null
          is_available?: boolean | null
          is_online?: boolean | null
          last_seen?: string | null
          name?: string | null
          province?: string | null
          rating_count?: number | null
          total_deliveries?: number | null
          user_id?: string | null
          vehicle_desc?: string | null
          vehicle_type?: string | null
        }
        Relationships: []
      }
      platform_fee_rates: {
        Row: {
          currency: string | null
          driver_fee_percent: number | null
          seller_fee_percent: number | null
        }
        Relationships: []
      }
      profiles_public: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          farm_name: string | null
          id: string | null
          name: string | null
          nearest_town: string | null
          preferred_language: string | null
          province: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          farm_name?: string | null
          id?: string | null
          name?: string | null
          nearest_town?: string | null
          preferred_language?: string | null
          province?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          farm_name?: string | null
          id?: string | null
          name?: string | null
          nearest_town?: string | null
          preferred_language?: string | null
          province?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_platform_fee: {
        Args: {
          p_amount: number
          p_delivery_request_id?: string
          p_description?: string
          p_fee_percent: number
          p_order_id?: string
          p_user_id: string
          p_user_type: string
        }
        Returns: undefined
      }
      approve_topup: {
        Args: { p_admin_notes?: string; p_topup_id: string }
        Returns: boolean
      }
      auto_release_escrow: { Args: never; Returns: number }
      cancel_withdrawal: { Args: { p_id: string }; Returns: boolean }
      check_and_lock_overdue_fees: { Args: never; Returns: undefined }
      check_rate_limit: {
        Args: {
          p_action: string
          p_identifier: string
          p_max_attempts: number
          p_window_seconds: number
        }
        Returns: boolean
      }
      cleanup_rate_limits: { Args: never; Returns: undefined }
      credit_driver_wallet: {
        Args: {
          p_admin_id: string
          p_amount: number
          p_driver_id: string
          p_reason?: string
        }
        Returns: boolean
      }
      deduct_platform_fee: {
        Args: { p_amount?: number; p_delivery_id: string; p_driver_id: string }
        Returns: boolean
      }
      ensure_wallet: { Args: { p_user_id: string }; Returns: string }
      escalate_overdue_disputes: { Args: never; Returns: number }
      escrow_lock: { Args: { p_order_id: string }; Returns: string }
      escrow_refund: {
        Args: { p_order_id: string; p_reason?: string }
        Returns: boolean
      }
      escrow_release: { Args: { p_order_id: string }; Returns: boolean }
      expire_stale_orders: { Args: never; Returns: number }
      get_payment_details_for_locked_user: {
        Args: never
        Returns: {
          bank_account_name: string
          bank_account_number: string
          bank_branch: string
          bank_name: string
          currency: string
          ecocash_name: string
          ecocash_number: string
        }[]
      }
      get_platform_health: { Args: never; Returns: Json }
      get_unread_message_count: {
        Args: { p_order_id: string; p_user_id: string }
        Returns: number
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_verification_status: {
        Args: { p_user_id: string }
        Returns: {
          driver_kyc_status: Database["public"]["Enums"]["kyc_status"]
          kyc_status: Database["public"]["Enums"]["kyc_status"]
          phone_verified: boolean
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_user_locked: {
        Args: { p_user_id: string; p_user_type: string }
        Returns: boolean
      }
      mark_messages_read: {
        Args: { p_order_id: string; p_user_id: string }
        Returns: undefined
      }
      mark_withdrawal_paid: {
        Args: { p_admin_notes?: string; p_id: string }
        Returns: boolean
      }
      raise_dispute: {
        Args: {
          p_details?: string
          p_evidence_urls?: string[]
          p_order_id: string
          p_reason: string
        }
        Returns: string
      }
      reject_topup: {
        Args: { p_admin_notes: string; p_topup_id: string }
        Returns: boolean
      }
      reject_withdrawal: {
        Args: { p_admin_notes: string; p_id: string }
        Returns: boolean
      }
      request_withdrawal: {
        Args: {
          p_amount: number
          p_bank_account_name?: string
          p_bank_account_number?: string
          p_bank_branch?: string
          p_bank_name?: string
          p_ecocash_name?: string
          p_ecocash_number?: string
          p_method: Database["public"]["Enums"]["withdrawal_method"]
        }
        Returns: string
      }
      resolve_dispute: {
        Args: {
          p_admin_notes?: string
          p_dispute_id: string
          p_outcome: string
        }
        Returns: boolean
      }
      submit_fee_payment_proof: {
        Args: { p_proof_url: string; p_reference: string }
        Returns: boolean
      }
      verify_fee_otp: { Args: { p_otp: string }; Returns: Json }
      wallet_credit: {
        Args: {
          p_amount: number
          p_created_by: string
          p_description: string
          p_entry_type: Database["public"]["Enums"]["wallet_ledger_type"]
          p_reference_id: string
          p_reference_type: string
          p_user_id: string
        }
        Returns: string
      }
      wallet_debit: {
        Args: {
          p_amount: number
          p_created_by: string
          p_description: string
          p_entry_type: Database["public"]["Enums"]["wallet_ledger_type"]
          p_reference_id: string
          p_reference_type: string
          p_user_id: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "farmer" | "buyer" | "admin" | "driver"
      delivery_status:
        | "open"
        | "assigned"
        | "pickup_confirmed"
        | "in_transit"
        | "delivered"
        | "completed"
        | "cancelled"
        | "failed"
      dispute_status:
        | "open"
        | "resolved_release"
        | "resolved_refund"
        | "cancelled"
      escrow_status: "held" | "released" | "refunded" | "disputed"
      fee_status: "active" | "locked" | "awaiting_verification" | "otp_issued"
      kyc_status: "not_submitted" | "pending" | "approved" | "rejected"
      listing_status: "draft" | "active" | "sold" | "archived"
      message_type: "offer" | "counter_offer" | "accept" | "reject" | "message"
      order_status:
        | "pending"
        | "accepted"
        | "rejected"
        | "negotiating"
        | "confirmed"
        | "completed"
        | "cancelled"
        | "ready_for_delivery"
      ticket_status: "open" | "in_progress" | "resolved" | "closed"
      topup_method: "ecocash" | "onemoney" | "bank"
      topup_status: "pending" | "approved" | "rejected"
      wallet_ledger_type:
        | "topup"
        | "escrow_lock"
        | "escrow_release"
        | "escrow_refund"
        | "fee_deduction"
        | "adjustment"
        | "withdrawal_hold"
        | "withdrawal_paid"
        | "withdrawal_reversed"
      wallet_transaction_type: "topup" | "deduction"
      withdrawal_method: "ecocash" | "bank"
      withdrawal_status:
        | "pending"
        | "approved"
        | "rejected"
        | "paid"
        | "cancelled"
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
      app_role: ["farmer", "buyer", "admin", "driver"],
      delivery_status: [
        "open",
        "assigned",
        "pickup_confirmed",
        "in_transit",
        "delivered",
        "completed",
        "cancelled",
        "failed",
      ],
      dispute_status: [
        "open",
        "resolved_release",
        "resolved_refund",
        "cancelled",
      ],
      escrow_status: ["held", "released", "refunded", "disputed"],
      fee_status: ["active", "locked", "awaiting_verification", "otp_issued"],
      kyc_status: ["not_submitted", "pending", "approved", "rejected"],
      listing_status: ["draft", "active", "sold", "archived"],
      message_type: ["offer", "counter_offer", "accept", "reject", "message"],
      order_status: [
        "pending",
        "accepted",
        "rejected",
        "negotiating",
        "confirmed",
        "completed",
        "cancelled",
        "ready_for_delivery",
      ],
      ticket_status: ["open", "in_progress", "resolved", "closed"],
      topup_method: ["ecocash", "onemoney", "bank"],
      topup_status: ["pending", "approved", "rejected"],
      wallet_ledger_type: [
        "topup",
        "escrow_lock",
        "escrow_release",
        "escrow_refund",
        "fee_deduction",
        "adjustment",
        "withdrawal_hold",
        "withdrawal_paid",
        "withdrawal_reversed",
      ],
      wallet_transaction_type: ["topup", "deduction"],
      withdrawal_method: ["ecocash", "bank"],
      withdrawal_status: [
        "pending",
        "approved",
        "rejected",
        "paid",
        "cancelled",
      ],
    },
  },
} as const
