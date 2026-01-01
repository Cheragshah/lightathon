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
      admin_activity_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          target_persona_id: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_persona_id?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_persona_id?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      admin_notifications: {
        Row: {
          admin_id: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          notification_type: string
          persona_run_id: string | null
          title: string
        }
        Insert: {
          admin_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          notification_type: string
          persona_run_id?: string | null
          title: string
        }
        Update: {
          admin_id?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          notification_type?: string
          persona_run_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_notifications_persona_run_id_fkey"
            columns: ["persona_run_id"]
            isOneToOne: false
            referencedRelation: "persona_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_provider_keys: {
        Row: {
          api_key_encrypted: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          last_tested_at: string | null
          provider_id: string
          test_status: string | null
          updated_at: string
        }
        Insert: {
          api_key_encrypted: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          last_tested_at?: string | null
          provider_id: string
          test_status?: string | null
          updated_at?: string
        }
        Update: {
          api_key_encrypted?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          last_tested_at?: string | null
          provider_id?: string
          test_status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_provider_keys_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: true
            referencedRelation: "ai_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_providers: {
        Row: {
          available_models: Json
          base_url: string
          created_at: string
          default_model: string | null
          id: string
          is_active: boolean
          is_default: boolean | null
          name: string
          provider_code: string
          updated_at: string
        }
        Insert: {
          available_models?: Json
          base_url: string
          created_at?: string
          default_model?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean | null
          name: string
          provider_code: string
          updated_at?: string
        }
        Update: {
          available_models?: Json
          base_url?: string
          created_at?: string
          default_model?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean | null
          name?: string
          provider_code?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_usage_logs: {
        Row: {
          codex_id: string | null
          completion_tokens: number
          created_at: string
          error_message: string | null
          estimated_cost: number
          execution_mode:
            | Database["public"]["Enums"]["ai_execution_mode"]
            | null
          function_name: string
          id: string
          model: string
          model_name: string | null
          parent_run_id: string | null
          persona_run_id: string | null
          prompt_tokens: number
          provider_code: string | null
          status: string
          total_tokens: number
          user_id: string | null
        }
        Insert: {
          codex_id?: string | null
          completion_tokens?: number
          created_at?: string
          error_message?: string | null
          estimated_cost?: number
          execution_mode?:
            | Database["public"]["Enums"]["ai_execution_mode"]
            | null
          function_name: string
          id?: string
          model: string
          model_name?: string | null
          parent_run_id?: string | null
          persona_run_id?: string | null
          prompt_tokens?: number
          provider_code?: string | null
          status?: string
          total_tokens?: number
          user_id?: string | null
        }
        Update: {
          codex_id?: string | null
          completion_tokens?: number
          created_at?: string
          error_message?: string | null
          estimated_cost?: number
          execution_mode?:
            | Database["public"]["Enums"]["ai_execution_mode"]
            | null
          function_name?: string
          id?: string
          model?: string
          model_name?: string | null
          parent_run_id?: string | null
          persona_run_id?: string | null
          prompt_tokens?: number
          provider_code?: string | null
          status?: string
          total_tokens?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_logs_codex_id_fkey"
            columns: ["codex_id"]
            isOneToOne: false
            referencedRelation: "codexes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_logs_parent_run_id_fkey"
            columns: ["parent_run_id"]
            isOneToOne: false
            referencedRelation: "ai_usage_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_logs_persona_run_id_fkey"
            columns: ["persona_run_id"]
            isOneToOne: false
            referencedRelation: "persona_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          codex_id: string | null
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          persona_run_id: string | null
          user_id: string | null
        }
        Insert: {
          codex_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          persona_run_id?: string | null
          user_id?: string | null
        }
        Update: {
          codex_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          persona_run_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_codex_id_fkey"
            columns: ["codex_id"]
            isOneToOne: false
            referencedRelation: "codexes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_persona_run_id_fkey"
            columns: ["persona_run_id"]
            isOneToOne: false
            referencedRelation: "persona_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          id: string
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      batches: {
        Row: {
          batch_name: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          updated_at: string | null
        }
        Insert: {
          batch_name: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Update: {
          batch_name?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      codex_ai_steps: {
        Row: {
          codex_prompt_id: string
          created_at: string | null
          custom_prompt: string | null
          id: string
          model_name: string
          provider_id: string
          step_order: number
          step_type: string
        }
        Insert: {
          codex_prompt_id: string
          created_at?: string | null
          custom_prompt?: string | null
          id?: string
          model_name: string
          provider_id: string
          step_order: number
          step_type?: string
        }
        Update: {
          codex_prompt_id?: string
          created_at?: string | null
          custom_prompt?: string | null
          id?: string
          model_name?: string
          provider_id?: string
          step_order?: number
          step_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "codex_ai_steps_codex_prompt_id_fkey"
            columns: ["codex_prompt_id"]
            isOneToOne: false
            referencedRelation: "codex_prompts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "codex_ai_steps_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "ai_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      codex_generation_queue: {
        Row: {
          ai_model: string | null
          ai_provider_id: string | null
          batch_id: string | null
          codex_prompt_id: string
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          persona_run_id: string | null
          started_at: string | null
          status: string | null
          triggered_by: string
          user_id: string
        }
        Insert: {
          ai_model?: string | null
          ai_provider_id?: string | null
          batch_id?: string | null
          codex_prompt_id: string
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          persona_run_id?: string | null
          started_at?: string | null
          status?: string | null
          triggered_by: string
          user_id: string
        }
        Update: {
          ai_model?: string | null
          ai_provider_id?: string | null
          batch_id?: string | null
          codex_prompt_id?: string
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          persona_run_id?: string | null
          started_at?: string | null
          status?: string | null
          triggered_by?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "codex_generation_queue_ai_provider_id_fkey"
            columns: ["ai_provider_id"]
            isOneToOne: false
            referencedRelation: "ai_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "codex_generation_queue_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "codex_generation_queue_codex_prompt_id_fkey"
            columns: ["codex_prompt_id"]
            isOneToOne: false
            referencedRelation: "codex_prompts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "codex_generation_queue_persona_run_id_fkey"
            columns: ["persona_run_id"]
            isOneToOne: false
            referencedRelation: "persona_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      codex_prompt_dependencies: {
        Row: {
          codex_prompt_id: string
          created_at: string | null
          depends_on_codex_id: string
          display_order: number | null
          id: string
        }
        Insert: {
          codex_prompt_id: string
          created_at?: string | null
          depends_on_codex_id: string
          display_order?: number | null
          id?: string
        }
        Update: {
          codex_prompt_id?: string
          created_at?: string | null
          depends_on_codex_id?: string
          display_order?: number | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "codex_prompt_dependencies_codex_prompt_id_fkey"
            columns: ["codex_prompt_id"]
            isOneToOne: false
            referencedRelation: "codex_prompts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "codex_prompt_dependencies_depends_on_codex_id_fkey"
            columns: ["depends_on_codex_id"]
            isOneToOne: false
            referencedRelation: "codex_prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      codex_prompts: {
        Row: {
          ai_execution_mode:
            | Database["public"]["Enums"]["ai_execution_mode"]
            | null
          codex_name: string
          created_at: string | null
          created_by: string | null
          depends_on_codex_id: string | null
          depends_on_transcript: boolean | null
          display_order: number
          id: string
          is_active: boolean | null
          merge_model: string | null
          merge_prompt: string | null
          merge_provider_id: string | null
          primary_model: string | null
          primary_provider_id: string | null
          system_prompt: string
          updated_at: string | null
          use_pricing_brackets: boolean | null
          word_count_max: number | null
          word_count_min: number | null
        }
        Insert: {
          ai_execution_mode?:
            | Database["public"]["Enums"]["ai_execution_mode"]
            | null
          codex_name: string
          created_at?: string | null
          created_by?: string | null
          depends_on_codex_id?: string | null
          depends_on_transcript?: boolean | null
          display_order?: number
          id?: string
          is_active?: boolean | null
          merge_model?: string | null
          merge_prompt?: string | null
          merge_provider_id?: string | null
          primary_model?: string | null
          primary_provider_id?: string | null
          system_prompt: string
          updated_at?: string | null
          use_pricing_brackets?: boolean | null
          word_count_max?: number | null
          word_count_min?: number | null
        }
        Update: {
          ai_execution_mode?:
            | Database["public"]["Enums"]["ai_execution_mode"]
            | null
          codex_name?: string
          created_at?: string | null
          created_by?: string | null
          depends_on_codex_id?: string | null
          depends_on_transcript?: boolean | null
          display_order?: number
          id?: string
          is_active?: boolean | null
          merge_model?: string | null
          merge_prompt?: string | null
          merge_provider_id?: string | null
          primary_model?: string | null
          primary_provider_id?: string | null
          system_prompt?: string
          updated_at?: string | null
          use_pricing_brackets?: boolean | null
          word_count_max?: number | null
          word_count_min?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "codex_prompts_depends_on_codex_id_fkey"
            columns: ["depends_on_codex_id"]
            isOneToOne: false
            referencedRelation: "codex_prompts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "codex_prompts_merge_provider_id_fkey"
            columns: ["merge_provider_id"]
            isOneToOne: false
            referencedRelation: "ai_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "codex_prompts_primary_provider_id_fkey"
            columns: ["primary_provider_id"]
            isOneToOne: false
            referencedRelation: "ai_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      codex_prompts_history: {
        Row: {
          ai_execution_mode:
            | Database["public"]["Enums"]["ai_execution_mode"]
            | null
          change_description: string | null
          changed_by: string | null
          codex_name: string
          codex_prompt_id: string
          created_at: string
          depends_on_codex_id: string | null
          depends_on_transcript: boolean | null
          display_order: number
          id: string
          is_active: boolean | null
          merge_model: string | null
          merge_prompt: string | null
          merge_provider_id: string | null
          primary_model: string | null
          primary_provider_id: string | null
          system_prompt: string
          version_number: number
          word_count_max: number | null
          word_count_min: number | null
        }
        Insert: {
          ai_execution_mode?:
            | Database["public"]["Enums"]["ai_execution_mode"]
            | null
          change_description?: string | null
          changed_by?: string | null
          codex_name: string
          codex_prompt_id: string
          created_at?: string
          depends_on_codex_id?: string | null
          depends_on_transcript?: boolean | null
          display_order?: number
          id?: string
          is_active?: boolean | null
          merge_model?: string | null
          merge_prompt?: string | null
          merge_provider_id?: string | null
          primary_model?: string | null
          primary_provider_id?: string | null
          system_prompt: string
          version_number: number
          word_count_max?: number | null
          word_count_min?: number | null
        }
        Update: {
          ai_execution_mode?:
            | Database["public"]["Enums"]["ai_execution_mode"]
            | null
          change_description?: string | null
          changed_by?: string | null
          codex_name?: string
          codex_prompt_id?: string
          created_at?: string
          depends_on_codex_id?: string | null
          depends_on_transcript?: boolean | null
          display_order?: number
          id?: string
          is_active?: boolean | null
          merge_model?: string | null
          merge_prompt?: string | null
          merge_provider_id?: string | null
          primary_model?: string | null
          primary_provider_id?: string | null
          system_prompt?: string
          version_number?: number
          word_count_max?: number | null
          word_count_min?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "codex_prompts_history_codex_prompt_id_fkey"
            columns: ["codex_prompt_id"]
            isOneToOne: false
            referencedRelation: "codex_prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      codex_question_mappings: {
        Row: {
          codex_prompt_id: string
          created_at: string | null
          id: string
          question_id: string
        }
        Insert: {
          codex_prompt_id: string
          created_at?: string | null
          id?: string
          question_id: string
        }
        Update: {
          codex_prompt_id?: string
          created_at?: string | null
          id?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "codex_question_mappings_codex_prompt_id_fkey"
            columns: ["codex_prompt_id"]
            isOneToOne: false
            referencedRelation: "codex_prompts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "codex_question_mappings_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questionnaire_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      codex_section_ai_steps: {
        Row: {
          created_at: string
          custom_prompt: string | null
          id: string
          model_name: string
          provider_id: string
          section_prompt_id: string
          step_order: number
          step_type: string
        }
        Insert: {
          created_at?: string
          custom_prompt?: string | null
          id?: string
          model_name: string
          provider_id: string
          section_prompt_id: string
          step_order: number
          step_type?: string
        }
        Update: {
          created_at?: string
          custom_prompt?: string | null
          id?: string
          model_name?: string
          provider_id?: string
          section_prompt_id?: string
          step_order?: number
          step_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "codex_section_ai_steps_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "ai_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "codex_section_ai_steps_section_prompt_id_fkey"
            columns: ["section_prompt_id"]
            isOneToOne: false
            referencedRelation: "codex_section_prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      codex_section_prompts: {
        Row: {
          ai_execution_mode:
            | Database["public"]["Enums"]["ai_execution_mode"]
            | null
          codex_prompt_id: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          merge_model: string | null
          merge_prompt: string | null
          merge_provider_id: string | null
          primary_model: string | null
          primary_provider_id: string | null
          section_index: number
          section_name: string
          section_prompt: string
          updated_at: string | null
          word_count_target: number | null
        }
        Insert: {
          ai_execution_mode?:
            | Database["public"]["Enums"]["ai_execution_mode"]
            | null
          codex_prompt_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          merge_model?: string | null
          merge_prompt?: string | null
          merge_provider_id?: string | null
          primary_model?: string | null
          primary_provider_id?: string | null
          section_index: number
          section_name: string
          section_prompt: string
          updated_at?: string | null
          word_count_target?: number | null
        }
        Update: {
          ai_execution_mode?:
            | Database["public"]["Enums"]["ai_execution_mode"]
            | null
          codex_prompt_id?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          merge_model?: string | null
          merge_prompt?: string | null
          merge_provider_id?: string | null
          primary_model?: string | null
          primary_provider_id?: string | null
          section_index?: number
          section_name?: string
          section_prompt?: string
          updated_at?: string | null
          word_count_target?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "codex_section_prompts_codex_prompt_id_fkey"
            columns: ["codex_prompt_id"]
            isOneToOne: false
            referencedRelation: "codex_prompts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "codex_section_prompts_merge_provider_id_fkey"
            columns: ["merge_provider_id"]
            isOneToOne: false
            referencedRelation: "ai_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "codex_section_prompts_primary_provider_id_fkey"
            columns: ["primary_provider_id"]
            isOneToOne: false
            referencedRelation: "ai_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      codex_section_prompts_history: {
        Row: {
          change_description: string | null
          changed_by: string | null
          created_at: string
          id: string
          is_active: boolean | null
          section_index: number
          section_name: string
          section_prompt: string
          section_prompt_id: string
          version_number: number
          word_count_target: number | null
        }
        Insert: {
          change_description?: string | null
          changed_by?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          section_index: number
          section_name: string
          section_prompt: string
          section_prompt_id: string
          version_number: number
          word_count_target?: number | null
        }
        Update: {
          change_description?: string | null
          changed_by?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          section_index?: number
          section_name?: string
          section_prompt?: string
          section_prompt_id?: string
          version_number?: number
          word_count_target?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "codex_section_prompts_history_section_prompt_id_fkey"
            columns: ["section_prompt_id"]
            isOneToOne: false
            referencedRelation: "codex_section_prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      codex_sections: {
        Row: {
          codex_id: string
          content: string | null
          content_summary: string | null
          created_at: string
          error_message: string | null
          id: string
          last_regenerated_at: string | null
          regeneration_count: number
          retries: number
          section_index: number
          section_name: string
          status: string
          updated_at: string
        }
        Insert: {
          codex_id: string
          content?: string | null
          content_summary?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          last_regenerated_at?: string | null
          regeneration_count?: number
          retries?: number
          section_index: number
          section_name: string
          status?: string
          updated_at?: string
        }
        Update: {
          codex_id?: string
          content?: string | null
          content_summary?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          last_regenerated_at?: string | null
          regeneration_count?: number
          retries?: number
          section_index?: number
          section_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "codex_sections_codex_id_fkey"
            columns: ["codex_id"]
            isOneToOne: false
            referencedRelation: "codexes"
            referencedColumns: ["id"]
          },
        ]
      }
      codexes: {
        Row: {
          codex_name: string
          codex_order: number
          codex_prompt_id: string | null
          completed_sections: number
          created_at: string
          id: string
          persona_run_id: string
          status: string
          total_sections: number
          updated_at: string
        }
        Insert: {
          codex_name: string
          codex_order: number
          codex_prompt_id?: string | null
          completed_sections?: number
          created_at?: string
          id?: string
          persona_run_id: string
          status?: string
          total_sections?: number
          updated_at?: string
        }
        Update: {
          codex_name?: string
          codex_order?: number
          codex_prompt_id?: string | null
          completed_sections?: number
          created_at?: string
          id?: string
          persona_run_id?: string
          status?: string
          total_sections?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "codexes_codex_prompt_id_fkey"
            columns: ["codex_prompt_id"]
            isOneToOne: false
            referencedRelation: "codex_prompts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "codexes_persona_run_id_fkey"
            columns: ["persona_run_id"]
            isOneToOne: false
            referencedRelation: "persona_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      early_signups: {
        Row: {
          created_at: string
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
        }
        Relationships: []
      }
      lightathon_daily_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          day_number: number
          enrollment_id: string
          id: string
          mission_content: string | null
          mission_title: string | null
          status: string
          unlocked_at: string | null
          updated_at: string
          user_reflection: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          day_number: number
          enrollment_id: string
          id?: string
          mission_content?: string | null
          mission_title?: string | null
          status?: string
          unlocked_at?: string | null
          updated_at?: string
          user_reflection?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          day_number?: number
          enrollment_id?: string
          id?: string
          mission_content?: string | null
          mission_title?: string | null
          status?: string
          unlocked_at?: string | null
          updated_at?: string
          user_reflection?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lightathon_daily_progress_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "lightathon_enrollments"
            referencedColumns: ["id"]
          },
        ]
      }
      lightathon_enrollments: {
        Row: {
          created_at: string
          enabled_by: string
          id: string
          is_active: boolean
          persona_run_id: string
          started_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled_by: string
          id?: string
          is_active?: boolean
          persona_run_id: string
          started_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled_by?: string
          id?: string
          is_active?: boolean
          persona_run_id?: string
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pdf_exports: {
        Row: {
          codex_id: string | null
          created_at: string
          export_type: string
          file_path: string | null
          id: string
          persona_run_id: string
        }
        Insert: {
          codex_id?: string | null
          created_at?: string
          export_type: string
          file_path?: string | null
          id?: string
          persona_run_id: string
        }
        Update: {
          codex_id?: string | null
          created_at?: string
          export_type?: string
          file_path?: string | null
          id?: string
          persona_run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pdf_exports_codex_id_fkey"
            columns: ["codex_id"]
            isOneToOne: false
            referencedRelation: "codexes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pdf_exports_persona_run_id_fkey"
            columns: ["persona_run_id"]
            isOneToOne: false
            referencedRelation: "persona_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      pdf_templates: {
        Row: {
          body_color_b: number
          body_color_g: number
          body_color_r: number
          body_font: string
          body_font_size: number
          company_name: string | null
          cover_bg_color_b: number | null
          cover_bg_color_g: number | null
          cover_bg_color_r: number | null
          cover_bg_image_url: string | null
          cover_subtitle: string | null
          created_at: string
          created_by: string | null
          heading_color_b: number
          heading_color_g: number
          heading_color_r: number
          heading_font_size: number
          id: string
          is_active: boolean
          line_spacing: number
          logo_url: string | null
          page_margin: number
          section_spacing: number
          show_cover_page: boolean | null
          show_footer: boolean | null
          show_header: boolean | null
          show_page_numbers: boolean | null
          show_toc: boolean | null
          template_name: string
          title_color_b: number
          title_color_g: number
          title_color_r: number
          title_font: string
          title_font_size: number
          updated_at: string
        }
        Insert: {
          body_color_b?: number
          body_color_g?: number
          body_color_r?: number
          body_font?: string
          body_font_size?: number
          company_name?: string | null
          cover_bg_color_b?: number | null
          cover_bg_color_g?: number | null
          cover_bg_color_r?: number | null
          cover_bg_image_url?: string | null
          cover_subtitle?: string | null
          created_at?: string
          created_by?: string | null
          heading_color_b?: number
          heading_color_g?: number
          heading_color_r?: number
          heading_font_size?: number
          id?: string
          is_active?: boolean
          line_spacing?: number
          logo_url?: string | null
          page_margin?: number
          section_spacing?: number
          show_cover_page?: boolean | null
          show_footer?: boolean | null
          show_header?: boolean | null
          show_page_numbers?: boolean | null
          show_toc?: boolean | null
          template_name?: string
          title_color_b?: number
          title_color_g?: number
          title_color_r?: number
          title_font?: string
          title_font_size?: number
          updated_at?: string
        }
        Update: {
          body_color_b?: number
          body_color_g?: number
          body_color_r?: number
          body_font?: string
          body_font_size?: number
          company_name?: string | null
          cover_bg_color_b?: number | null
          cover_bg_color_g?: number | null
          cover_bg_color_r?: number | null
          cover_bg_image_url?: string | null
          cover_subtitle?: string | null
          created_at?: string
          created_by?: string | null
          heading_color_b?: number
          heading_color_g?: number
          heading_color_r?: number
          heading_font_size?: number
          id?: string
          is_active?: boolean
          line_spacing?: number
          logo_url?: string | null
          page_margin?: number
          section_spacing?: number
          show_cover_page?: boolean | null
          show_footer?: boolean | null
          show_header?: boolean | null
          show_page_numbers?: boolean | null
          show_toc?: boolean | null
          template_name?: string
          title_color_b?: number
          title_color_g?: number
          title_color_r?: number
          title_font?: string
          title_font_size?: number
          updated_at?: string
        }
        Relationships: []
      }
      persona_runs: {
        Row: {
          answers_json: Json
          completed_at: string | null
          created_at: string
          id: string
          is_cancelled: boolean | null
          original_transcript: string | null
          source_type: string | null
          started_at: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answers_json: Json
          completed_at?: string | null
          created_at?: string
          id?: string
          is_cancelled?: boolean | null
          original_transcript?: string | null
          source_type?: string | null
          started_at?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answers_json?: Json
          completed_at?: string | null
          created_at?: string
          id?: string
          is_cancelled?: boolean | null
          original_transcript?: string | null
          source_type?: string | null
          started_at?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          batch: string | null
          city: string | null
          created_at: string | null
          email: string | null
          first_name: string | null
          full_name: string | null
          id: string
          last_name: string | null
          last_profile_prompt_at: string | null
          location: string | null
          phone_whatsapp: string | null
          photograph_url: string | null
          pin_code: string | null
          profile_completed: boolean | null
          state: string | null
          tagmango_host: string | null
          tagmango_id: string | null
          title: string | null
          updated_at: string | null
          website_social: string | null
        }
        Insert: {
          address?: string | null
          batch?: string | null
          city?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id: string
          last_name?: string | null
          last_profile_prompt_at?: string | null
          location?: string | null
          phone_whatsapp?: string | null
          photograph_url?: string | null
          pin_code?: string | null
          profile_completed?: boolean | null
          state?: string | null
          tagmango_host?: string | null
          tagmango_id?: string | null
          title?: string | null
          updated_at?: string | null
          website_social?: string | null
        }
        Update: {
          address?: string | null
          batch?: string | null
          city?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          last_profile_prompt_at?: string | null
          location?: string | null
          phone_whatsapp?: string | null
          photograph_url?: string | null
          pin_code?: string | null
          profile_completed?: boolean | null
          state?: string | null
          tagmango_host?: string | null
          tagmango_id?: string | null
          title?: string | null
          updated_at?: string | null
          website_social?: string | null
        }
        Relationships: []
      }
      questionnaire_assignments: {
        Row: {
          batch_id: string
          category_id: string
          enabled_at: string | null
          enabled_by: string | null
          id: string
          is_enabled: boolean | null
        }
        Insert: {
          batch_id: string
          category_id: string
          enabled_at?: string | null
          enabled_by?: string | null
          id?: string
          is_enabled?: boolean | null
        }
        Update: {
          batch_id?: string
          category_id?: string
          enabled_at?: string | null
          enabled_by?: string | null
          id?: string
          is_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "questionnaire_assignments_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questionnaire_assignments_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "questionnaire_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      questionnaire_categories: {
        Row: {
          category_name: string
          created_at: string | null
          description: string | null
          display_order: number
          id: string
          is_active: boolean | null
          updated_at: string | null
        }
        Insert: {
          category_name: string
          created_at?: string | null
          description?: string | null
          display_order: number
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Update: {
          category_name?: string
          created_at?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      questionnaire_questions: {
        Row: {
          category_id: string
          created_at: string | null
          created_by: string | null
          display_order: number
          helper_text: string | null
          id: string
          is_active: boolean | null
          is_required: boolean | null
          question_text: string
          updated_at: string | null
        }
        Insert: {
          category_id: string
          created_at?: string | null
          created_by?: string | null
          display_order: number
          helper_text?: string | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          question_text: string
          updated_at?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string | null
          created_by?: string | null
          display_order?: number
          helper_text?: string | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          question_text?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questionnaire_questions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "questionnaire_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      share_link_attempts: {
        Row: {
          attempt_type: string
          created_at: string
          id: string
          ip_address: string
          share_token: string
          success: boolean
        }
        Insert: {
          attempt_type: string
          created_at?: string
          id?: string
          ip_address: string
          share_token: string
          success?: boolean
        }
        Update: {
          attempt_type?: string
          created_at?: string
          id?: string
          ip_address?: string
          share_token?: string
          success?: boolean
        }
        Relationships: []
      }
      shared_links: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_active: boolean
          password_hash: string | null
          persona_run_id: string
          share_token: string
          view_count: number
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          password_hash?: string | null
          persona_run_id: string
          share_token: string
          view_count?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          password_hash?: string | null
          persona_run_id?: string
          share_token?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "shared_links_persona_run_id_fkey"
            columns: ["persona_run_id"]
            isOneToOne: false
            referencedRelation: "persona_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      user_blocks: {
        Row: {
          blocked_at: string
          blocked_by: string
          id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          blocked_at?: string
          blocked_by: string
          id?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          blocked_at?: string
          blocked_by?: string
          id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_category_assignments: {
        Row: {
          category_id: string
          created_at: string | null
          enabled_at: string | null
          enabled_by: string | null
          id: string
          is_enabled: boolean | null
          user_id: string
        }
        Insert: {
          category_id: string
          created_at?: string | null
          enabled_at?: string | null
          enabled_by?: string | null
          id?: string
          is_enabled?: boolean | null
          user_id: string
        }
        Update: {
          category_id?: string
          created_at?: string | null
          enabled_at?: string | null
          enabled_by?: string | null
          id?: string
          is_enabled?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_category_assignments_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "questionnaire_categories"
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
      user_unlimited_runs: {
        Row: {
          granted_at: string
          granted_by: string
          id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by: string
          id?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string
          id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_share_link_attempts: { Args: never; Returns: undefined }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_user_blocked: { Args: { user_id: string }; Returns: boolean }
    }
    Enums: {
      ai_execution_mode: "single" | "parallel_merge" | "sequential_chain"
      app_role: "admin" | "moderator" | "user"
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
      ai_execution_mode: ["single", "parallel_merge", "sequential_chain"],
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
