/**
 * Generated from the live database schema — do not edit by hand.
 *
 * Regenerate after any migration, either with
 *   npx supabase gen types typescript --project-id wdbsnakkixehksixeamu
 * or by asking Claude to run generate_typescript_types over the Supabase MCP
 * server.
 *
 * This is what makes the snake_case database boundary type-checked. Before it
 * existed the mappers took `: any` rows, so a wrong column name or a renamed
 * field was a runtime surprise instead of a compile error — which is where
 * several of this project's bugs actually lived.
 *
 * Only the Database type and the Tables/TablesInsert/TablesUpdate helpers are
 * used by the app; the rest is generator boilerplate kept verbatim so a
 * regeneration produces a clean diff.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      calendar_events: {
        Row: {
          color: string
          created_at: string | null
          description: string | null
          event_date: string
          event_type: string
          group_id: string | null
          has_reminder: boolean | null
          id: string
          reminder_minutes: number | null
          title: string
          todo_id: string | null
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string | null
          description?: string | null
          event_date: string
          event_type: string
          group_id?: string | null
          has_reminder?: boolean | null
          id?: string
          reminder_minutes?: number | null
          title: string
          todo_id?: string | null
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string | null
          description?: string | null
          event_date?: string
          event_type?: string
          group_id?: string | null
          has_reminder?: boolean | null
          id?: string
          reminder_minutes?: number | null
          title?: string
          todo_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          attachments: string[] | null
          created_at: string | null
          group_id: string
          id: string
          message: string
          type: string
          user_id: string
        }
        Insert: {
          attachments?: string[] | null
          created_at?: string | null
          group_id: string
          id?: string
          message: string
          type?: string
          user_id: string
        }
        Update: {
          attachments?: string[] | null
          created_at?: string | null
          group_id?: string
          id?: string
          message?: string
          type?: string
          user_id?: string
        }
        // Declared for real, not stubbed: this is the foreign key that lets
        // PostgREST resolve `user_profiles!inner(...)` from chat_messages, and
        // its absence is what broke group chat entirely before the rebuild.
        Relationships: [
          {
            foreignKeyName: "chat_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "study_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          // The same key reaches public_profiles, which is the one the client
          // must embed: user_profiles is own-row-only under RLS, so an inner
          // join against it drops every message written by anyone else.
          {
            foreignKeyName: "chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      friends: {
        Row: {
          created_at: string | null
          friend_user_id: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          friend_user_id: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          friend_user_id?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      meeting_participants: {
        Row: {
          created_at: string | null
          id: string
          meeting_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          meeting_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          meeting_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_participants_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          }
        ]
      }
      meetings: {
        Row: {
          created_at: string | null
          description: string | null
          duration: number
          group_id: string | null
          host_id: string
          id: string
          location: string | null
          meeting_link: string | null
          meeting_type: string
          scheduled_time: string
          status: string
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration?: number
          group_id?: string | null
          host_id: string
          id?: string
          location?: string | null
          meeting_link?: string | null
          meeting_type?: string
          scheduled_time: string
          status?: string
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration?: number
          group_id?: string | null
          host_id?: string
          id?: string
          location?: string | null
          meeting_link?: string | null
          meeting_type?: string
          scheduled_time?: string
          status?: string
          title?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_data: Json | null
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_data?: Json | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_data?: Json | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      reminders: {
        Row: {
          created_at: string | null
          description: string | null
          event_id: string | null
          id: string
          is_completed: boolean | null
          reminder_time: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          event_id?: string | null
          id?: string
          is_completed?: boolean | null
          reminder_time: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          event_id?: string | null
          id?: string
          is_completed?: boolean | null
          reminder_time?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      study_group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string | null
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string | null
          role?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      study_groups: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          created_by: string
          description: string
          id: string
          is_private: boolean | null
          last_activity: string | null
          name: string
          subject: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          created_by: string
          description: string
          id?: string
          is_private?: boolean | null
          last_activity?: string | null
          name: string
          subject?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          created_by?: string
          description?: string
          id?: string
          is_private?: boolean | null
          last_activity?: string | null
          name?: string
          subject?: string | null
        }
        Relationships: []
      }
      study_sessions: {
        Row: {
          created_at: string | null
          duration: number
          end_time: string | null
          id: string
          notes: string | null
          start_time: string
          subject: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          duration?: number
          end_time?: string | null
          id?: string
          notes?: string | null
          start_time: string
          subject: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          duration?: number
          end_time?: string | null
          id?: string
          notes?: string | null
          start_time?: string
          subject?: string
          user_id?: string
        }
        Relationships: []
      }
      todos: {
        Row: {
          category: string | null
          completed_at: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          is_completed: boolean | null
          priority: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean | null
          priority?: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          completed_at?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean | null
          priority?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_presence: {
        Row: {
          is_online: boolean | null
          last_seen: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          is_online?: boolean | null
          last_seen?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          is_online?: boolean | null
          last_seen?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          date_of_birth: string | null
          email: string
          grade: string | null
          graduation_date: string | null
          interests: string[] | null
          is_public: boolean | null
          name: string
          school: string | null
          study_field: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email: string
          grade?: string | null
          graduation_date?: string | null
          interests?: string[] | null
          is_public?: boolean | null
          name: string
          school?: string | null
          study_field?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string
          grade?: string | null
          graduation_date?: string | null
          interests?: string[] | null
          is_public?: boolean | null
          name?: string
          school?: string | null
          study_field?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_stats: {
        Row: {
          last_session_date: string | null
          sessions: number
          streak_days: number
          tasks_completed: number
          total_focus_minutes: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          last_session_date?: string | null
          sessions?: number
          streak_days?: number
          tasks_completed?: number
          total_focus_minutes?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          last_session_date?: string | null
          sessions?: number
          streak_days?: number
          tasks_completed?: number
          total_focus_minutes?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_leaderboard: {
        Row: {
          avatar_url: string | null
          name: string | null
          sessions: number | null
          streak_days: number | null
          total_focus_minutes: number | null
          user_id: string | null
        }
        Relationships: []
      }
      public_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          interests: string[] | null
          name: string | null
          school: string | null
          study_field: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          interests?: string[] | null
          name?: string | null
          school?: string | null
          study_field?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          interests?: string[] | null
          name?: string | null
          school?: string | null
          study_field?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_notify: { Args: { target_user_id: string }; Returns: boolean }
      can_see_meeting: { Args: { mid: string }; Returns: boolean }
      /*
       * Declared as arrays so .single() narrows them.
       *
       * These functions each RETURN one row, and the generator emits that as a
       * bare row plus a SetofOptions field. postgrest-js 1.21 does not
       * understand SetofOptions and requires an array for .single() to narrow,
       * so a bare row resolves to never. Call sites use .single(), which is
       * verified working against the live database.
       */
      create_meeting: {
        Args: {
          p_description?: string
          p_duration?: number
          p_group_id?: string
          p_location?: string
          p_meeting_link?: string
          p_meeting_type?: string
          p_participant_ids?: string[]
          p_scheduled_time: string
          p_title: string
        }
        Returns: Database["public"]["Tables"]["meetings"]["Row"][]
      }
      create_study_group: {
        Args: {
          p_description?: string
          p_is_private?: boolean
          p_member_ids?: string[]
          p_name: string
          p_subject?: string
        }
        Returns: Database["public"]["Tables"]["study_groups"]["Row"][]
      }
      find_user_by_email: {
        Args: { p_email: string }
        Returns: { name: string; user_id: string }[]
      }
      increment_user_stats: {
        Args: {
          p_session_id?: string | null
          p_todo_id?: string | null
        }
        Returns: Database["public"]["Tables"]["user_stats"]["Row"][]
      }
      latest_group_messages: {
        Args: { p_group_ids: string[] }
        Returns: {
          id: string
          group_id: string
          user_id: string
          message: string
          type: string
          attachments: string[] | null
          created_at: string
          user_name: string | null
          user_avatar: string | null
        }[]
      }
      is_group_admin: { Args: { gid: string }; Returns: boolean }
      is_group_member: { Args: { gid: string }; Returns: boolean }
      is_group_public: { Args: { gid: string }; Returns: boolean }
      is_meeting_host: { Args: { mid: string }; Returns: boolean }
      is_meeting_participant: { Args: { mid: string }; Returns: boolean }
    }
    Enums: Record<never, never>
    CompositeTypes: Record<never, never>
  }
}

type DefaultSchema = Database["public"]

/** Row type for a table or view: `Tables<'todos'>`. */
export type Tables<
  Name extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
> = (DefaultSchema["Tables"] & DefaultSchema["Views"])[Name] extends { Row: infer R }
  ? R
  : never

/** Insert payload for a table: `TablesInsert<'todos'>`. */
export type TablesInsert<Name extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][Name] extends { Insert: infer I } ? I : never

/** Update payload for a table: `TablesUpdate<'todos'>`. */
export type TablesUpdate<Name extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][Name] extends { Update: infer U } ? U : never
