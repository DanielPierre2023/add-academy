/**
 * Supabase Database Types for ADD Academy
 *
 * Maps to existing tables: academy_students, academy_schools,
 * academy_subscriptions, academy_courses.
 *
 * NOTE: The `profiles` table belongs to the main website
 * (add-individual-solutions.com) — Academy uses academy_students instead.
 */

export interface Database {
  public: {
    Tables: {
      academy_students: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          display_name: string | null;
          avatar_url: string | null;
          preferred_language: string | null;
          theme: string | null;
          tier: string;
          school_id: string | null;
          org_role: string | null;
          stripe_customer_id: string | null;
          enrolled_at: string;
          last_active_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          preferred_language?: string | null;
          theme?: string | null;
          tier?: string;
          school_id?: string | null;
          org_role?: string | null;
          stripe_customer_id?: string | null;
        };
        Update: Partial<Database['public']['Tables']['academy_students']['Insert']>;
      };
      academy_schools: {
        Row: {
          id: string;
          name: string;
          slug: string;
          country: string;
          city: string | null;
          contact_email: string;
          contact_name: string;
          contact_user_id: string | null;
          domain: string | null;
          invite_code: string | null;
          logo_url: string | null;
          verified: boolean;
          max_students: number;
          current_students: number;
          ai_tutor_daily_limit: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          slug: string;
          country: string;
          contact_email: string;
          contact_name: string;
          city?: string | null;
          contact_user_id?: string | null;
          domain?: string | null;
          invite_code?: string | null;
          logo_url?: string | null;
          verified?: boolean;
          max_students?: number;
          current_students?: number;
          ai_tutor_daily_limit?: number;
        };
        Update: Partial<Database['public']['Tables']['academy_schools']['Insert']>;
      };
      academy_subscriptions: {
        Row: {
          id: string;
          student_id: string;
          stripe_subscription_id: string | null;
          tier: string;
          status: string;
          current_period_start: string | null;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          unlocked_stages: number[];
          unlocked_products: string[];
          discount_percent: number;
          auto_renew: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          student_id: string;
          tier: string;
          stripe_subscription_id?: string | null;
          status?: string;
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          unlocked_stages?: number[];
          unlocked_products?: string[];
          discount_percent?: number;
          auto_renew?: boolean;
        };
        Update: Partial<Database['public']['Tables']['academy_subscriptions']['Insert']>;
      };
      academy_courses: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string;
          icon: string | null;
          category: 'llm' | 'genai_saas' | 'agentic_ai' | 'advanced_models' | 'mlops';
          is_active: boolean;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          slug: string;
          name: string;
          description?: string;
          icon?: string | null;
          category: 'llm' | 'genai_saas' | 'agentic_ai' | 'advanced_models' | 'mlops';
          is_active?: boolean;
          sort_order?: number;
        };
        Update: Partial<Database['public']['Tables']['academy_courses']['Insert']>;
      };
    };
    Functions: {
      academy_increment_school_seats: {
        Args: { p_school_id: string };
        Returns: void;
      };
    };
  };
}
